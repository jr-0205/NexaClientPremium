import { Box, Crown, Home, Palette, Plus, Settings, Star, Xmark } from "iconoir-react";
import { useEffect, useState } from "react";
import { accentOptions, applyAccentPreference, loadAccentPreference, onAccentPreferenceChanged, type AccentTone } from "../app/accent-theme";

type Section = "library" | "create" | "content" | "account" | "settings";

type SidebarProps = {
  active: Section;
  onChange(section: Section): void;
};

const items = [
  { key: "library", label: "Inicio", icon: Home },
  { key: "content", label: "Explorar", icon: Box },
  { key: "create", label: "Nueva instancia", icon: Plus },
  { key: "account", label: "Cuenta", icon: Crown },
  { key: "settings", label: "Ajustes", icon: Settings },
] as const;

export function Sidebar({ active, onChange }: SidebarProps) {
  const initial = loadAccentPreference();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [accent, setAccent] = useState<AccentTone>(initial.accent);
  const [customColor, setCustomColor] = useState(initial.customColor);

  useEffect(() => {
    applyAccentPreference(accent, customColor, false);
    return onAccentPreferenceChanged((next) => {
      setAccent(next.accent);
      setCustomColor(next.customColor);
      applyAccentPreference(next.accent, next.customColor, false);
    });
  }, []);

  function togglePalette() {
    setPaletteOpen((current) => {
      const nextOpen = !current;
      if (nextOpen) {
        const saved = loadAccentPreference();
        setAccent(saved.accent);
        setCustomColor(saved.customColor);
        applyAccentPreference(saved.accent, saved.customColor, false);
      }
      return nextOpen;
    });
  }

  function chooseAccent(next: AccentTone) {
    setAccent(next);
    applyAccentPreference(next, customColor);
  }

  function chooseCustom(next: string) {
    setCustomColor(next);
    setAccent("custom");
    applyAccentPreference("custom", next);
  }

  return (
    <aside className="sidebar glass-edge">
      <button className="brand-button" onClick={() => onChange("library")} aria-label="NEXA Client">
        <img src="./brand/nexa-mark.png" alt="NEXA" className="brand-mark" />
      </button>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {items.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" className={`nav-button ${active === key ? "active" : ""}`} onClick={() => onChange(key)} title={label} aria-label={label}>
            <Icon width={20} height={20} strokeWidth={1.8} />
            <span className="nav-tooltip">{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className={`nav-button palette-button ${paletteOpen ? "active" : ""}`} type="button" onClick={togglePalette} title="Color de énfasis" aria-label="Color de énfasis">
          <Palette width={19} height={19} />
        </button>
        <div className="sidebar-status" title="NEXA Core listo"><Star width={16} height={16} /></div>
      </div>

      {paletteOpen && (
        <div className="sidebar-palette glass-panel">
          <div className="sidebar-palette-head"><div><span className="eyebrow">NEXA</span><strong>Color de énfasis</strong></div><button className="icon-button" type="button" onClick={() => setPaletteOpen(false)}><Xmark width={15} height={15} /></button></div>
          <p>La base negra y plateada permanece fija. El color sólo cambia selecciones, botones e indicadores.</p>
          <div className="sidebar-palette-grid">
            {accentOptions.map((item) => <button key={item.id} type="button" className={`palette-choice ${accent === item.id ? "selected" : ""}`} onClick={() => chooseAccent(item.id)}><span style={{ background: item.id === "custom" ? customColor : item.color }} /><small>{item.label}</small></button>)}
          </div>
          <label className="palette-custom">Personalizado<input type="color" value={customColor} onChange={(event) => chooseCustom(event.target.value)} /></label>
        </div>
      )}
    </aside>
  );
}
