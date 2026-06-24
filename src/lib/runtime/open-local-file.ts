"use client";

interface CabinetDesktopBridge {
  runtime?: "electron";
  openLocalFile?: (path: string) => Promise<{ ok: boolean; error?: string }>;
}

function getBridge(): CabinetDesktopBridge {
  return (window as unknown as { CabinetDesktop?: CabinetDesktopBridge })
    .CabinetDesktop ?? {};
}

function dispatchOpenError(filePath: string, error?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("cabinet:toast", {
      detail: {
        kind: "error",
        message: error
          ? `Couldn't open file: ${error}`
          : `Couldn't open file: ${filePath}`,
      },
    })
  );
}

/**
 * Open a `file://` URL.
 *
 * file:// URLs can't be loaded in a browser view or window.open — Electron
 * blocks them. In the desktop app we use shell.openPath (via the IPC bridge)
 * to open the file with the OS default application (e.g. Preview for PDFs).
 *
 * In browser mode there's no way to open a local file, so we surface a toast
 * with the path and a "Copy path" action instead.
 */
export function openLocalFileUrl(url: string): void {
  const filePath = decodeURIComponent(url.slice("file://".length));
  const bridge = getBridge();

  if (bridge.runtime === "electron" && bridge.openLocalFile) {
    // Surface failures (missing file, permissions) as a toast instead of
    // silently swallowing the bridge result.
    void bridge
      .openLocalFile(filePath)
      .then((result) => {
        if (!result?.ok) {
          dispatchOpenError(filePath, result?.error);
        }
      })
      .catch((err) => {
        dispatchOpenError(filePath, err instanceof Error ? err.message : String(err));
      });
    return;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cabinet:toast", {
        detail: {
          kind: "info",
          message: `Local file: ${filePath}`,
          actionLabel: "Copy path",
          onAction: () => {
            navigator.clipboard?.writeText(filePath).catch(() => {});
          },
        },
      })
    );
  }
}
