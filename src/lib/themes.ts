// Theme definitions for the multi-theme system
// Each theme defines CSS custom properties using OKLCh color space

export interface ThemeDefinition {
  name: string;
  label: string;
  type: "dark" | "light";
  font?: string; // Google Font for body text
  headingFont?: string; // Google Font for headings (h1-h4)
  accent: string; // preview color for the picker
  vars: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  // ─── CLAUDE THEME (signature) ───
  {
    name: "claude",
    label: "Claude",
    type: "dark",
    font: "'Space Grotesk', var(--font-sans)",
    headingFont: "'Playfair Display', Georgia, serif",
    accent: "#cc785c",
    vars: {
      "--background": "oklch(0.13 0.01 45)",
      "--foreground": "oklch(0.93 0.02 60)",
      "--card": "oklch(0.18 0.01 45)",
      "--card-foreground": "oklch(0.93 0.02 60)",
      "--popover": "oklch(0.18 0.01 45)",
      "--popover-foreground": "oklch(0.93 0.02 60)",
      "--primary": "oklch(0.72 0.12 45)",
      "--primary-foreground": "oklch(0.13 0.01 45)",
      "--secondary": "oklch(0.22 0.01 45)",
      "--secondary-foreground": "oklch(0.88 0.03 55)",
      "--muted": "oklch(0.22 0.01 45)",
      "--muted-foreground": "oklch(0.65 0.03 55)",
      "--accent": "oklch(0.25 0.02 45)",
      "--accent-foreground": "oklch(0.93 0.02 60)",
      "--destructive": "oklch(0.65 0.2 25)",
      "--border": "oklch(1 0 0 / 8%)",
      "--input": "oklch(1 0 0 / 12%)",
      "--ring": "oklch(0.72 0.12 45)",
      "--sidebar": "oklch(0.16 0.01 45)",
      "--sidebar-foreground": "oklch(0.88 0.02 55)",
      "--sidebar-primary": "oklch(0.72 0.12 45)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.22 0.01 45)",
      "--sidebar-accent-foreground": "oklch(0.88 0.02 55)",
      "--sidebar-border": "oklch(1 0 0 / 8%)",
      "--sidebar-ring": "oklch(0.5 0.05 45)",
    },
  },

  // ─── DEFAULT THEMES ───
  {
    name: "white",
    label: "White",
    type: "light",
    accent: "#737373",
    vars: {
      "--background": "oklch(1 0 0)",
      "--foreground": "oklch(0.15 0 0)",
      "--card": "oklch(0.99 0 0)",
      "--card-foreground": "oklch(0.15 0 0)",
      "--popover": "oklch(0.99 0 0)",
      "--popover-foreground": "oklch(0.15 0 0)",
      "--primary": "oklch(0.25 0 0)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.96 0 0)",
      "--secondary-foreground": "oklch(0.15 0 0)",
      "--muted": "oklch(0.96 0 0)",
      "--muted-foreground": "oklch(0.5 0 0)",
      "--accent": "oklch(0.96 0 0)",
      "--accent-foreground": "oklch(0.15 0 0)",
      "--destructive": "oklch(0.55 0.22 25)",
      "--border": "oklch(0.91 0 0)",
      "--input": "oklch(0.91 0 0)",
      "--ring": "oklch(0.4 0 0)",
      "--sidebar": "oklch(0.98 0 0)",
      "--sidebar-foreground": "oklch(0.15 0 0)",
      "--sidebar-primary": "oklch(0.25 0 0)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.95 0 0)",
      "--sidebar-accent-foreground": "oklch(0.15 0 0)",
      "--sidebar-border": "oklch(0.91 0 0)",
      "--sidebar-ring": "oklch(0.4 0 0)",
    },
  },
  {
    name: "black",
    label: "Black",
    type: "dark",
    accent: "#737373",
    vars: {
      "--background": "oklch(0.1 0 0)",
      "--foreground": "oklch(0.93 0 0)",
      "--card": "oklch(0.14 0 0)",
      "--card-foreground": "oklch(0.93 0 0)",
      "--popover": "oklch(0.14 0 0)",
      "--popover-foreground": "oklch(0.93 0 0)",
      "--primary": "oklch(0.93 0 0)",
      "--primary-foreground": "oklch(0.1 0 0)",
      "--secondary": "oklch(0.2 0 0)",
      "--secondary-foreground": "oklch(0.88 0 0)",
      "--muted": "oklch(0.2 0 0)",
      "--muted-foreground": "oklch(0.6 0 0)",
      "--accent": "oklch(0.22 0 0)",
      "--accent-foreground": "oklch(0.93 0 0)",
      "--destructive": "oklch(0.65 0.2 25)",
      "--border": "oklch(1 0 0 / 10%)",
      "--input": "oklch(1 0 0 / 12%)",
      "--ring": "oklch(0.6 0 0)",
      "--sidebar": "oklch(0.12 0 0)",
      "--sidebar-foreground": "oklch(0.88 0 0)",
      "--sidebar-primary": "oklch(0.93 0 0)",
      "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent": "oklch(0.18 0 0)",
      "--sidebar-accent-foreground": "oklch(0.88 0 0)",
      "--sidebar-border": "oklch(1 0 0 / 10%)",
      "--sidebar-ring": "oklch(0.5 0 0)",
    },
  },

  // ─── DARK THEMES ───
  {
    name: "midnight-ocean",
    label: "Midnight Ocean",
    type: "dark",
    font: "'DM Sans', var(--font-sans)",
    headingFont: "'Unbounded', var(--font-sans)",
    accent: "#5b8dee",
    vars: {
      "--background": "oklch(0.14 0.02 250)",
      "--foreground": "oklch(0.92 0.01 230)",
      "--card": "oklch(0.19 0.02 250)",
      "--card-foreground": "oklch(0.92 0.01 230)",
      "--popover": "oklch(0.19 0.02 250)",
      "--popover-foreground": "oklch(0.92 0.01 230)",
      "--primary": "oklch(0.7 0.15 250)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.22 0.02 250)",
      "--secondary-foreground": "oklch(0.88 0.01 230)",
      "--muted": "oklch(0.22 0.02 250)",
      "--muted-foreground": "oklch(0.62 0.04 240)",
      "--accent": "oklch(0.25 0.03 250)",
      "--accent-foreground": "oklch(0.92 0.01 230)",
      "--destructive": "oklch(0.65 0.2 25)",
      "--border": "oklch(0.7 0.1 250 / 12%)",
      "--input": "oklch(0.7 0.1 250 / 15%)",
      "--ring": "oklch(0.7 0.15 250)",
      "--sidebar": "oklch(0.16 0.02 250)",
      "--sidebar-foreground": "oklch(0.88 0.01 230)",
      "--sidebar-primary": "oklch(0.7 0.15 250)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.22 0.02 250)",
      "--sidebar-accent-foreground": "oklch(0.88 0.01 230)",
      "--sidebar-border": "oklch(0.7 0.1 250 / 12%)",
      "--sidebar-ring": "oklch(0.5 0.08 250)",
    },
  },
  {
    name: "aurora",
    label: "Aurora",
    type: "dark",
    font: "'Outfit', var(--font-sans)",
    headingFont: "'Syne', var(--font-sans)",
    accent: "#8b5cf6",
    vars: {
      "--background": "oklch(0.13 0.02 290)",
      "--foreground": "oklch(0.94 0.01 280)",
      "--card": "oklch(0.18 0.02 290)",
      "--card-foreground": "oklch(0.94 0.01 280)",
      "--popover": "oklch(0.18 0.02 290)",
      "--popover-foreground": "oklch(0.94 0.01 280)",
      "--primary": "oklch(0.65 0.2 290)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.22 0.03 290)",
      "--secondary-foreground": "oklch(0.88 0.01 280)",
      "--muted": "oklch(0.22 0.03 290)",
      "--muted-foreground": "oklch(0.6 0.06 280)",
      "--accent": "oklch(0.25 0.04 290)",
      "--accent-foreground": "oklch(0.94 0.01 280)",
      "--destructive": "oklch(0.65 0.2 25)",
      "--border": "oklch(0.65 0.15 290 / 12%)",
      "--input": "oklch(0.65 0.15 290 / 15%)",
      "--ring": "oklch(0.65 0.2 290)",
      "--sidebar": "oklch(0.15 0.02 290)",
      "--sidebar-foreground": "oklch(0.88 0.01 280)",
      "--sidebar-primary": "oklch(0.65 0.2 290)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.22 0.03 290)",
      "--sidebar-accent-foreground": "oklch(0.88 0.01 280)",
      "--sidebar-border": "oklch(0.65 0.15 290 / 12%)",
      "--sidebar-ring": "oklch(0.5 0.1 290)",
    },
  },
  {
    name: "ember",
    label: "Ember",
    type: "dark",
    font: "'Sora', var(--font-sans)",
    headingFont: "'Bricolage Grotesque', var(--font-sans)",
    accent: "#f97316",
    vars: {
      "--background": "oklch(0.14 0.01 30)",
      "--foreground": "oklch(0.93 0.02 50)",
      "--card": "oklch(0.19 0.02 30)",
      "--card-foreground": "oklch(0.93 0.02 50)",
      "--popover": "oklch(0.19 0.02 30)",
      "--popover-foreground": "oklch(0.93 0.02 50)",
      "--primary": "oklch(0.72 0.18 55)",
      "--primary-foreground": "oklch(0.13 0.01 30)",
      "--secondary": "oklch(0.23 0.02 30)",
      "--secondary-foreground": "oklch(0.88 0.02 50)",
      "--muted": "oklch(0.23 0.02 30)",
      "--muted-foreground": "oklch(0.62 0.04 40)",
      "--accent": "oklch(0.26 0.03 35)",
      "--accent-foreground": "oklch(0.93 0.02 50)",
      "--destructive": "oklch(0.65 0.22 25)",
      "--border": "oklch(0.72 0.12 45 / 10%)",
      "--input": "oklch(0.72 0.12 45 / 14%)",
      "--ring": "oklch(0.72 0.18 55)",
      "--sidebar": "oklch(0.16 0.01 30)",
      "--sidebar-foreground": "oklch(0.88 0.02 50)",
      "--sidebar-primary": "oklch(0.72 0.18 55)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.23 0.02 30)",
      "--sidebar-accent-foreground": "oklch(0.88 0.02 50)",
      "--sidebar-border": "oklch(0.72 0.12 45 / 10%)",
      "--sidebar-ring": "oklch(0.5 0.08 40)",
    },
  },
  {
    name: "forest",
    label: "Forest",
    type: "dark",
    font: "'Plus Jakarta Sans', var(--font-sans)",
    headingFont: "'Fraunces', Georgia, serif",
    accent: "#22c55e",
    vars: {
      "--background": "oklch(0.13 0.02 150)",
      "--foreground": "oklch(0.92 0.02 145)",
      "--card": "oklch(0.18 0.02 150)",
      "--card-foreground": "oklch(0.92 0.02 145)",
      "--popover": "oklch(0.18 0.02 150)",
      "--popover-foreground": "oklch(0.92 0.02 145)",
      "--primary": "oklch(0.7 0.18 150)",
      "--primary-foreground": "oklch(0.13 0.02 150)",
      "--secondary": "oklch(0.22 0.02 150)",
      "--secondary-foreground": "oklch(0.88 0.02 145)",
      "--muted": "oklch(0.22 0.02 150)",
      "--muted-foreground": "oklch(0.6 0.05 148)",
      "--accent": "oklch(0.25 0.03 150)",
      "--accent-foreground": "oklch(0.92 0.02 145)",
      "--destructive": "oklch(0.65 0.2 25)",
      "--border": "oklch(0.7 0.12 150 / 10%)",
      "--input": "oklch(0.7 0.12 150 / 14%)",
      "--ring": "oklch(0.7 0.18 150)",
      "--sidebar": "oklch(0.15 0.02 150)",
      "--sidebar-foreground": "oklch(0.88 0.02 145)",
      "--sidebar-primary": "oklch(0.7 0.18 150)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.22 0.02 150)",
      "--sidebar-accent-foreground": "oklch(0.88 0.02 145)",
      "--sidebar-border": "oklch(0.7 0.12 150 / 10%)",
      "--sidebar-ring": "oklch(0.5 0.08 150)",
    },
  },
  {
    name: "cyber",
    label: "Cyber",
    type: "dark",
    font: "'Space Mono', var(--font-mono)",
    headingFont: "'Orbitron', var(--font-mono)",
    accent: "#06b6d4",
    vars: {
      "--background": "oklch(0.1 0.01 200)",
      "--foreground": "oklch(0.88 0.08 185)",
      "--card": "oklch(0.15 0.01 200)",
      "--card-foreground": "oklch(0.88 0.08 185)",
      "--popover": "oklch(0.15 0.01 200)",
      "--popover-foreground": "oklch(0.88 0.08 185)",
      "--primary": "oklch(0.75 0.15 195)",
      "--primary-foreground": "oklch(0.1 0.01 200)",
      "--secondary": "oklch(0.18 0.01 200)",
      "--secondary-foreground": "oklch(0.82 0.06 190)",
      "--muted": "oklch(0.18 0.01 200)",
      "--muted-foreground": "oklch(0.55 0.06 195)",
      "--accent": "oklch(0.2 0.02 200)",
      "--accent-foreground": "oklch(0.88 0.08 185)",
      "--destructive": "oklch(0.65 0.2 25)",
      "--border": "oklch(0.75 0.1 195 / 12%)",
      "--input": "oklch(0.75 0.1 195 / 15%)",
      "--ring": "oklch(0.75 0.15 195)",
      "--sidebar": "oklch(0.12 0.01 200)",
      "--sidebar-foreground": "oklch(0.82 0.06 190)",
      "--sidebar-primary": "oklch(0.75 0.15 195)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.18 0.01 200)",
      "--sidebar-accent-foreground": "oklch(0.82 0.06 190)",
      "--sidebar-border": "oklch(0.75 0.1 195 / 12%)",
      "--sidebar-ring": "oklch(0.5 0.08 195)",
    },
  },

  // ─── LIGHT THEMES ───
  {
    name: "paper",
    label: "Cabinet",
    type: "light",
    font: "'Inter', var(--font-sans)",
    headingFont: "'Source Serif 4', 'Instrument Serif', Georgia, serif",
    accent: "#cc785c",
    vars: {
      "--background": "oklch(0.975 0.005 60)",
      "--foreground": "oklch(0.28 0.02 45)",
      "--card": "oklch(0.98 0.005 60)",
      "--card-foreground": "oklch(0.28 0.02 45)",
      "--popover": "oklch(0.98 0.005 60)",
      "--popover-foreground": "oklch(0.28 0.02 45)",
      "--primary": "oklch(0.64 0.11 45)",
      "--primary-foreground": "oklch(0.975 0.005 60)",
      "--secondary": "oklch(0.95 0.006 60)",
      "--secondary-foreground": "oklch(0.28 0.02 45)",
      "--muted": "oklch(0.95 0.006 60)",
      "--muted-foreground": "oklch(0.5 0.03 45)",
      "--accent": "oklch(0.95 0.006 60)",
      "--accent-foreground": "oklch(0.28 0.02 45)",
      "--destructive": "oklch(0.55 0.22 25)",
      "--border": "oklch(0.9 0.01 45)",
      "--input": "oklch(0.9 0.01 45)",
      "--ring": "oklch(0.64 0.11 45)",
      "--sidebar": "oklch(0.975 0.005 60)",
      "--sidebar-foreground": "oklch(0.28 0.02 45)",
      "--sidebar-primary": "oklch(0.64 0.11 45)",
      "--sidebar-primary-foreground": "oklch(0.975 0.005 60)",
      "--sidebar-accent": "oklch(0.93 0.008 45)",
      "--sidebar-accent-foreground": "oklch(0.28 0.02 45)",
      "--sidebar-border": "oklch(0.9 0.01 45)",
      "--sidebar-ring": "oklch(0.5 0.05 45)",
    },
  },
  {
    name: "sakura",
    label: "Sakura",
    type: "light",
    font: "'Nunito', var(--font-sans)",
    headingFont: "'Cormorant Garamond', Georgia, serif",
    accent: "#ec4899",
    vars: {
      "--background": "oklch(0.97 0.01 340)",
      "--foreground": "oklch(0.25 0.02 330)",
      "--card": "oklch(0.98 0.01 340)",
      "--card-foreground": "oklch(0.25 0.02 330)",
      "--popover": "oklch(0.98 0.01 340)",
      "--popover-foreground": "oklch(0.25 0.02 330)",
      "--primary": "oklch(0.6 0.18 340)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.93 0.02 340)",
      "--secondary-foreground": "oklch(0.3 0.02 330)",
      "--muted": "oklch(0.93 0.02 340)",
      "--muted-foreground": "oklch(0.55 0.04 335)",
      "--accent": "oklch(0.93 0.02 340)",
      "--accent-foreground": "oklch(0.25 0.02 330)",
      "--destructive": "oklch(0.55 0.22 25)",
      "--border": "oklch(0.88 0.03 340)",
      "--input": "oklch(0.88 0.03 340)",
      "--ring": "oklch(0.6 0.15 340)",
      "--sidebar": "oklch(0.96 0.01 340)",
      "--sidebar-foreground": "oklch(0.25 0.02 330)",
      "--sidebar-primary": "oklch(0.6 0.18 340)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.91 0.02 340)",
      "--sidebar-accent-foreground": "oklch(0.3 0.02 330)",
      "--sidebar-border": "oklch(0.88 0.03 340)",
      "--sidebar-ring": "oklch(0.6 0.12 340)",
    },
  },
  {
    name: "meadow",
    label: "Meadow",
    type: "light",
    font: "'Rubik', var(--font-sans)",
    headingFont: "'Bitter', Georgia, serif",
    accent: "#16a34a",
    vars: {
      "--background": "oklch(0.97 0.01 140)",
      "--foreground": "oklch(0.2 0.03 145)",
      "--card": "oklch(0.98 0.005 140)",
      "--card-foreground": "oklch(0.2 0.03 145)",
      "--popover": "oklch(0.98 0.005 140)",
      "--popover-foreground": "oklch(0.2 0.03 145)",
      "--primary": "oklch(0.55 0.18 150)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.93 0.02 140)",
      "--secondary-foreground": "oklch(0.25 0.03 145)",
      "--muted": "oklch(0.93 0.02 140)",
      "--muted-foreground": "oklch(0.5 0.04 145)",
      "--accent": "oklch(0.93 0.02 140)",
      "--accent-foreground": "oklch(0.2 0.03 145)",
      "--destructive": "oklch(0.55 0.22 25)",
      "--border": "oklch(0.87 0.03 140)",
      "--input": "oklch(0.87 0.03 140)",
      "--ring": "oklch(0.55 0.12 150)",
      "--sidebar": "oklch(0.95 0.01 140)",
      "--sidebar-foreground": "oklch(0.2 0.03 145)",
      "--sidebar-primary": "oklch(0.55 0.18 150)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.91 0.02 140)",
      "--sidebar-accent-foreground": "oklch(0.25 0.03 145)",
      "--sidebar-border": "oklch(0.87 0.03 140)",
      "--sidebar-ring": "oklch(0.55 0.12 150)",
    },
  },
  {
    name: "sky",
    label: "Sky",
    type: "light",
    font: "'Figtree', var(--font-sans)",
    headingFont: "'Montserrat', var(--font-sans)",
    accent: "#2563eb",
    vars: {
      "--background": "oklch(0.97 0.01 240)",
      "--foreground": "oklch(0.2 0.02 240)",
      "--card": "oklch(0.98 0.005 240)",
      "--card-foreground": "oklch(0.2 0.02 240)",
      "--popover": "oklch(0.98 0.005 240)",
      "--popover-foreground": "oklch(0.2 0.02 240)",
      "--primary": "oklch(0.55 0.2 260)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.93 0.01 240)",
      "--secondary-foreground": "oklch(0.25 0.02 240)",
      "--muted": "oklch(0.93 0.01 240)",
      "--muted-foreground": "oklch(0.5 0.04 240)",
      "--accent": "oklch(0.93 0.01 240)",
      "--accent-foreground": "oklch(0.2 0.02 240)",
      "--destructive": "oklch(0.55 0.22 25)",
      "--border": "oklch(0.87 0.02 240)",
      "--input": "oklch(0.87 0.02 240)",
      "--ring": "oklch(0.55 0.15 260)",
      "--sidebar": "oklch(0.95 0.01 240)",
      "--sidebar-foreground": "oklch(0.2 0.02 240)",
      "--sidebar-primary": "oklch(0.55 0.2 260)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.91 0.01 240)",
      "--sidebar-accent-foreground": "oklch(0.25 0.02 240)",
      "--sidebar-border": "oklch(0.87 0.02 240)",
      "--sidebar-ring": "oklch(0.55 0.15 260)",
    },
  },
  {
    name: "lavender",
    label: "Lavender",
    type: "light",
    font: "'Quicksand', var(--font-sans)",
    headingFont: "'Spectral', Georgia, serif",
    accent: "#a855f7",
    vars: {
      "--background": "oklch(0.97 0.01 295)",
      "--foreground": "oklch(0.22 0.03 290)",
      "--card": "oklch(0.98 0.005 295)",
      "--card-foreground": "oklch(0.22 0.03 290)",
      "--popover": "oklch(0.98 0.005 295)",
      "--popover-foreground": "oklch(0.22 0.03 290)",
      "--primary": "oklch(0.58 0.18 295)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.93 0.02 295)",
      "--secondary-foreground": "oklch(0.28 0.03 290)",
      "--muted": "oklch(0.93 0.02 295)",
      "--muted-foreground": "oklch(0.52 0.04 290)",
      "--accent": "oklch(0.93 0.02 295)",
      "--accent-foreground": "oklch(0.22 0.03 290)",
      "--destructive": "oklch(0.55 0.22 25)",
      "--border": "oklch(0.87 0.03 295)",
      "--input": "oklch(0.87 0.03 295)",
      "--ring": "oklch(0.58 0.14 295)",
      "--sidebar": "oklch(0.95 0.01 295)",
      "--sidebar-foreground": "oklch(0.22 0.03 290)",
      "--sidebar-primary": "oklch(0.58 0.18 295)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.91 0.02 295)",
      "--sidebar-accent-foreground": "oklch(0.28 0.03 290)",
      "--sidebar-border": "oklch(0.87 0.03 295)",
      "--sidebar-ring": "oklch(0.58 0.14 295)",
    },
  },
];

// Apply a custom theme by setting CSS variables on the root element
export function applyTheme(theme: ThemeDefinition | null) {
  const root = document.documentElement;

  if (!theme) {
    // Reset to default (remove custom vars, let .dark/:root handle it)
    root.removeAttribute("data-custom-theme");
    root.style.removeProperty("--font-theme");
    root.style.removeProperty("--font-heading-theme");
    if (THEMES[0]) {
      Object.keys(THEMES[0].vars).forEach((key) => {
        root.style.removeProperty(key);
      });
    }
    return;
  }

  // Set the dark/light class
  root.classList.toggle("dark", theme.type === "dark");

  // Apply CSS variables
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Apply fonts
  if (theme.font) {
    root.style.setProperty("--font-theme", theme.font);
  } else {
    root.style.removeProperty("--font-theme");
  }

  if (theme.headingFont) {
    root.style.setProperty("--font-heading-theme", theme.headingFont);
  } else {
    root.style.removeProperty("--font-heading-theme");
  }

  root.setAttribute("data-custom-theme", theme.name);
}

// Get the stored theme name from localStorage
export function getStoredThemeName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("cabinet-theme");
  } catch {
    return null;
  }
}

// Store theme name to localStorage
export function storeThemeName(name: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (name) {
      localStorage.setItem("cabinet-theme", name);
    } else {
      localStorage.removeItem("cabinet-theme");
    }
  } catch {
    // localStorage may be unavailable in restricted webview contexts
  }
}
