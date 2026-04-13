import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function canLoadMacosAlias() {
  try {
    require("macos-alias");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("NODE_MODULE_VERSION") ||
      message.includes("volume.node") ||
      message.includes("Cannot find module")
    ) {
      return false;
    }

    throw error;
  }
}

if (process.platform !== "darwin") {
  process.exit(0);
}

if (canLoadMacosAlias()) {
  process.exit(0);
}

console.log("macos-alias is incompatible with the current Node ABI, rebuilding...");
execFileSync("npm", ["rebuild", "macos-alias"], { stdio: "inherit" });

if (!canLoadMacosAlias()) {
  throw new Error("macos-alias is still incompatible after rebuild");
}

console.log("macos-alias rebuilt successfully.");
