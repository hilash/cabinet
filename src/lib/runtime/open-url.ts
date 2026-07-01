"use client";

interface CabinetDesktopBridge {
  runtime?: "electron";
  openLocalFile?: (path: string) => Promise<{ ok: boolean; error?: string }>;
  openExternal?: (url: string) => Promise<{ ok: boolean; error?: string }>;
}

function getBridge(): CabinetDesktopBridge {
  return (window as unknown as { CabinetDesktop?: CabinetDesktopBridge })
    .CabinetDesktop ?? {};
}

export function openUrlInAppropriateContext(
  url: string,
  openInBrowseMode: (url: string) => void
): void {
  const bridge = getBridge();
  const isElectron = bridge.runtime === "electron";

  // file:// URLs can't be loaded in a browser view or window.open —
  // Electron blocks them. Use shell.openPath to open with the OS default app.
  if (url.startsWith("file://")) {
    const rawPath = url.slice("file://".length);
    // decodeURIComponent throws on malformed percent-encoding — fall back to the
    // raw path instead of crashing the click handler.
    let filePath: string;
    try {
      filePath = decodeURIComponent(rawPath);
    } catch {
      filePath = rawPath;
    }
    if (isElectron && bridge.openLocalFile) {
      void bridge.openLocalFile(filePath);
      return;
    }
    // In browser mode, there's no way to open local files — show a toast
    // with the file path and a "Copy path" action so the user can open it
    // manually in Finder/File Explorer.
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
    return;
  }

  if (isElectron) {
    openInBrowseMode(url);
  } else {
    // noopener,noreferrer prevents the opened page from reaching back via
    // window.opener and navigating/altering this app.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Force an http(s) URL into the user's SYSTEM default browser, bypassing the
 * in-app browse view. Use this for OAuth sign-in links: the embedded browser
 * doesn't carry the user's provider session, and providers like Google/Slack
 * often refuse to authorize inside a webview. In the web build there's no
 * in-app browser anyway, so this is just a normal new-tab open.
 */
export function openExternalUrl(url: string): void {
  let externalUrl: URL;
  try {
    externalUrl = new URL(url);
  } catch {
    return;
  }
  // Guard both paths, not just the Electron bridge — the web build (or a
  // missing bridge) falls through to window.open, which would otherwise let a
  // custom protocol handler fire straight from an "OAuth" link.
  if (externalUrl.protocol !== "http:" && externalUrl.protocol !== "https:") {
    return;
  }

  const bridge = getBridge();
  if (bridge.runtime === "electron" && bridge.openExternal) {
    void bridge.openExternal(externalUrl.toString());
    return;
  }
  window.open(externalUrl.toString(), "_blank", "noopener,noreferrer");
}
