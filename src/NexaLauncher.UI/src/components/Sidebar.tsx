import { Boxes, Crown, Home, LibraryBig, Palette, Plus, Settings2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

type Section = "library" | "create" | "content" | "account" | "settings";
type Accent = "blue" | "gray" | "white" | "custom";

type SidebarProps = {
  active: Section;
  onChange(section: Section): void;
};

const items: Array<{ key: Section; label: string; icon: typeof LibraryBig }> = [
  { key: "library", label: "Inicio", icon: Home },
  { key: "content", label: "Explorar", icon: Boxes },
  { key: "create", label: "Nueva instancia", icon: Plus },
  { key: "account", label: "Cuenta", icon: Crown },
  { key: "settings", label: "Ajustes", icon: Settings2 },
];

const accents: Array<{ id: Accent; label: string; color: string }> = [
  { id: "blue", label: "Azul", color: "#1687ff" },
  { id: "gray", label: "Gris", color: "#8b95a7" },
  { id: "white", label: "Blanco", color: "#f4f7fb" },
  { id: "custom", label: "Personalizado", color: "#7357ff" },
];

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function applyAccent(accent: Accent, custom: string) {
  const selected = accent === "custom" ? custom : accents.find((item) => item.id === accent)?.color ?? "#1687ff";
  const root = document.documentElement;
  root.style.setProperty("--accent", selected);
  root.style.setProperty("--accent-rgb", hexToRgb(selected));
  root.style.setProperty("--accent-contrast", accent === "white" ? "#07101c" : "#ffffff");
}

export function Sidebar({ active, onChange }: SidebarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [accent, setAccent] = useState<Accent>(() => (localStorage.getItem("nexa-accent") as Accent) || "blue");
  const [customColor, setCustomColor] = useState(() => localStorage.getItem("nexa-custom-accent") || "#7357ff");

  useEffect(() => applyAccent(accent, customColor), [accent, customColor]);

  function chooseAccent(next: Accent) {
    setAccent(next);
    localStorage.setItem("nexa-accent", next);
  }

  function chooseCustom(next: string) {
    setCustomColor(next);
    localStorage.setItem("nexa-custom-accent", next);
    chooseAccent("custom");
  }

  return (
    <aside className="sidebar glass-edge">
      <button className="brand-button" onClick={() => onChange("library")} aria-label="NEXA Client">
        <img src="./brand/nexa-mark.png" alt="NEXA" className="brand-mark" />
      </button>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {items.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" className={`nav-button ${active === key ? "active" : ""}`} onClick={() => onChange(key)} title={label} aria-label={label}>
            <Icon size={20} strokeWidth={1.8} />
            <span className="nav-tooltip">{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className={`nav-button palette-button ${paletteOpen ? "active" : ""}`} type="button" onClick={() => setPaletteOpen((value) => !value)} title="Color de énfasis" aria-label="Color de énfasis">
          <Palette size={19} />
        </button>
        <div className="sidebar-status" title="NEXA Core listo"><Sparkles size={16} /></div>
      </div>

      {paletteOpen && (
        <div className="sidebar-palette glass-panel">
          <div className="sidebar-palette-head"><div><span className="eyebrow">NEXA</span><strong>Color de énfasis</strong></div><button className="icon-button" type="button" onClick={() => setPaletteOpen(false)}><X size={15} /></button></div>
          <p>Elige el color principal de botones, selecciones e indicadores.</p>
          <div className="sidebar-palette-grid">
            {accents.map((item) => <button key={item.id} type="button" className={`palette-choice ${accent === item.id ? "selected" : ""}`} onClick={() => chooseAccent(item.id)}><span style={{ background: item.id === "custom" ? customColor : item.color }} /><small>{item.label}</small></button>)}
          </div>
          <label className="palette-custom">Personalizado<input type="color" value={customColor} onChange={(event) => chooseCustom(event.target.value)} /></label>
        </div>
      )}
    </aside>
  );
}
