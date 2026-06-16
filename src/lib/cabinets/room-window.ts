import { buildPath } from "@/lib/navigation/route-scheme";

/**
 * Multi-window support. A window's scope lives entirely in the URL path
 * (clean-path routing, see `useRoute`), so opening a room/cabinet in its own
 * window is just "open the app at this path". In Electron we ask the main
 * process to spawn a real BrowserWindow; on the web we open a new tab.
 */

/** Clean URL path for a room/cabinet (`/room/<path>`; root → `/`). */
export function buildRoomPath(cabinetPath: string): string {
  return buildPath({ type: "cabinet", cabinetPath: cabinetPath || undefined }, null);
}

interface CabinetDesktopApi {
  openWindow?: (path: string) => unknown;
}

function desktopApi(): CabinetDesktopApi | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { CabinetDesktop?: CabinetDesktopApi })
    .CabinetDesktop;
}

/** True when running inside the Electron desktop shell. */
export function isDesktop(): boolean {
  return !!desktopApi();
}

/**
 * Open the given room/cabinet in a new window.
 * - Electron: spawns a native BrowserWindow at the same app origin + path.
 * - Web: opens a new browser window/tab at the current origin + path.
 */
export function openRoomWindow(cabinetPath: string): void {
  if (typeof window === "undefined") return;
  const path = buildRoomPath(cabinetPath);

  const desktop = desktopApi();
  if (desktop?.openWindow) {
    desktop.openWindow(path);
    return;
  }

  window.open(`${window.location.origin}${path}`, "_blank", "noopener");
}
