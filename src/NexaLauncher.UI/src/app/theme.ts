export type AccentTheme = "nexa" | "violet" | "emerald" | "amber" | "crimson" | "cyan";

export type AccentThemeOption = {
  id: AccentTheme;
  label: string;
  description: string;
  swatch: string;
};

export const accentThemes: AccentThemeOption[] = [
  { id: "nexa", label: "NEXA", description: "Azul eléctrico", swatch: "#4e86ff" },
  { id: "violet", label: "Violeta", description: "Violeta profundo", swatch: "#8b6cff" },
  { id: "emerald", label: "Esmeralda", description: "Verde tecnológico", swatch: "#35c990" },
  { id: "amber", label: "Ámbar", description: "Dorado cálido", swatch: "#e6a84d" },
  { id: "crimson", label: "Carmesí", description: "Rojo intenso", swatch: "#e75c72" },
  { id: "cyan", label: "Cian", description: "Cian frío", swatch: "#27b9d8" },
];

const storageKey = "nexa.ui.accent";

export function readAccentTheme(): AccentTheme {
  try {
    const stored = window.localStorage.getItem(storageKey) as AccentTheme | null;
    return accentThemes.some((theme) => theme.id === stored) ? stored! : "nexa";
  } catch {
    return "nexa";
  }
}

export function applyAccentTheme(theme: AccentTheme) {
  document.documentElement.dataset.accent = theme;
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // The visual preference is non-critical; ignore unavailable storage.
  }
}
