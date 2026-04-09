"use client";

import { useEffect } from "react";

export function ElectronDetector() {
  useEffect(() => {
    if ((window as { CabinetDesktop?: boolean }).CabinetDesktop) {
      document.documentElement.classList.add("electron-desktop");
    }
  }, []);
  return null;
}
