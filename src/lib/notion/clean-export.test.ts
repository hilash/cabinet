import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { cleanNotionExport, stripNotionId, rewriteLinks } from "./clean-export";

const ID1 = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
const ID2 = "00112233445566778899aabbccddeeff";
const ID3 = "ffeeddccbbaa99887766554433221100";
const ID4 = "aabbccddeeff00112233445566778899";

test("stripNotionId removes the trailing hash, keeps name + extension", () => {
  assert.equal(stripNotionId(`Getting Started ${ID1}.md`), "Getting Started.md");
  assert.equal(stripNotionId(`Tasks ${ID3}`), "Tasks");
  assert.equal(stripNotionId(`v1.0 Plan ${ID1}.md`), "v1.0 Plan.md");
  assert.equal(stripNotionId("photo.png"), "photo.png"); // no id → untouched
});

test("rewriteLinks: page links → wiki-links, assets → same-dir relative", () => {
  const md =
    `[Sub](Page%20${ID1}/Sub%20${ID2}.md) ` +
    `![pic](Page%20${ID1}/photo.png) ` +
    `[ext](https://example.com)`;
  const out = rewriteLinks(md, "Page");
  assert.match(out, /\[\[Sub\]\]/);
  assert.match(out, /!\[pic\]\(photo\.png\)/);
  assert.match(out, /\(https:\/\/example\.com\)/); // external untouched
});

test("cleanNotionExport transforms a realistic export tree", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "notion-"));
  const pageDir = path.join(root, `Getting Started ${ID1}`);
  await fs.mkdir(pageDir);
  await fs.writeFile(
    path.join(root, `Getting Started ${ID1}.md`),
    `# Getting Started\n` +
      `[Subpage](Getting%20Started%20${ID1}/Subpage%20${ID2}.md)\n` +
      `![pic](Getting%20Started%20${ID1}/photo.png)\n`
  );
  await fs.writeFile(path.join(pageDir, `Subpage ${ID2}.md`), "# Subpage\n");
  await fs.writeFile(path.join(pageDir, "photo.png"), "binary");
  // A database: CSV + sibling folder of row pages.
  await fs.writeFile(path.join(root, `Tasks ${ID3}.csv`), "Name\nRow One\n");
  const dbDir = path.join(root, `Tasks ${ID3}`);
  await fs.mkdir(dbDir);
  await fs.writeFile(path.join(dbDir, `Row One ${ID4}.md`), "# Row One\n");

  await cleanNotionExport(root);

  const exists = async (p: string) =>
    fs.access(p).then(() => true, () => false);
  assert.ok(await exists(path.join(root, "Getting Started", "index.md")), "merged index.md");
  assert.ok(await exists(path.join(root, "Getting Started", "Subpage.md")), "subpage");
  assert.ok(await exists(path.join(root, "Getting Started", "photo.png")), "asset moved");
  assert.ok(await exists(path.join(root, "Tasks.csv")), "db csv");
  assert.ok(await exists(path.join(root, "Tasks", "Row One.md")), "db row");

  const index = await fs.readFile(path.join(root, "Getting Started", "index.md"), "utf8");
  assert.match(index, /\[\[Subpage\]\]/, "page link → wiki-link");
  assert.match(index, /!\[pic\]\(photo\.png\)/, "asset → same-dir ref");
  assert.doesNotMatch(index, new RegExp(ID1), "no leftover hash");

  await fs.rm(root, { recursive: true, force: true });
});
