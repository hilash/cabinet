import { NextResponse } from "next/server";
import { exec } from "child_process";
import { hasOptaleCapability } from "@/lib/optale/capabilities";
import { restrictedCustomerModeResponse } from "@/lib/optale/restricted-customer-mode";

export async function POST() {
  if (!hasOptaleCapability("terminal.open")) {
    return restrictedCustomerModeResponse(
      "terminal.open",
      "Opening a local terminal is operator-only in the partner-safe desktop profile.",
    );
  }

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
