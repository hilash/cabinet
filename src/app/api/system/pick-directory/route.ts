import { spawn } from "child_process";
import {
  HttpError,
  createHandler,
} from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

function getPickerCommand(): { command: string; args: string[] } {
  switch (process.platform) {
    case "darwin":
      return {
        command: "osascript",
        args: [
          "-e",
          'set chosenFolder to choose folder with prompt "Select local repository folder"',
          "-e",
          "POSIX path of chosenFolder",
        ],
      };
    case "win32":
      return {
        command: "powershell",
        args: [
          "-NoProfile",
          "-Command",
          "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = 'Select local repository folder'; $dialog.UseDescriptionForTitle = $true; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }",
        ],
      };
    default:
      return {
        command: "sh",
        args: [
          "-lc",
          "if command -v zenity >/dev/null 2>&1; then zenity --file-selection --directory --title='Select local repository folder'; elif command -v kdialog >/dev/null 2>&1; then kdialog --getexistingdirectory ~ 'Select local repository folder'; else exit 127; fi",
        ],
      };
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const POST = createHandler({
  handler: async () => {
    try {
      const { command, args } = getPickerCommand();

      const selectedPath = await new Promise<string>((resolve, reject) => {
        const proc = spawn(command, args, {
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });

        proc.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        proc.on("error", reject);

        proc.on("close", (code) => {
          const trimmed = stdout.trim();

          if (code === 0) {
            resolve(trimmed);
            return;
          }

          const combined = `${stdout}\n${stderr}`.toLowerCase();
          if (
            combined.includes("user canceled") ||
            combined.includes("user cancelled") ||
            combined.includes("error number -128")
          ) {
            resolve("");
            return;
          }

          reject(new Error(stderr.trim() || `Command exited with code ${code}`));
        });
      });

      if (!selectedPath) {
        return { cancelled: true };
      }

      return { ok: true, path: selectedPath };
    } catch (error) {
      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
