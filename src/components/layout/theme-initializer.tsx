"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  THEMES,
  applyTheme,
  getStoredThemeName,
  storeThemeName,
} from "@/lib/themes";

/**
 * Mounts once at the app root to ensure the custom theme CSS vars
 * are applied before any UI renders. This prevents flashes of the
 * wrong theme when navigating between panels.
 */
export function ThemeInitializer() {
  const { setTheme } = useTheme();

  useEffect(() => {
    // Load Google Fonts for all themes
    if (!document.getElementById("theme-fonts-link")) {
      const link = document.createElement("link");
      link.id = "theme-fonts-link";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Bricolage+Grotesque:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Instrument+Serif&family=Libre+Baskerville:wght@400;700&family=Merriweather+Sans:wght@400;500;600;700&family=Montserrat:wght@400;600;700&family=Nunito:wght@400;500;600;700&family=Orbitron:wght@400;600;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Rubik:wght@400;500;600;700&family=Sora:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Spectral:wght@400;600;700&family=Syne:wght@400;600;700&family=Unbounded:wght@400;600;700&display=swap";
      document.head.appendChild(link);
    }

    // Restore or default to Paper/Cabinet theme
    const stored = getStoredThemeName();
    const themeName = stored || "paper";
    const themeDef = THEMES.find((t) => t.name === themeName);
    if (themeDef) {
      applyTheme(themeDef);
      setTheme(themeDef.type);
      if (!stored) {
        storeThemeName(themeName);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
