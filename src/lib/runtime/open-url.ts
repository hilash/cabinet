"use client";

function getBridge() {
  return (window as unknown as { CabinetDesktop?: { runtime?: "electron" } })
    .CabinetDesktop ?? {};
}

export function openUrlInAppropriateContext(
  url: string,
  openInBrowseMode: (url: string) => void
): void {
  const bridge = getBridge();
  const isElectron = bridge.runtime === "electron";

  if (isElectron) {
    openInBrowseMode(url);
  } else {
    window.open(url, "_blank");
  }
}
