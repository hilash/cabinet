/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge } = require("electron");
const fs = require("fs");
const path = require("path");

// Read PAT from file written by main process during multica-server startup.
let multicaPAT = null;
try {
  const patFile = path.join(
    process.env.APPDATA || path.join(require("os").homedir(), "Library", "Application Support"),
    "cabinet",
    "multica-pat.json"
  );
  if (fs.existsSync(patFile)) {
    const data = JSON.parse(fs.readFileSync(patFile, "utf-8"));
    multicaPAT = data.token || null;
  }
} catch {}

contextBridge.exposeInMainWorld("CabinetDesktop", {
  runtime: "electron",
  multicaWsUrl: process.env.MULTICA_WS_URL || null,
  multicaPAT,
});
