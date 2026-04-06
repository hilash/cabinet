/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const net = require("net");
const { spawn } = require("child_process");
const { app, BrowserWindow, dialog, autoUpdater } = require("electron");
const { updateElectronApp } = require("update-electron-app");

if (require("electron-squirrel-startup")) {
  app.quit();
}

const isDev = !app.isPackaged;
const managedDataDir = path.join(app.getPath("userData"), "cabinet-data");
const updateStatusPath = path.join(managedDataDir, ".cabinet", "update-status.json");
let mainWindow = null;
let backendChildren = [];

function writeUpdateStatus(status) {
  fs.mkdirSync(path.dirname(updateStatusPath), { recursive: true });
  fs.writeFileSync(updateStatusPath, JSON.stringify(status, null, 2), "utf8");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
          return;
        }
        reject(new Error("Could not allocate a loopback port."));
      });
    });
    server.on("error", reject);
  });
}

async function waitForHealth(url, timeoutMs = 45_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error(`Timed out waiting for Cabinet at ${url}`);
}

function spawnBackend(command, args, env) {
  const child = spawn(command, args, {
    env,
    stdio: "inherit",
  });
  backendChildren.push(child);
  return child;
}

function packagedPath(...parts) {
  return path.join(process.resourcesPath, ...parts);
}

async function maybeImportExistingData() {
  fs.mkdirSync(managedDataDir, { recursive: true });
  const visibleEntries = fs
    .readdirSync(managedDataDir, { withFileTypes: true })
    .filter((entry) => entry.name !== ".cabinet");

  if (visibleEntries.length > 0) {
    return;
  }

  const prompt = await dialog.showMessageBox({
    type: "question",
    buttons: ["Start fresh", "Import existing data", "Later"],
    defaultId: 0,
    cancelId: 2,
    title: "Set up Cabinet data",
    message: "Choose how this Electron app should initialize its managed data directory.",
    detail:
      "Cabinet stores desktop data outside the app bundle so updates never replace user content.",
  });

  if (prompt.response !== 1) {
    return;
  }

  const selection = await dialog.showOpenDialog({
    title: "Pick an existing Cabinet data directory",
    properties: ["openDirectory"],
  });

  if (selection.canceled || selection.filePaths.length === 0) {
    return;
  }

  fs.cpSync(selection.filePaths[0], managedDataDir, { recursive: true, force: true });
}

async function startEmbeddedCabinet() {
  if (isDev) {
    return {
      appUrl: process.env.ELECTRON_START_URL || "http://127.0.0.1:3000",
    };
  }

  await maybeImportExistingData();

  const [appPort, daemonPort] = await Promise.all([getFreePort(), getFreePort()]);
  const appOrigin = `http://127.0.0.1:${appPort}`;
  const daemonOrigin = `http://127.0.0.1:${daemonPort}`;
  const daemonWsOrigin = `ws://127.0.0.1:${daemonPort}`;

  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(appPort),
    CABINET_RUNTIME: "electron",
    CABINET_INSTALL_KIND: "electron-macos",
    CABINET_DATA_DIR: managedDataDir,
    CABINET_APP_PORT: String(appPort),
    CABINET_DAEMON_PORT: String(daemonPort),
    CABINET_APP_ORIGIN: appOrigin,
    CABINET_DAEMON_URL: daemonOrigin,
    CABINET_PUBLIC_DAEMON_ORIGIN: daemonWsOrigin,
  };

  const serverEntry = packagedPath(".next", "standalone", "server.js");
  const daemonEntry = packagedPath("server", "cabinet-daemon.ts");
  const tsxEntry = packagedPath("node_modules", "tsx", "dist", "cli.mjs");

  spawnBackend(process.execPath, [serverEntry], env);
  spawnBackend(process.execPath, [tsxEntry, daemonEntry], env);

  await waitForHealth(`${appOrigin}/api/health`);
  return { appUrl: appOrigin };
}

function configureAutoUpdates() {
  if (process.platform !== "darwin") {
    return;
  }

  try {
    updateElectronApp({
      repo: "hilash/cabinet",
      updateInterval: "4 hours",
      notifyUser: false,
    });
  } catch (error) {
    writeUpdateStatus({
      state: "failed",
      completedAt: new Date().toISOString(),
      installKind: "electron-macos",
      message: "Electron update setup failed.",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  autoUpdater.on("checking-for-update", () => {
    writeUpdateStatus({
      state: "checking",
      startedAt: new Date().toISOString(),
      installKind: "electron-macos",
      message: "Checking for a newer Cabinet desktop release...",
    });
  });

  autoUpdater.on("update-available", () => {
    writeUpdateStatus({
      state: "available",
      startedAt: new Date().toISOString(),
      installKind: "electron-macos",
      message: "A new Cabinet desktop release is downloading in the background.",
    });
  });

  autoUpdater.on("update-not-available", () => {
    writeUpdateStatus({
      state: "idle",
      completedAt: new Date().toISOString(),
      installKind: "electron-macos",
      message: "Cabinet desktop is up to date.",
    });
  });

  autoUpdater.on("error", (error) => {
    writeUpdateStatus({
      state: "failed",
      completedAt: new Date().toISOString(),
      installKind: "electron-macos",
      message: "Cabinet desktop update failed.",
      error: error instanceof Error ? error.message : String(error),
    });
  });

  autoUpdater.on("update-downloaded", async () => {
    writeUpdateStatus({
      state: "restart-required",
      completedAt: new Date().toISOString(),
      installKind: "electron-macos",
      message: "Restart Cabinet to finish applying the desktop update.",
    });

    const prompt = await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Restart to update", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Cabinet update ready",
      message: "A new Cabinet desktop release is ready.",
      detail:
        "Your desktop data stays outside the app bundle, but keeping a copy is still recommended while Cabinet is moving fast.",
    });

    if (prompt.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
}

function cleanupBackends() {
  for (const child of backendChildren) {
    child.kill("SIGTERM");
  }
  backendChildren = [];
}

async function createWindow() {
  const runtime = await startEmbeddedCabinet();

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#111111",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  await mainWindow.loadURL(runtime.appUrl);
}

app.on("window-all-closed", () => {
  cleanupBackends();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  cleanupBackends();
});

app.whenReady().then(async () => {
  configureAutoUpdates();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});
