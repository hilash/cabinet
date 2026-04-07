import { build as bundle } from "esbuild";
import fs from "fs/promises";
import path from "path";

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, "out");
const nextDir = path.join(projectRoot, ".next");
const standaloneDir = path.join(nextDir, "standalone");
const standaloneServerDir = path.join(standaloneDir, "server");
const standaloneNodeModulesDir = path.join(standaloneDir, "node_modules");
const standaloneBinDir = path.join(standaloneDir, "bin");
const daemonBundlePath = path.join(standaloneServerDir, "cabinet-daemon.cjs");
const daemonMigrationsDir = path.join(standaloneServerDir, "migrations");
const bundledNodePtyDir = path.join(standaloneNodeModulesDir, "node-pty");
const bundledNodeBinaryPath = path.join(standaloneBinDir, "node");
const rootNodePtyDir = path.join(projectRoot, "node_modules", "node-pty");

const STANDALONE_PRUNE_PATHS = [
  ".agents",
  ".claude",
  ".github",
  ".git",
  "assets",
  "cli",
  "coverage",
  "data",
  "electron",
  "out",
  "scripts",
  "src",
  "test",
  ".dockerignore",
  ".env.example",
  ".env.local",
  ".gitignore",
  "AI-claude-editor.md",
  "CLAUDE.md",
  "LICENSE",
  "LICENSE.md",
  "PRD.md",
  "PROGRESS.md",
  "README.md",
  "components.json",
  "eslint.config.mjs",
  "forge.config.cjs",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "postcss.config.mjs",
  "run-agent.sh",
  "skills-lock.json",
  "tsconfig.json",
  "tsconfig.tsbuildinfo",
];

const SERVER_PRUNE_PATHS = [
  path.join("server", "cabinet-daemon.ts"),
  path.join("server", "db.ts"),
  path.join("server", "terminal-server.ts"),
  path.join("server", "cabinet-daemon.cjs"),
  path.join("server", "migrations"),
];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function removePath(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function copyDirectory(fromPath, toPath) {
  if (!(await pathExists(fromPath))) {
    return;
  }

  await removePath(toPath);
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.cp(fromPath, toPath, { recursive: true, force: true });
}

async function copyFile(fromPath, toPath) {
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.copyFile(fromPath, toPath);
}

async function bundleDaemon() {
  await fs.mkdir(standaloneServerDir, { recursive: true });
  await bundle({
    entryPoints: [path.join(projectRoot, "server", "cabinet-daemon.ts")],
    bundle: true,
    format: "cjs",
    outfile: daemonBundlePath,
    platform: "node",
    target: "node20",
    external: ["better-sqlite3", "node-pty"],
    logLevel: "silent",
  });
}

async function stageDaemonRuntime() {
  await Promise.all([
    removePath(daemonBundlePath),
    removePath(daemonMigrationsDir),
    removePath(bundledNodePtyDir),
    removePath(bundledNodeBinaryPath),
  ]);

  await bundleDaemon();
  await copyDirectory(path.join(projectRoot, "server", "migrations"), daemonMigrationsDir);

  await Promise.all([
    copyDirectory(path.join(rootNodePtyDir, "lib"), path.join(bundledNodePtyDir, "lib")),
    copyDirectory(
      path.join(rootNodePtyDir, "prebuilds", "darwin-arm64"),
      path.join(bundledNodePtyDir, "prebuilds", "darwin-arm64")
    ),
    copyFile(path.join(rootNodePtyDir, "package.json"), path.join(bundledNodePtyDir, "package.json")),
  ]);

  await fs.chmod(path.join(bundledNodePtyDir, "prebuilds", "darwin-arm64", "spawn-helper"), 0o755);
}

async function stageBundledNodeRuntime() {
  await copyFile(process.execPath, bundledNodeBinaryPath);
  await fs.chmod(bundledNodeBinaryPath, 0o755);
}

async function main() {
  if (!(await pathExists(standaloneDir))) {
    throw new Error("Expected .next/standalone to exist. Run `npm run build` first.");
  }

  await removePath(outDir);

  await Promise.all([
    removePath(path.join(standaloneDir, ".next", "cache")),
    removePath(path.join(standaloneDir, ".next", "dev")),
    ...STANDALONE_PRUNE_PATHS.map((relativePath) =>
      removePath(path.join(standaloneDir, relativePath))
    ),
    ...SERVER_PRUNE_PATHS.map((relativePath) =>
      removePath(path.join(standaloneDir, relativePath))
    ),
  ]);

  await copyDirectory(path.join(projectRoot, "public"), path.join(standaloneDir, "public"));
  await copyDirectory(path.join(nextDir, "static"), path.join(standaloneDir, ".next", "static"));
  await stageDaemonRuntime();
  await stageBundledNodeRuntime();
}

await main();
