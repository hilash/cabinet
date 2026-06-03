import { NextRequest, NextResponse } from "next/server";
import { listSubdirectories, detectDriveDesktop } from "@/lib/google-drive/detect-desktop";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const detection = await detectDriveDesktop();
    if (!detection.mountPath) {
      return NextResponse.json({ error: "Google Drive for Desktop not detected" }, { status: 404 });
    }

    // Resolve the Drive root's real path once — used as the containment boundary.
    let realMountPath: string;
    try {
      realMountPath = await fs.realpath(detection.mountPath);
    } catch {
      return NextResponse.json({ error: "Google Drive for Desktop not detected" }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const rawPath = searchParams.get("path");

    // Default to the Drive root when no path is supplied.
    const requestedPath = rawPath ?? detection.mountPath;

    // Resolve symlinks and normalize before the containment check.
    let realRequestedPath: string;
    try {
      realRequestedPath = await fs.realpath(path.normalize(requestedPath));
    } catch {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }

    // Enforce containment: requested path must be the mount root or inside it.
    const isContained =
      realRequestedPath === realMountPath ||
      realRequestedPath.startsWith(realMountPath + path.sep);

    if (!isContained) {
      return NextResponse.json({ error: "Path is outside the Google Drive mount" }, { status: 403 });
    }

    const dirs = await listSubdirectories(realRequestedPath);
    return NextResponse.json({ path: realRequestedPath, dirs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
