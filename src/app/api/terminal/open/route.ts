import { NextResponse } from "next/server";
import { exec } from "child_process";
import os from "os";

export async function POST() {
  const home = os.homedir();

  try {
    if (process.platform === "darwin") {
      exec(`open -a Terminal "${home}"`);
    } else if (process.platform === "win32") {
      exec(
        `powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoExit','-Command','Set-Location -LiteralPath ''${home.replace(/'/g, "''")}'''"`
      );
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
