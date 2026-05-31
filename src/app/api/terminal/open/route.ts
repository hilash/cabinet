import { NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST() {
  const home = process.env.HOME || "~";

  try {
    if (process.platform === "darwin") {
      exec(`open -a Terminal "${home}"`);
    } else if (process.platform === "win32") {
      exec(`start cmd /K "cd /d ${home}"`);
    } else {
      // Linux: try common terminal emulators
      exec(
        `x-terminal-emulator --working-directory="${home}" 2>/dev/null || gnome-terminal --working-directory="${home}" 2>/dev/null || xterm -e "cd ${home} && $SHELL" &`
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
