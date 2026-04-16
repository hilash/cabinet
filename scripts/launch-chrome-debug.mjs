import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawn } from "child_process";

const appUrl = process.argv[2] || "http://localhost:3000";
const debugPort = process.env.DEBUG_PORT || "9222";
const versionEndpoint = `http://127.0.0.1:${debugPort}/json/version`;
const listEndpoint = `http://127.0.0.1:${debugPort}/json/list`;

function browserCandidates() {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

    return [
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFiles, "Chromium", "Application", "chrome.exe"),
      path.join(programFilesX86, "Chromium", "Application", "chrome.exe"),
      "chrome",
      "chrome.exe",
      "msedge",
      "msedge.exe",
    ];
  }

  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "google-chrome",
      "google-chrome-stable",
      "chromium",
      "chromium-browser",
    ];
  }

  return [
    "google-chrome",
    "google-chrome-stable",
    "chrome",
    "chromium",
    "chromium-browser",
    "microsoft-edge",
  ];
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findBrowser() {
  for (const candidate of browserCandidates()) {
    if (candidate.includes(path.sep) || candidate.includes("/")) {
      if (await pathExists(candidate)) {
        return candidate;
      }
      continue;
    }

    try {
      const child = spawn(candidate, ["--version"], {
        stdio: "ignore",
      });
      const result = await new Promise((resolve) => {
        child.on("error", () => resolve(false));
        child.on("exit", (code) => resolve(code === 0));
      });
      if (result) {
        return candidate;
      }
    } catch {
      // Keep trying.
    }
  }

  return null;
}

async function waitForDevTools(timeoutMs = 10_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(versionEndpoint);
      if (response.ok) {
        return true;
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return false;
}

const browser = await findBrowser();
if (!browser) {
  console.error("No supported Chrome/Chromium browser was found.");
  process.exit(1);
}

const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "cabinet-chrome-debug-"));

console.log(`Launching ${browser}`);
console.log(`App URL: ${appUrl}`);
console.log(`Temporary profile: ${profileDir}`);

const args = [
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  appUrl,
];

const child = spawn(browser, args, {
  detached: true,
  stdio: "ignore",
});
child.unref();

if (!(await waitForDevTools())) {
  console.error(
    `Chrome was launched, but the DevTools endpoint did not come up on port ${debugPort} in time.`
  );
  process.exit(1);
}

console.log("DevTools ready.");
console.log(versionEndpoint);
console.log(listEndpoint);

try {
  const response = await fetch(listEndpoint);
  const body = await response.text();
  console.log(body);
} catch {
  // Ignore list fetch failures after the main endpoint is up.
}
