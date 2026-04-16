import fs from "fs/promises";
import path from "path";
import { execFileSync } from "child_process";

const projectRoot = process.cwd();
const nodePtyDir = path.join(projectRoot, "node_modules", "node-pty");

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function chmodIfPresent(targetPath, mode) {
  if (!(await pathExists(targetPath))) return;
  try {
    await fs.chmod(targetPath, mode);
  } catch {
    // Ignore permission normalization failures during install.
  }
}

async function main() {
  if (!(await pathExists(nodePtyDir))) {
    return;
  }

  if (process.platform !== "darwin") {
    return;
  }

  const prebuildsRoot = path.join(nodePtyDir, "prebuilds");
  if (!(await pathExists(prebuildsRoot))) {
    return;
  }

  const entries = await fs.readdir(prebuildsRoot, { withFileTypes: true });
  const darwinPrebuilds = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("darwin-"))
    .map((entry) => path.join(prebuildsRoot, entry.name));

  for (const prebuildDir of darwinPrebuilds) {
    const spawnHelperPath = path.join(prebuildDir, "spawn-helper");
    const ptyBinaryPath = path.join(prebuildDir, "pty.node");

    await chmodIfPresent(spawnHelperPath, 0o755);

    for (const targetPath of [spawnHelperPath, ptyBinaryPath]) {
      if (!(await pathExists(targetPath))) continue;
      try {
        execFileSync("xattr", ["-d", "com.apple.provenance", targetPath], {
          stdio: "ignore",
        });
      } catch {
        // Ignore missing xattr entries and environments without xattr.
      }
    }
  }
}

await main();
