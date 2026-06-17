#!/usr/bin/env node
/**
 * Legacy-structure migration for existing customers.
 *
 * Converts an old data folder to the current "vault + Sibling Pattern" layout:
 *
 *   1. VAULT LAYOUT  — loose content sitting directly under data/ is moved into a
 *      single root-cabinet folder (the "vault"); only shared cross-vault state
 *      (.home, .cabinet-state, cabinet-backups, bookmarks.json) stays at the root.
 *
 *   2. GIT           — the old SHARED data/.git is moved INTO the vault so each
 *      vault owns its history (data/<Vault>/.git). Because both the content and
 *      the repo move together, the tracked paths stay valid (no rename churn).
 *
 *   3. PAGES         — legacy Directory-Pattern pages (`X/index.md`) become
 *      Sibling-Pattern pages (`<parent>/X.md`):
 *        a) rename  X/index.md       -> X/<X>.md
 *        b) move up  X/<X>.md         -> <parent>/<X>.md
 *        c) delete   X/               if nothing else remains
 *      Sub-pages and local assets stay inside X/ (which becomes the sibling
 *      folder of X.md); relative links inside the moved page are re-based, and
 *      explicit `.../index.md` links across the vault are rewritten.
 *
 * Pages are renamed but their LOGICAL path is unchanged (`X/index.md` and `X.md`
 * both resolve to virtual path `X`), so wiki-links by name keep working.
 *
 * Special container folders keep their index.md and are never collapsed:
 * cabinets (.cabinet), linked folders/repos (.cabinet-meta, .repo.yaml), apps (.app).
 *
 * Usage:
 *   node scripts/migrate-legacy-structure.mjs [--data <dir>] [--dry-run]
 *                                             [--no-backup] [--no-commit]
 *   CABINET_DATA_DIR=/path/to/data node scripts/migrate-legacy-structure.mjs
 *
 * Idempotent: re-running on an already-migrated folder is a no-op. Run with the
 * dev server + daemon stopped (the SQLite DB must not be open).
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY_RUN = has("--dry-run");
const DO_BACKUP = !has("--no-backup");
const DO_COMMIT = !has("--no-commit");
const DATA_DIR = path.resolve(
  opt("--data", process.env.CABINET_DATA_DIR || path.join(REPO_ROOT, "data"))
);

// Cross-vault state that lives beside the vaults and is never itself a vault nor
// moved during migration. Mirrors SHARED_TOP_LEVEL in src/lib/cabinets/vaults.ts
// (note: .git is intentionally NOT here — it moves into the vault per phase 2).
const SHARED_TOP_LEVEL = new Set([
  ".home",
  ".cabinet-state",
  "cabinet-backups",
  "bookmarks.json",
]);

// Folders whose presence marks a "special container" whose index.md must stay.
const CONTAINER_MARKERS = [".cabinet", ".cabinet-meta", ".repo.yaml", ".app"];

const DEFAULT_VAULT_NAME = "Cabinet";

const log = (...a) => console.log("[migrate-legacy]", ...a);
const act = (...a) => console.log(DRY_RUN ? "[dry-run]" : "[apply]", ...a);

// ── fs helpers (no-ops under --dry-run) ────────────────────────────────────
const exists = (p) => fs.existsSync(p);
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const readDir = (p) => { try { return fs.readdirSync(p); } catch { return []; } };

function mkdirp(p) { if (!DRY_RUN) fs.mkdirSync(p, { recursive: true }); }
function rename(src, dst) {
  act("move", path.relative(DATA_DIR, src), "->", path.relative(DATA_DIR, dst));
  if (DRY_RUN) return;
  mkdirp(path.dirname(dst));
  fs.renameSync(src, dst);
}
function rmdir(p) {
  act("rmdir", path.relative(DATA_DIR, p) || ".");
  if (!DRY_RUN) fs.rmdirSync(p);
}
function rmFile(p) {
  act("rm", path.relative(DATA_DIR, p));
  if (!DRY_RUN) fs.rmSync(p, { force: true });
}
function writeFile(p, content) {
  if (!DRY_RUN) fs.writeFileSync(p, content, "utf-8");
}
function readYaml(file) {
  try { return yaml.load(fs.readFileSync(file, "utf-8")) || {}; } catch { return null; }
}
function sanitizeVaultName(raw) {
  return String(raw || "")
    .replace(/[\\/]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}
function isContainerDir(dir) {
  return CONTAINER_MARKERS.some((m) => exists(path.join(dir, m)));
}
// Junk-only entries that don't count toward "is this folder empty?".
const JUNK = new Set([".DS_Store", "Thumbs.db"]);

// ── vault-relative posix-path helpers ───────────────────────────────────────
// All link math is done on "/"-separated vault-relative paths so it is platform
// independent and easy to reason about.
function vrel(vaultDir, abs) {
  return path.relative(vaultDir, abs).split(path.sep).join("/");
}
function parentV(vpath) {
  return vpath.includes("/") ? vpath.slice(0, vpath.lastIndexOf("/")) : "";
}
function joinV(dir, rel) {
  return dir ? `${dir}/${rel}` : rel;
}
function normVPath(vpath) {
  const out = [];
  for (const seg of vpath.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}
function relVPath(fromDir, to) {
  const a = fromDir ? fromDir.split("/") : [];
  const b = to ? to.split("/") : [];
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const up = a.slice(i).map(() => "..");
  const down = b.slice(i);
  const rel = [...up, ...down].join("/");
  return rel || ".";
}

main();

function main() {
  if (!isDir(DATA_DIR)) {
    log(`data dir not found: ${DATA_DIR} — nothing to do.`);
    return;
  }
  log(`data dir: ${DATA_DIR}${DRY_RUN ? "  (DRY RUN — no changes written)" : ""}`);

  if (DO_BACKUP && !DRY_RUN) backup();

  const vaults = phase1EnsureVault();
  for (const vaultDir of vaults) {
    phase2GitIntoVault(vaultDir);
    const converted = phase3ConvertPages(vaultDir);
    rewriteLinks(vaultDir, converted);
    if (DO_COMMIT) commit(vaultDir, converted.convertedDirs.size);
  }
  log("done.");
}

// ── backup ─────────────────────────────────────────────────────────────────
function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dst = `${DATA_DIR}-backup-${stamp}`;
  log(`backing up ${DATA_DIR} -> ${dst}`);
  fs.cpSync(DATA_DIR, dst, { recursive: true });
}

// ── phase 1: ensure a vault holds all content ───────────────────────────────
function isVaultDir(dir) {
  if (!isDir(dir)) return false;
  const m = readYaml(path.join(dir, ".cabinet"));
  return !!m && (m.kind === "root" || m.kind === undefined);
}

function phase1EnsureVault() {
  const top = readDir(DATA_DIR);
  const existingVaults = top
    .filter((n) => !SHARED_TOP_LEVEL.has(n) && isVaultDir(path.join(DATA_DIR, n)))
    .map((n) => path.join(DATA_DIR, n));

  if (existingVaults.length > 0) {
    log(`vault layout already present: ${existingVaults.map((d) => path.basename(d)).join(", ")}`);
    return existingVaults;
  }

  // No vault yet: derive a name (root .cabinet name, else home.json, else default).
  const rootManifest = readYaml(path.join(DATA_DIR, ".cabinet"));
  const home = readYaml(path.join(DATA_DIR, ".home", "home.json")) || {};
  let target =
    sanitizeVaultName(rootManifest?.name) ||
    sanitizeVaultName(home.activeVault) ||
    DEFAULT_VAULT_NAME;

  const loose = top.filter((n) => !SHARED_TOP_LEVEL.has(n));
  if (loose.includes(target)) target = DEFAULT_VAULT_NAME; // never bury into a loose entry
  const targetDir = path.join(DATA_DIR, target);
  log(`no vault found — consolidating loose content into vault "${target}"`);
  mkdirp(targetDir);

  for (const name of loose) {
    if (name === target) continue;
    rename(path.join(DATA_DIR, name), path.join(targetDir, name));
  }
  return [targetDir];
}

// ── phase 2: move shared git into the vault ──────────────────────────────────
function phase2GitIntoVault(vaultDir) {
  const sharedGit = path.join(DATA_DIR, ".git");
  const vaultGit = path.join(vaultDir, ".git");
  if (exists(vaultGit)) {
    log(`git already per-vault: ${path.relative(DATA_DIR, vaultGit)}`);
    return;
  }
  if (!exists(sharedGit)) {
    log("no shared .git to migrate.");
    return;
  }
  const otherVaults = readDir(DATA_DIR).filter(
    (n) => !SHARED_TOP_LEVEL.has(n) && isVaultDir(path.join(DATA_DIR, n))
  );
  if (otherVaults.length > 1) {
    log("WARNING: shared .git but multiple vaults — leaving .git at root; resolve manually.");
    return;
  }
  rename(sharedGit, vaultGit);
}

// ── phase 3: convert legacy index.md pages (bottom-up) ───────────────────────
// Two passes: first move every legacy `X/index.md` up to `<parent>/X.md`
// (deleting emptied folders), recording what moved; then rewrite links so they
// still resolve against the new file locations.
function phase3ConvertPages(vaultDir) {
  const convertedDirs = new Set(); // vault-rel posix dir paths that were collapsed
  const pageOldDir = new Map();    // new md vault-rel path -> its ORIGINAL dir vpath
  walkConvert(vaultDir, vaultDir, true, convertedDirs, pageOldDir);
  log(`converted ${convertedDirs.size} legacy page folder(s) in ${path.basename(vaultDir)}`);
  return { convertedDirs, pageOldDir };
}

function walkConvert(dir, vaultDir, isVaultRoot, convertedDirs, pageOldDir) {
  // Special containers (nested cabinets, linked repos, apps) own their internal
  // structure — never descend into them nor convert their pages (a linked repo's
  // sub-pages are synced from an external source). The vault root is itself a
  // cabinet, so we still descend into it; we just never convert the root itself.
  if (!isVaultRoot && isContainerDir(dir)) return;

  // Recurse into children first so the deepest pages convert before their parents.
  for (const name of readDir(dir)) {
    if (name.startsWith(".")) continue; // hidden/scaffold dirs are never pages
    const child = path.join(dir, name);
    if (isDir(child)) walkConvert(child, vaultDir, false, convertedDirs, pageOldDir);
  }

  if (isVaultRoot) return;            // the vault root is the cabinet entry; keep its index.md
  const indexPath = path.join(dir, "index.md");
  if (!exists(indexPath)) return;     // not a legacy page folder

  const base = path.basename(dir);
  const target = path.join(path.dirname(dir), `${base}.md`);
  const dirV = vrel(vaultDir, dir);
  if (exists(target)) {
    log(`SKIP ${dirV}: sibling ${base}.md already exists`);
    return;
  }

  rename(indexPath, target);
  convertedDirs.add(dirV);
  pageOldDir.set(vrel(vaultDir, target), dirV);

  // Drop junk, then remove the now-empty folder (sub-pages/assets keep it alive).
  for (const name of readDir(dir)) {
    if (JUNK.has(name)) rmFile(path.join(dir, name));
  }
  if (DRY_RUN || readDir(dir).length === 0) rmdir(dir);
}

function readText(p) {
  try { return fs.readFileSync(p, "utf-8"); } catch { return ""; }
}

// ── phase 3 link pass: re-resolve relative links to the new layout ───────────
function rewriteLinks(vaultDir, { convertedDirs, pageOldDir }) {
  if (convertedDirs.size === 0) return;
  let files = 0;
  forEachMd(vaultDir, (file) => {
    const vp = vrel(vaultDir, file);
    const newDir = parentV(vp);
    // A converted page's links were authored relative to its ORIGINAL folder.
    const oldDir = pageOldDir.get(vp) ?? newDir;
    const before = readText(file);
    const after = rewriteContentLinks(before, oldDir, newDir, convertedDirs);
    if (after !== before) {
      writeFile(file, after);
      files++;
      act("rewrite links in", vp);
    }
  });
  if (files) log(`rewrote links in ${files} file(s)`);
}

/**
 * Rewrite relative markdown links/images. Each target is resolved to an absolute
 * vault-relative path against the file's ORIGINAL directory, remapped through the
 * `X/index.md -> X.md` collapse, then re-expressed relative to the file's NEW
 * directory. Absolute URLs, anchors and root-absolute paths are left alone, and
 * wiki-links (resolved globally by name) are untouched.
 */
function rewriteContentLinks(content, oldDir, newDir, convertedDirs) {
  if (!content) return content;
  return content.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (m, pre, tgt, post) => {
    if (/^\s*<.*>\s*$/.test(tgt)) return m; // angle-bracket form: skip
    const t = tgt.trim();
    if (!t || /^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith("#") || t.startsWith("/")) return m;
    const hash = t.search(/[#?]/);
    const linkPart = hash >= 0 ? t.slice(0, hash) : t;
    const suffix = hash >= 0 ? t.slice(hash) : "";
    let abs = normVPath(joinV(oldDir, linkPart));            // where it pointed, originally
    if (abs.endsWith("/index.md")) {
      const d = abs.slice(0, -"/index.md".length);
      if (convertedDirs.has(d)) abs = `${d}.md`;             // parent page collapsed too
    }
    return pre + relVPath(newDir, abs) + suffix + post;
  });
}

function forEachMd(dir, fn) {
  for (const name of readDir(dir)) {
    const full = path.join(dir, name);
    if (isDir(full)) {
      if (name === ".git" || name === "node_modules") continue;
      forEachMd(full, fn);
    } else if (name.endsWith(".md")) {
      fn(full);
    }
  }
}

// ── git commit ───────────────────────────────────────────────────────────────
function commit(vaultDir, count) {
  if (!exists(path.join(vaultDir, ".git"))) return;
  if (DRY_RUN) { act("git add -A && git commit (vault:", path.basename(vaultDir) + ")"); return; }
  try {
    execFileSync("git", ["-C", vaultDir, "add", "-A"], { stdio: "ignore" });
    const status = execFileSync("git", ["-C", vaultDir, "status", "--porcelain"], { encoding: "utf-8" });
    if (!status.trim()) { log("nothing to commit."); return; }
    execFileSync(
      "git",
      ["-C", vaultDir, "commit", "-m", `Migrate to vault + Sibling Pattern (${count} page folder(s))`],
      { stdio: "ignore" }
    );
    log(`committed migration in ${path.basename(vaultDir)}`);
  } catch (e) {
    log("WARNING: git commit failed:", e.message);
  }
}
