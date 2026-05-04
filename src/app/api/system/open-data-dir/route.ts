import fs from "fs";
import os from "os";
import { spawn } from "child_process";
import path from "path";
import { NextResponse } from "next/server";
import {
  restrictedCapabilityDenial,
  restrictedModeDenialResponse,
} from "@/lib/optale/restricted-customer-mode";

export const dynamic = "force-dynamic";

function getOpenCommand(targetPath: string, reveal?: boolean): { command: string; args: string[] } {
  switch (process.platform) {
    case "darwin":
      return reveal
        ? { command: "open", args: ["-R", targetPath] }
        : { command: "open", args: [targetPath] };
    case "win32":
      return reveal
        ? { command: "explorer.exe", args: ["/select,", targetPath] }
        : { command: "explorer.exe", args: [targetPath] };
    default:
      return { command: "xdg-open", args: [targetPath] };
  }
}

function defaultElectronDataDir(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Cabinet");
  }
  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      "Cabinet"
    );
  }
  return path.join(
    process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"),
    "cabinet"
  );
}

function readPersistedDataDir(): string | null {
  try {
    const configPath = path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      ".cabinet-install.json"
    );
    const raw = fs.readFileSync(
      /*turbopackIgnore: true*/ configPath,
      "utf-8"
    );
    const json = JSON.parse(raw) as { dataDir?: unknown };
    return typeof json.dataDir === "string" && json.dataDir.trim()
      ? path.resolve(/*turbopackIgnore: true*/ json.dataDir.trim())
      : null;
  } catch {
    return null;
  }
}

function getOpenDataDir(): string {
  const configured = process.env.CABINET_DATA_DIR?.trim();
  if (configured) return path.resolve(/*turbopackIgnore: true*/ configured);

  const persisted = readPersistedDataDir();
  if (persisted) return persisted;

  if (process.env.CABINET_RUNTIME === "electron") {
    return defaultElectronDataDir();
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
}

export async function POST(request: Request) {
  const restricted = restrictedModeDenialResponse(
    restrictedCapabilityDenial("diagnostics.raw"),
  );
  if (restricted) return restricted;

  try {
    const dataDir = path.resolve(/*turbopackIgnore: true*/ getOpenDataDir());
    const dataDirWithSep = dataDir.endsWith(path.sep)
      ? dataDir
      : `${dataDir}${path.sep}`;
    let targetPath = dataDir;

    // Optional subpath to open a specific item
    const body = await request.json().catch(() => null);
    if (body?.subpath) {
      const resolved = path.resolve(
        /*turbopackIgnore: true*/ dataDir,
        body.subpath
      );
      if (resolved !== dataDir && !resolved.startsWith(dataDirWithSep)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      targetPath = resolved;
    }

    // Reveal in Finder when opening a specific subpath
    const { command, args } = getOpenCommand(targetPath, !!body?.subpath);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(/*turbopackIgnore: true*/ command, args, {
        stdio: "ignore",
      });

      proc.on("error", (error) => {
        reject(error);
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`Command exited with code ${code}`));
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
