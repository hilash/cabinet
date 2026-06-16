import { NextResponse } from "next/server";
import { exec } from "child_process";
import os from "os";

export async function POST() {
  // os.homedir() resolves USERPROFILE on Windows; `process.env.HOME` is usually
  // unset there, so the old `HOME || "~"` produced the literal "~" and `cd /d ~`
  // failed (issue #94 §3).
  const home = os.homedir();

  try {
    if (process.platform === "darwin") {
      exec(`open -a Terminal "${home}"`);
    } else if (process.platform === "win32") {
      // `start` is a cmd builtin (exec uses cmd.exe on Windows). The empty "" is the
      // window title so `start` doesn't treat the path as one; the path is quoted to
      // tolerate spaces.
      exec(`start "" cmd /K cd /d "${home}"`);
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
