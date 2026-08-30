import { Boxes, Crown, LibraryBig, Plus, Settings2, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type { AccentTheme } from "../app/theme";
import { AccentPicker } from "./AccentPicker";

type Section = "library" | "create" | "content" | "premium" | "account" | "settings";

type SidebarProps = {
  active: Section;
  premium: boolean;
  accent: AccentTheme;
  onAccentChange(theme: AccentTheme): void;
  onChange(section: Section): void;
};

const baseItems: Array<{ key: Section; label: string; description: string; icon: typeof LibraryBig }> = [
  { key: "library", label: "Biblioteca", description: "Tus perfiles", icon: LibraryBig },
  { key: "create", label: "Crear perfil", description: "Nueva instancia", icon: Plus },
  { key: "content", label: "Contenido", description: "Mods y packs", icon: Boxes },
  { key: "account", label: "Cuenta", description: "Local / Microsoft", icon: UserRound },
  { key: "settings", label: "Configuración", description: "Launcher y sistema", icon: Settings2 },
];

export function Sidebar({ active, premium, accent, onAccentChange, onChange }: SidebarProps) {
  const items = premium
    ? [
        ...baseItems.slice(0, 3),
        { key: "premium" as const, label: "Premium", description: "Cuenta y herramientas", icon: Crown },
        ...baseItems.slice(3),
      ]
    : baseItems;

  return (
    <aside className="sidebar glass-edge">
      <button className="sidebar-brand" onClick={() => onChange("library")} aria-label="NEXA Client">
        <span className="sidebar-brand-mark"><img src="./brand/nexa-mark.png" alt="NEXA" /></span>
        <span className="sidebar-brand-copy"><strong>NEXA</strong><small>CLIENT</small></span>
      </button>

      <div className="sidebar-section-label">NAVEGACIÓN</div>
      <nav className="sidebar-nav" aria-label="Navegación principal">
        {items.map(({ key, label, description, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`nav-button ${active === key ? "active" : ""} ${key === "premium" ? "premium-nav" : ""}`}
            onClick={() => onChange(key)}
            title={label}
            aria-label={label}
          >
            <span className="nav-icon"><Icon size={19} strokeWidth={1.8} /></span>
            <span className="nav-copy"><strong>{label}</strong><small>{description}</small></span>
            {key === "premium" && <span className="nav-premium-dot"><Sparkles size={11} /></span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <AccentPicker value={accent} onChange={onAccentChange} />
        <div className={`sidebar-runtime ${premium ? "premium" : ""}`}>
          <span className="sidebar-runtime-icon">{premium ? <ShieldCheck size={16} /> : <Sparkles size={16} />}</span>
          <span><strong>{premium ? "Premium activo" : "NEXA Base"}</strong><small>{premium ? "Minecraft verificado" : "Modo local listo"}</small></span>
        </div>
      </div>
    </aside>
  );
}
