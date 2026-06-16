import path from "path";
import fs from "fs";

export function getNvmNodeBin(): string | null {
  const nvmDir =
    process.env.NVM_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || "", ".nvm");
  try {
    const defaultAlias = fs.readFileSync(path.join(nvmDir, "alias", "default"), "utf8").trim();
    const versionDirs = fs.readdirSync(path.join(nvmDir, "versions", "node"));
    const match = versionDirs.find((d) => d.startsWith(`v${defaultAlias}`) || d === defaultAlias);
    if (match) return path.join(nvmDir, "versions", "node", match, "bin");
  } catch {}
  try {
    const versionDirs = fs.readdirSync(path.join(nvmDir, "versions", "node")).sort().reverse();
    if (versionDirs.length > 0) return path.join(nvmDir, "versions", "node", versionDirs[0], "bin");
  } catch {}
  return null;
}
