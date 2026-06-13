import fs from "fs/promises";
import path from "path";

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(fromPath, toPath) {
  if (!(await pathExists(fromPath))) {
    return;
  }

  await fs.rm(toPath, { recursive: true, force: true });
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.cp(fromPath, toPath, { recursive: true, force: true });
}

async function main() {
  if (!(await pathExists(standaloneDir))) {
    throw new Error("Expected .next/standalone to exist. Run `npm run build` first.");
  }

  await Promise.all([
    copyDirectory(publicDir, path.join(standaloneDir, "public")),
    copyDirectory(staticDir, path.join(standaloneDir, ".next", "static")),
  ]);
}

await main();
