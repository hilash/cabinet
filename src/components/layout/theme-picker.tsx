"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun, Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  THEMES,
  applyTheme,
  getStoredThemeName,
  storeThemeName,
  type ThemeDefinition,
} from "@/lib/themes";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCustomTheme, setActiveCustomTheme] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Load Google Fonts for all themes via <link> injected into <head>
    if (!document.getElementById("theme-fonts-link")) {
      const link = document.createElement("link");
      link.id = "theme-fonts-link";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Bricolage+Grotesque:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Baskerville:wght@400;700&family=Merriweather+Sans:wght@400;500;600;700&family=Montserrat:wght@400;600;700&family=Nunito:wght@400;500;600;700&family=Orbitron:wght@400;600;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Rubik:wght@400;500;600;700&family=Sora:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Spectral:wght@400;600;700&family=Syne:wght@400;600;700&family=Unbounded:wght@400;600;700&display=swap";
      document.head.appendChild(link);
    }

    // Restore custom theme
    const stored = getStoredThemeName();
    if (stored) {
      const themeDef = THEMES.find((t) => t.name === stored);
      if (themeDef) {
        applyTheme(themeDef);
        setActiveCustomTheme(stored);
      }
    }
  }, []);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  const handleClick = () => {
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuOpen((prev) => !prev);
  };

  const selectTheme = (themeDef: ThemeDefinition) => {
    applyTheme(themeDef);
    setActiveCustomTheme(themeDef.name);
    storeThemeName(themeDef.name);
    setTheme(themeDef.type);
    setMenuOpen(false);
  };

  const selectDefault = (mode: "dark" | "light") => {
    applyTheme(null);
    setActiveCustomTheme(null);
    storeThemeName(null);
    setTheme(mode);
    setMenuOpen(false);
  };

  const darkThemes = THEMES.filter((t) => t.type === "dark");
  const lightThemes = THEMES.filter((t) => t.type === "light");

  const menu = menuOpen && mounted
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed w-56 rounded-lg border border-border bg-popover shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto"
          style={{
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 99999,
          }}
        >
          {/* Default themes */}
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Default
          </div>
          <button
            onClick={() => selectDefault("light")}
            className={cn(
              "flex items-center gap-3 w-full px-2 py-1.5 rounded-md text-[12px] transition-colors cursor-pointer",
              !activeCustomTheme && theme === "light"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Sun className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Light</span>
            {!activeCustomTheme && theme === "light" && (
              <Check className="h-3 w-3 text-primary shrink-0" />
            )}
          </button>
          <button
            onClick={() => selectDefault("dark")}
            className={cn(
              "flex items-center gap-3 w-full px-2 py-1.5 rounded-md text-[12px] transition-colors cursor-pointer",
              !activeCustomTheme && theme === "dark"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Moon className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Dark</span>
            {!activeCustomTheme && theme === "dark" && (
              <Check className="h-3 w-3 text-primary shrink-0" />
            )}
          </button>

          <div className="my-1 border-t border-border/50" />

          {/* Dark themes */}
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Dark Themes
          </div>
          {darkThemes.map((t) => (
            <button
              key={t.name}
              onClick={() => selectTheme(t)}
              className={cn(
                "flex items-center gap-3 w-full px-2 py-1.5 rounded-md text-[12px] transition-colors cursor-pointer",
                activeCustomTheme === t.name
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <div
                className="h-3.5 w-3.5 rounded-full shrink-0 border border-[#ffffff20]"
                style={{ backgroundColor: t.accent }}
              />
              <span
                className="flex-1 text-left font-semibold text-[13px]"
                style={{ fontFamily: t.headingFont || t.font }}
              >
                {t.label}
              </span>
              {activeCustomTheme === t.name && (
                <Check className="h-3 w-3 text-primary shrink-0" />
              )}
            </button>
          ))}

          <div className="my-1 border-t border-border/50" />

          {/* Light themes */}
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Light Themes
          </div>
          {lightThemes.map((t) => (
            <button
              key={t.name}
              onClick={() => selectTheme(t)}
              className={cn(
                "flex items-center gap-3 w-full px-2 py-1.5 rounded-md text-[12px] transition-colors cursor-pointer",
                activeCustomTheme === t.name
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <div
                className="h-3.5 w-3.5 rounded-full shrink-0 border border-[#00000020]"
                style={{ backgroundColor: t.accent }}
              />
              <span
                className="flex-1 text-left font-semibold text-[13px]"
                style={{ fontFamily: t.headingFont || t.font }}
              >
                {t.label}
              </span>
              {activeCustomTheme === t.name && (
                <Check className="h-3 w-3 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleClick}
      >
        {activeCustomTheme ? (
          <Palette className="h-4 w-4" />
        ) : (
          <>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </>
        )}
      </Button>
      {menu}
    </>
  );
}
