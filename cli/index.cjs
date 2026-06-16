#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * create-cabinet — thin wrapper that delegates to cabinetai.
 *
 * Usage:
 *   npx create-cabinet [dir]           → cabinetai create <dir> + cabinetai run
 *   npx create-cabinet help            → cabinetai --help
 *   npx create-cabinet upgrade [opts]  → cabinetai update (legacy compat)
 */

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const COMMANDS = ["init", "upgrade", "help", "--help"];
const firstArg = args[0] || "init";
const command = COMMANDS.includes(firstArg) ? firstArg : "init";
const dirArg = COMMANDS.includes(firstArg) ? args[1] : firstArg;

function resolveCabinetAI() {
  // Resolve cabinetai's real JS entrypoint (its package.json `bin`) so we can run
  // it with `node` on every platform. The npm-generated `.bin/cabinetai` shim is a
  // POSIX shell script on Windows; spawning it via `node` makes Node parse the shell
  // script as JavaScript and crash with a SyntaxError (issue #81). Reading the
  // package's own bin field sidesteps the shims entirely.
  const packageDirs = [
    // Sibling install in our own node_modules (create-cabinet was npm-installed)
    path.join(__dirname, "node_modules", "cabinetai"),
    // Hoisted install one level up
    path.join(__dirname, "..", "cabinetai"),
    path.join(__dirname, "..", "node_modules", "cabinetai"),
  ];

  for (const dir of packageDirs) {
    const pkgPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const bin = pkg.bin;
      const rel = typeof bin === "string" ? bin : bin && (bin.cabinetai || Object.values(bin)[0]);
      if (!rel) continue;
      const entry = path.join(dir, rel);
      if (fs.existsSync(entry)) return entry;
    } catch {
      // Ignore a malformed package.json and try the next candidate.
    }
  }

  return null;
}

// Mirror of cabinetai's slugify (cabinetai/src/lib/paths.ts). `cabinetai create`
// slugifies the name into the directory it writes (e.g. "My Startup" -> ./my-startup/),
// so we must cd into the slug, not the raw argument, or `create-cabinet "My Startup"`
// crashes with ENOENT on chdir. Kept in sync manually; resolveCreatedDir falls back
// to the raw name if the slug isn't present on disk.
function slugifyDir(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveCreatedDir(name) {
  for (const candidate of [slugifyDir(name), name]) {
    if (!candidate) continue;
    const abs = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(abs)) return abs;
  }
  return path.resolve(process.cwd(), slugifyDir(name) || name);
}

function pinnedCabinetAIVersion() {
  // Pin the npx fallback to the exact cabinetai version this create-cabinet was published against.
  // Reading from our own dependencies guarantees create-cabinet@N.M.K → cabinetai@N.M.K, never @latest.
  try {
    const pkg = require("./package.json");
    return (pkg.dependencies && pkg.dependencies.cabinetai) || pkg.version;
  } catch {
    return null;
  }
}

function runCabinetAI(cmdArgs) {
  const localBin = resolveCabinetAI();

  if (localBin) {
    const result = spawnSync(process.execPath, [localBin, ...cmdArgs], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    return result.status || 0;
  }

  // Fall back to npx with an exact-version pin (never @latest, to keep create-cabinet@X
  // and cabinetai@X moving together).
  const version = pinnedCabinetAIVersion();
  const spec = version ? `cabinetai@${version}` : "cabinetai";
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npxBin, ["-y", spec, ...cmdArgs], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  return result.status || 0;
}

if (command === "help" || command === "--help") {
  console.log(`
  create-cabinet — Create a new Cabinet project

  This tool delegates to the cabinetai CLI.

  Usage:
    npx create-cabinet [directory]    Create a new cabinet and start it
    npx create-cabinet help           Show this help

  For more commands, use cabinetai directly:
    npx cabinetai --help
  `);
  process.exit(0);
}

if (command === "upgrade") {
  // Legacy upgrade compat — delegate to cabinetai update
  const status = runCabinetAI(["update"]);
  process.exit(status);
}

// Default: init — create cabinet + run
const targetDir = dirArg || "cabinet";

console.log(`
  ┌─────────────────────────────┐
  │                             │
  │   📦  Cabinet               │
  │   AI-first startup OS       │
  │                             │
  └─────────────────────────────┘
`);

// Step 1: Create the cabinet
const createStatus = runCabinetAI(["create", targetDir]);
if (createStatus !== 0) {
  process.exit(createStatus);
}

// Step 2: Run Cabinet from the new directory. cabinetai create slugifies the
// name into the directory it wrote, so resolve the actual created directory
// rather than assuming it matches the raw argument.
const targetPath = resolveCreatedDir(targetDir);
process.chdir(targetPath);
const runStatus = runCabinetAI(["run"]);
process.exit(runStatus);
