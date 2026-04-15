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
const stagedNativeDir = path.join(standaloneDir, ".native");
const stagedNodePtyDir = path.join(stagedNativeDir, "node-pty");
const stagedSeedDir = path.join(standaloneDir, ".seed");
const bundledNodeBinaryPath = path.join(standaloneBinDir, "node");
const rootNodePtyDir = path.join(projectRoot, "node_modules", "node-pty");
const dataDir = path.join(projectRoot, "data");
const darwinPrebuildDir = path.join("prebuilds", `darwin-${process.arch}`);

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
    removePath(stagedNativeDir),
    removePath(bundledNodeBinaryPath),
    // Remove any node-pty from node_modules so the daemon can only find
    // it via NODE_PATH (pointing outside the .app bundle at runtime).
    removePath(path.join(standaloneNodeModulesDir, "node-pty")),
  ]);

  await bundleDaemon();
  await copyDirectory(path.join(projectRoot, "server", "migrations"), daemonMigrationsDir);

  // Stage node-pty into .native/ (NOT node_modules/) so it ships inside the
  // app bundle but is not resolvable by require().  At runtime, main.cjs
  // copies it to userData where macOS allows execution.
  await Promise.all([
    copyDirectory(path.join(rootNodePtyDir, "lib"), path.join(stagedNodePtyDir, "lib")),
    copyDirectory(
      path.join(rootNodePtyDir, darwinPrebuildDir),
      path.join(stagedNodePtyDir, darwinPrebuildDir)
    ),
    copyFile(path.join(rootNodePtyDir, "package.json"), path.join(stagedNodePtyDir, "package.json")),
  ]);

  await fs.chmod(path.join(stagedNodePtyDir, darwinPrebuildDir, "spawn-helper"), 0o755);
}

async function stageBundledNodeRuntime() {
  await copyFile(process.execPath, bundledNodeBinaryPath);
  await fs.chmod(bundledNodeBinaryPath, 0o755);

  // Node on macOS links against a sibling libnode.<abi>.dylib under ../lib.
  // When we copy just the binary into .next/standalone/bin, dyld can no longer
  // find that shared library, leading to “Library not loaded: @rpath/libnode.141.dylib”.
  // Copy the matching libnode.*.dylib next to the bundled runtime to satisfy
  // the @rpath lookup that expects ../lib relative to the executable.
  const hostLibDir = path.resolve(path.dirname(process.execPath), "..", "lib");
  const bundledLibDir = path.resolve(standaloneDir, "lib");
  try {
    const entries = await fs.readdir(hostLibDir);
    const libnode = entries.find((name) => name.startsWith("libnode.") && name.endsWith(".dylib"));
    if (libnode) {
      await fs.mkdir(bundledLibDir, { recursive: true });
      await copyFile(path.join(hostLibDir, libnode), path.join(bundledLibDir, libnode));
    } else {
      console.warn("[packaging] libnode dylib not found in host Node lib dir; packaged runtime may fail to load.");
    }
  } catch (err) {
    console.warn("[packaging] failed to copy libnode dylib:", err.message || err);
  }
}

async function stageSeedContent() {
  await removePath(stagedSeedDir);

  // Default pages
  await Promise.all([
    copyDirectory(path.join(dataDir, "example-cabinet-carousel-factory"), path.join(stagedSeedDir, "example-cabinet-carousel-factory")),
    copyDirectory(path.join(dataDir, "getting-started"), path.join(stagedSeedDir, "getting-started")),
    copyFile(path.join(dataDir, "index.md"), path.join(stagedSeedDir, "index.md")),
    copyFile(path.join(dataDir, "CLAUDE.md"), path.join(stagedSeedDir, "CLAUDE.md")),
  ]);

  // Agent library templates
  await copyDirectory(
    path.join(dataDir, ".agents", ".library"),
    path.join(stagedSeedDir, ".agents", ".library")
  );

  // Playbook catalog
  if (await pathExists(path.join(dataDir, ".playbooks", "catalog"))) {
    await copyDirectory(
      path.join(dataDir, ".playbooks", "catalog"),
      path.join(stagedSeedDir, ".playbooks", "catalog")
    );
  }

  // Remove .DS_Store files
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (entry.name === ".DS_Store") await removePath(fullPath);
    }
  };
  await walk(stagedSeedDir);
}

/**
 * When turbopack.root points above the project directory, Next.js standalone
 * output nests the server files under a subdirectory named after the project
 * folder (e.g. `.next/standalone/cabinet/`).  Hoist those files to the
 * standalone root so that main.cjs can find server.js at the expected path.
 */
async function hoistNestedStandalone() {
  const nestedDir = path.join(standaloneDir, path.basename(projectRoot));
  if (!(await pathExists(path.join(nestedDir, "server.js")))) {
    return; // already flat — nothing to hoist
  }

  async function mergeMove(src, dest) {
    const srcStat = await fs.lstat(src);

    if (!srcStat.isDirectory()) {
      if (!(await pathExists(dest))) {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.rename(src, dest);
      } else {
        await removePath(src);
      }
      return;
    }

    if (!(await pathExists(dest))) {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.rename(src, dest);
      return;
    }

    const destStat = await fs.lstat(dest);
    if (!destStat.isDirectory()) {
      await removePath(src);
      return;
    }

    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      await mergeMove(path.join(src, entry.name), path.join(dest, entry.name));
    }

    await removePath(src);
  }

  await mergeMove(nestedDir, standaloneDir);
}

async function main() {
  if (!(await pathExists(standaloneDir))) {
    throw new Error("Expected .next/standalone to exist. Run `npm run build` first.");
  }

  await removePath(outDir);
  await hoistNestedStandalone();

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
  await stageSeedContent();
}

await main();
