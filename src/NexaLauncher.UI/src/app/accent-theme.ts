export type AccentTone = "silver" | "blue" | "violet" | "emerald" | "crimson" | "white" | "custom";

export const accentOptions: Array<{ id: AccentTone; label: string; color: string }> = [
  { id: "silver", label: "Plateado", color: "#aeb7c4" },
  { id: "blue", label: "Azul", color: "#1687ff" },
  { id: "violet", label: "Morado", color: "#8b5cf6" },
  { id: "emerald", label: "Verde", color: "#31c48d" },
  { id: "crimson", label: "Rojo", color: "#ef5b68" },
  { id: "white", label: "Blanco", color: "#f4f7fb" },
  { id: "custom", label: "Personalizado", color: "#8b5cf6" },
];

const STORAGE_ACCENT = "nexa-accent";
const STORAGE_CUSTOM = "nexa-custom-accent";
const THEME_EVENT = "nexa:accent-change";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value) || normalized.length !== 6) return "174, 183, 196";
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function normalizeTone(value: string | null): AccentTone {
  if (value === "gray") return "silver";
  return accentOptions.some((item) => item.id === value) ? value as AccentTone : "silver";
}

export function loadAccentPreference() {
  return {
    accent: normalizeTone(localStorage.getItem(STORAGE_ACCENT)),
    customColor: localStorage.getItem(STORAGE_CUSTOM) || "#8b5cf6",
  };
}

export function applyAccentPreference(accent: AccentTone, customColor: string, persist = true) {
  const selected = accent === "custom"
    ? customColor
    : accentOptions.find((item) => item.id === accent)?.color ?? "#aeb7c4";
  const root = document.documentElement;
  root.style.setProperty("--accent", selected);
  root.style.setProperty("--accent-rgb", hexToRgb(selected));
  root.style.setProperty("--accent-contrast", accent === "white" || accent === "silver" ? "#080b10" : "#ffffff");
  if (persist) {
    localStorage.setItem(STORAGE_ACCENT, accent);
    localStorage.setItem(STORAGE_CUSTOM, customColor);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { accent, customColor } }));
  }
}

export function onAccentPreferenceChanged(listener: (value: { accent: AccentTone; customColor: string }) => void) {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ accent: AccentTone; customColor: string }>;
    if (custom.detail) listener(custom.detail);
  };
  window.addEventListener(THEME_EVENT, handler);
  return () => window.removeEventListener(THEME_EVENT, handler);
}
