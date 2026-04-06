#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const REPO_URL = "https://github.com/hilash/cabinet";
const GIT_REPO = `${REPO_URL}.git`;
const DIR = "cabinet";
const CLI_PACKAGE = require("./package.json");
const DEFAULT_VERSION = CLI_PACKAGE.version;

const args = process.argv.slice(2);
const COMMANDS = ["init", "upgrade", "help", "--help"];
const firstArg = args[0] || "init";
const command = COMMANDS.includes(firstArg) ? firstArg : "init";
const dirArg = COMMANDS.includes(firstArg) ? args[1] : firstArg;

const log = (msg) => console.log(`\x1b[36m>\x1b[0m ${msg}`);
const success = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const warning = (msg) => console.log(`\x1b[33m!\x1b[0m ${msg}`);
const error = (msg) => {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
};

const PROJECT_BACKUP_IGNORES = new Set([
  ".git",
  ".next",
  "node_modules",
  ".cabinet-backups",
  "out",
  "dist",
  "coverage",
]);

const PRESERVED_TOP_LEVEL = new Set([
  ".env.local",
  ".git",
  ".cabinet-install.json",
  "data",
  "node_modules",
  ".next",
]);

function run(bin, args, opts = {}) {
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    ...opts,
  });
  if (result.status !== 0) {
    error(`Command failed: ${bin} ${args.join(" ")}`);
  }
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function readFlag(name, fallback = undefined) {
  const longFlag = `--${name}`;
  const index = args.indexOf(longFlag);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
}

function validateTargetDir(targetDir) {
  if (!targetDir || !targetDir.trim()) {
    error("Please provide a valid directory name.");
  }
  if (targetDir.startsWith("-")) {
    error("Directory names cannot start with '-'.");
  }
}

function timestampToken() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function releaseTagFor(version) {
  return version.startsWith("v") ? version : `v${version}`;
}

function defaultTarballUrl(version) {
  return `${REPO_URL}/archive/refs/tags/${releaseTagFor(version)}.tar.gz`;
}

function resolveDataDir(targetDir) {
  const configured = process.env.CABINET_DATA_DIR && process.env.CABINET_DATA_DIR.trim();
  return configured ? path.resolve(configured) : path.join(targetDir, "data");
}

function updateStatusPath(targetDir) {
  return path.join(resolveDataDir(targetDir), ".cabinet", "update-status.json");
}

function writeUpdateStatus(targetDir, status) {
  const filePath = updateStatusPath(targetDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(status, null, 2), "utf8");
}

function writeInstallMetadata(targetDir, version, manifestUrl) {
  const dataDir = resolveDataDir(targetDir);
  const payload = {
    installKind: "source-managed",
    managed: true,
    installedAt: new Date().toISOString(),
    currentVersion: version,
    releaseTag: releaseTagFor(version),
    projectRoot: targetDir,
    dataDir,
    manifestUrl,
    packageManager: "npm",
    createdBy: "create-cabinet",
  };

  const rootMetadataPath = path.join(targetDir, ".cabinet-install.json");
  const dataMetadataPath = path.join(dataDir, ".cabinet", "install.json");
  fs.mkdirSync(path.dirname(dataMetadataPath), { recursive: true });
  fs.writeFileSync(rootMetadataPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(dataMetadataPath, JSON.stringify(payload, null, 2), "utf8");
}

async function downloadReleaseTarball(tarballUrl, destination) {
  const response = await fetch(tarballUrl, {
    headers: { "user-agent": "create-cabinet" },
  });

  if (!response.ok) {
    throw new Error(`Failed to download release tarball (${response.status})`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destination, bytes);
}

function extractTarball(archivePath, destination) {
  run("tar", ["-xzf", archivePath, "-C", destination]);
}

function findExtractedRoot(destination) {
  const entries = fs
    .readdirSync(destination, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  if (entries.length !== 1) {
    error("Unexpected release archive layout.");
  }

  return path.join(destination, entries[0].name);
}

function ensureEnvLocal(targetDir) {
  const envExample = path.join(targetDir, ".env.example");
  const envLocal = path.join(targetDir, ".env.local");
  if (fs.existsSync(envExample) && !fs.existsSync(envLocal)) {
    fs.copyFileSync(envExample, envLocal);
  }
}

function copyReleaseTree(sourceRoot, targetDir) {
  const entries = fs.readdirSync(sourceRoot, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;
    if (PRESERVED_TOP_LEVEL.has(name)) continue;

    const sourcePath = path.join(sourceRoot, name);
    const targetPath = path.join(targetDir, name);

    fs.rmSync(targetPath, { recursive: true, force: true });
    fs.cpSync(sourcePath, targetPath, { recursive: true });
  }
}

function createProjectSnapshotBackup(targetDir, reason) {
  const destination = path.join(
    path.resolve(targetDir, "..", ".cabinet-backups", path.basename(targetDir)),
    `${timestampToken()}-${reason}`,
    "project"
  );

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(targetDir, destination, {
    recursive: true,
    filter: (src) => {
      const relative = path.relative(targetDir, src);
      if (!relative) return true;
      const first = relative.split(path.sep)[0];
      return !PROJECT_BACKUP_IGNORES.has(first);
    },
  });

  return destination;
}

async function prepareReleaseSource({ tarballUrl, allowCloneFallback }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cabinet-release-"));
  const archivePath = path.join(tempDir, "cabinet-release.tgz");

  try {
    await downloadReleaseTarball(tarballUrl, archivePath);
    extractTarball(archivePath, tempDir);
    return {
      sourceRoot: findExtractedRoot(tempDir),
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
  } catch (downloadError) {
    if (!allowCloneFallback) {
      throw downloadError;
    }

    warning("Pinned release archive unavailable, falling back to cloning the repository HEAD.");
    const cloneDir = path.join(tempDir, "cabinet-clone");
    run("git", ["clone", "--depth", "1", GIT_REPO, cloneDir]);
    return {
      sourceRoot: cloneDir,
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
  }
}

async function initProject({ targetDir, version, tarballUrl, manifestUrl }) {
  validateTargetDir(targetDir);

  console.log(`
  ┌─────────────────────────────┐
  │                             │
  │   📦  Cabinet               │
  │   AI-first startup OS       │
  │                             │
  └─────────────────────────────┘
  `);

  if (fs.existsSync(targetDir)) {
    error(`Directory "${targetDir}" already exists.`);
  }

  const { sourceRoot, cleanup } = await prepareReleaseSource({
    tarballUrl,
    allowCloneFallback: true,
  });

  try {
    log(`Preparing Cabinet ${version} in ./${targetDir}...`);
    fs.mkdirSync(targetDir, { recursive: true });
    copyReleaseTree(sourceRoot, targetDir);
    ensureEnvLocal(targetDir);

    log("Installing dependencies...");
    run(npmCommand(), ["install"], { cwd: targetDir });

    fs.rmSync(path.join(targetDir, ".git"), { recursive: true, force: true });
    run("git", ["init"], { cwd: targetDir });

    writeInstallMetadata(targetDir, version, manifestUrl);

    console.log("");
    success(`Cabinet ${version} is ready!`);
    console.log(`
  Next steps:

    cd ${targetDir}
    npm run dev:all

  Open http://localhost:3000

  Cabinet will keep checking for new releases, but please keep a copy
  of your data folder while Cabinet is still experimental and moving fast.
  `);
  } finally {
    cleanup();
  }
}

async function upgradeProject({ targetDir, version, tarballUrl, manifestUrl }) {
  const absoluteTarget = path.resolve(targetDir || process.cwd());
  if (!fs.existsSync(absoluteTarget)) {
    error(`Target directory "${absoluteTarget}" does not exist.`);
  }

  const backupState = {
    state: "downloading",
    startedAt: new Date().toISOString(),
    targetVersion: version,
    currentVersion: safeReadCurrentVersion(absoluteTarget),
    installKind: "source-managed",
    message: `Downloading Cabinet ${version}...`,
    log: [`Downloading release archive from ${tarballUrl}`],
  };
  writeUpdateStatus(absoluteTarget, backupState);

  let backupPath = "";
  const { sourceRoot, cleanup } = await prepareReleaseSource({
    tarballUrl,
    allowCloneFallback: false,
  });

  try {
    backupState.state = "backing-up";
    backupState.message = "Creating a backup before applying the update...";
    backupState.log.push("Creating project snapshot backup");
    writeUpdateStatus(absoluteTarget, backupState);
    backupPath = createProjectSnapshotBackup(absoluteTarget, "pre-update");

    const applyState = {
      ...backupState,
      state: "applying",
      backupPath,
      message: `Applying Cabinet ${version}...`,
      log: [...backupState.log, `Backup created at ${backupPath}`, "Replacing Cabinet app files"],
    };
    writeUpdateStatus(absoluteTarget, applyState);

    copyReleaseTree(sourceRoot, absoluteTarget);
    ensureEnvLocal(absoluteTarget);

    run(npmCommand(), ["install"], { cwd: absoluteTarget });
    writeInstallMetadata(absoluteTarget, version, manifestUrl);

    writeUpdateStatus(absoluteTarget, {
      ...applyState,
      state: "restart-required",
      completedAt: new Date().toISOString(),
      message: `Cabinet ${version} is installed. Restart Cabinet to finish the update.`,
      log: [...applyState.log, "Dependencies installed", "Update complete; restart required"],
    });

    success(`Cabinet ${version} installed. Restart Cabinet to finish the update.`);
    if (backupPath) {
      console.log(`Backup: ${backupPath}`);
    }
  } catch (upgradeError) {
    writeUpdateStatus(absoluteTarget, {
      state: "failed",
      startedAt: backupState.startedAt,
      completedAt: new Date().toISOString(),
      currentVersion: backupState.currentVersion,
      targetVersion: version,
      installKind: "source-managed",
      backupPath: backupPath || undefined,
      message: "Cabinet update failed.",
      error: String(upgradeError instanceof Error ? upgradeError.message : upgradeError),
      log: [
        ...(backupState.log || []),
        backupPath ? `Backup created at ${backupPath}` : "Backup did not complete",
        `Failure: ${String(upgradeError instanceof Error ? upgradeError.message : upgradeError)}`,
      ],
    });
    throw upgradeError;
  } finally {
    cleanup();
  }
}

function safeReadCurrentVersion(targetDir) {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(targetDir, "package.json"), "utf8")
    );
    return packageJson.version || undefined;
  } catch {
    return undefined;
  }
}

async function main() {
  if (command === "help" || command === "--help") {
    console.log(`
  create-cabinet - Create or upgrade a Cabinet project

  Usage:
    npx create-cabinet [directory]                 Create a new managed project
    npx create-cabinet init [directory]            Create a new managed project
    npx create-cabinet upgrade --target <dir>      Upgrade an existing managed project
    npx create-cabinet help                        Show this help

  Options:
    --version <x.y.z>      Release version to install
    --tarball-url <url>    Override the release tarball URL
    --manifest-url <url>   Persist the manifest URL for future checks
    --target <dir>         Project directory for upgrade
  `);
    return;
  }

  const version = readFlag("version", DEFAULT_VERSION);
  const tarballUrl = readFlag("tarball-url", defaultTarballUrl(version));
  const manifestUrl = readFlag(
    "manifest-url",
    "https://github.com/hilash/cabinet/releases/latest/download/cabinet-release.json"
  );

  if (command === "init") {
    const targetDir = dirArg || DIR;
    await initProject({
      targetDir,
      version,
      tarballUrl,
      manifestUrl,
    });
    return;
  }

  if (command === "upgrade") {
    const targetDir = readFlag("target", dirArg || process.cwd());
    await upgradeProject({
      targetDir,
      version,
      tarballUrl,
      manifestUrl,
    });
    return;
  }

  error(`Unknown command: ${command}. Run "create-cabinet help" for usage.`);
}

main().catch((caughtError) => {
  error(caughtError instanceof Error ? caughtError.message : String(caughtError));
});
