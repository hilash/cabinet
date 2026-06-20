import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";

/**
 * Clean a Notion "Markdown & CSV" export in place.
 *
 * Notion exports every page/file/folder with a 32-hex id appended to the human
 * name (`Getting Started a1b2…f0.md`), puts a page's children and assets in a
 * sibling `<page> <id>/` folder, and writes URL-encoded, hash-bearing relative
 * links between pages. This transform makes the export feel native to Cabinet:
 *
 *  1. strip the ` <32-hex>` suffix from every file/dir name (collision-safe);
 *  2. merge `X.md` + sibling dir `X/` into `X/index.md` (Cabinet's container-
 *     page model), so children/assets nest under the page;
 *  3. rewrite links inside each `.md`: page→page links become `[[Title]]`
 *     wiki-links (resolved by slug, so location-independent), asset refs become
 *     same-dir relative paths (Cabinet auto-serves them via /api/assets).
 *
 * ponytail: databases land as a cleaned `.csv` (Cabinet renders CSV) + a
 * sibling folder of row-pages — no dedicated DB view. Reference-style links and
 * links containing `)` aren't rewritten — Notion exports neither.
 */

const NOTION_ID = /\s+[0-9a-f]{32}$/i;

/** Split a filename into base + extension, treating only a short trailing
 *  `.alnum` run as the extension (so "v1.0 Plan" keeps its dot). */
function splitExt(name: string): { base: string; ext: string } {
  const m = name.match(/\.[A-Za-z0-9]{1,8}$/);
  return m ? { base: name.slice(0, -m[0].length), ext: m[0] } : { base: name, ext: "" };
}

/** Strip the trailing ` <32-hex>` Notion id from a file or directory name. */
export function stripNotionId(name: string): string {
  const { base, ext } = splitExt(name);
  return base.replace(NOTION_ID, "").trimEnd() + ext;
}

/** Rewrite a single markdown body's links/images. `selfFolder` is the page's
 *  own containing folder name when the page is an `index.md` (else null), used
 *  to drop the redundant self-folder prefix off asset refs. */
export function rewriteLinks(markdown: string, selfFolder: string | null): string {
  return markdown.replace(
    /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g,
    (whole, bang: string, text: string, rawUrl: string) => {
      // Leave external links, anchors, and absolute paths untouched.
      if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(rawUrl)) return whole;

      let url = rawUrl;
      try {
        url = decodeURIComponent(rawUrl);
      } catch {
        /* keep raw on malformed escapes */
      }

      const segs = url.split("/").map(stripNotionId);
      const last = segs[segs.length - 1];

      // Page link → wiki-link (resolves by slug of the page's last segment).
      if (/\.md$/i.test(last)) {
        return `[[${splitExt(last).base}]]`;
      }

      // Asset → same-dir relative ref. Drop the page's own folder prefix
      // (Notion nests a page's assets under its `<page>/` folder).
      if (selfFolder && segs.length > 1 && segs[0] === selfFolder) segs.shift();
      const rel = segs.map(encodeURIComponent).join("/");
      return `${bang}[${text}](${rel})`;
    }
  );
}

/** Unique-name allocator: returns `desired`, or `desired-1`, `-2`… if taken. */
function dedupe(desired: string, taken: Set<string>): string {
  if (!taken.has(desired)) {
    taken.add(desired);
    return desired;
  }
  const { base, ext } = splitExt(desired);
  for (let i = 1; ; i++) {
    const candidate = `${base}-${i}${ext}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
}

async function cleanDir(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  // Pass 1: rename everything to a temp name to avoid transient collisions
  // (e.g. `A x.md`→`A.md` while the original `A.md` still exists).
  const staged: { tmp: string; isDir: boolean; desired: string }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const tmp = path.join(dir, `__notion_tmp_${i}`);
    await fs.rename(path.join(dir, e.name), tmp);
    staged.push({ tmp, isDir: e.isDirectory(), desired: stripNotionId(e.name) });
  }

  // Pass 2: assign final, de-duplicated names.
  const taken = new Set<string>();
  const finals = staged.map((s) => ({
    ...s,
    final: dedupe(s.desired, taken),
  }));
  for (const f of finals) {
    await fs.rename(f.tmp, path.join(dir, f.final));
  }

  // Pass 3: merge `X.md` + sibling dir `X/` → `X/index.md`.
  const dirNames = new Set(finals.filter((f) => f.isDir).map((f) => f.final));
  for (const f of finals) {
    if (f.isDir) continue;
    const { base, ext } = splitExt(f.final);
    if (ext.toLowerCase() !== ".md" || !dirNames.has(base)) continue;
    const target = path.join(dir, base, "index.md");
    // Don't clobber a real index page; leave the .md standalone if one exists.
    if (await exists(target)) continue;
    await fs.rename(path.join(dir, f.final), target);
  }

  // Pass 4: recurse into subdirectories.
  for (const f of finals) {
    if (f.isDir) await cleanDir(path.join(dir, f.final));
  }

  // Pass 5: rewrite links in every markdown file now in this directory.
  for (const name of await fs.readdir(dir)) {
    if (!/\.md$/i.test(name)) continue;
    const self = name === "index.md" ? path.basename(dir) : null;
    const file = path.join(dir, name);
    const body = await fs.readFile(file, "utf8");
    const next = rewriteLinks(body, self);
    if (next !== body) await fs.writeFile(file, next);
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Clean a Notion export rooted at `root`, mutating it in place. */
export async function cleanNotionExport(root: string): Promise<void> {
  await cleanDir(root);
}

/** Count markdown pages (`.md`) under `dir`, recursively — for an import summary. */
export async function countMarkdownFiles(dir: string): Promise<number> {
  let n = 0;
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += await countMarkdownFiles(path.join(dir, e.name));
    else if (/\.md$/i.test(e.name)) n++;
  }
  return n;
}

/**
 * Extract a Notion export zip into `dest`. Notion wraps larger exports as an
 * outer zip containing one or more inner `ExportBlock-…-Part-N.zip` archives, so
 * `.zip` entries are recursed into and merged into the same destination (the
 * parts share a top folder, so their trees join). Guards against zip-slip.
 */
export async function extractNotionZip(buf: Buffer, dest: string): Promise<void> {
  const zip = await JSZip.loadAsync(buf);
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const data = await entry.async("nodebuffer");
    if (entry.name.toLowerCase().endsWith(".zip")) {
      await extractNotionZip(data, dest);
      continue;
    }
    const out = path.join(dest, entry.name);
    if (out !== dest && !out.startsWith(dest + path.sep)) continue; // ../ escape
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, data);
  }
}
