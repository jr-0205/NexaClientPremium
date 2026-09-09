export type AccentTone = "blue" | "gray" | "white" | "custom";

export const accentOptions: Array<{ id: AccentTone; label: string; color: string }> = [
  { id: "gray", label: "Plateado", color: "#aeb7c4" },
  { id: "blue", label: "Azul", color: "#1687ff" },
  { id: "white", label: "Blanco", color: "#f4f7fb" },
  { id: "custom", label: "Personalizado", color: "#8b5cf6" },
];

const STORAGE_ACCENT = "nexa-accent";
const STORAGE_CUSTOM = "nexa-custom-accent";
const THEME_EVENT = "nexa:accent-change";

function normalizeHex(value: string | null, fallback: string) {
  const candidate = (value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toLowerCase() : fallback;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex, "#aeb7c4").slice(1);
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function contrastFor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  return luminance > 0.47 ? "#080b10" : "#ffffff";
}

function normalizeTone(value: string | null): AccentTone {
  if (value === "silver") return "gray";
  return accentOptions.some((item) => item.id === value) ? value as AccentTone : "gray";
}

export function loadAccentPreference() {
  return {
    accent: normalizeTone(localStorage.getItem(STORAGE_ACCENT)),
    customColor: normalizeHex(localStorage.getItem(STORAGE_CUSTOM), "#8b5cf6"),
  };
}

export function applyAccentPreference(accent: AccentTone, customColor: string, persist = true) {
  const safeCustom = normalizeHex(customColor, "#8b5cf6");
  const selected = accent === "custom"
    ? safeCustom
    : accentOptions.find((item) => item.id === accent)?.color ?? "#aeb7c4";
  const { r, g, b } = hexToRgb(selected);
  const root = document.documentElement;
  root.style.setProperty("--accent", selected);
  root.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  root.style.setProperty("--accent-contrast", contrastFor(selected));
  root.style.setProperty("--accent-soft", `rgba(${r}, ${g}, ${b}, .10)`);
  root.style.setProperty("--accent-glow", `rgba(${r}, ${g}, ${b}, .22)`);
  if (persist) {
    localStorage.setItem(STORAGE_ACCENT, accent);
    localStorage.setItem(STORAGE_CUSTOM, safeCustom);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { accent, customColor: safeCustom } }));
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
