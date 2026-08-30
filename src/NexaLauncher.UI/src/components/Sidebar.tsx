import { Boxes, Crown, LibraryBig, Plus, Settings2, Sparkles } from "lucide-react";

type Section = "library" | "create" | "content" | "account" | "settings";

type SidebarProps = {
  active: Section;
  onChange(section: Section): void;
};

const items: Array<{ key: Section; label: string; description: string; icon: typeof LibraryBig }> = [
  { key: "library", label: "Biblioteca", description: "Tus perfiles", icon: LibraryBig },
  { key: "create", label: "Nuevo perfil", description: "Crear instancia", icon: Plus },
  { key: "content", label: "Contenido", description: "Mods y packs", icon: Boxes },
  { key: "account", label: "Cuenta", description: "Microsoft", icon: Crown },
  { key: "settings", label: "Ajustes", description: "Launcher", icon: Settings2 },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="sidebar glass-edge">
      <button className="brand-button" onClick={() => onChange("library")} aria-label="Abrir biblioteca de NEXA Client">
        <img src="./brand/nexa-mark.png" alt="" className="brand-mark" />
        <span className="brand-lockup">
          <strong>NEXA</strong>
          <small>CLIENT</small>
        </span>
      </button>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        <span className="sidebar-section-label">LAUNCHER</span>
        {items.map(({ key, label, description, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`nav-button ${active === key ? "active" : ""}`}
            onClick={() => onChange(key)}
            title={label}
            aria-label={label}
            aria-current={active === key ? "page" : undefined}
          >
            <span className="nav-icon"><Icon size={19} strokeWidth={1.8} /></span>
            <span className="nav-copy">
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status" title="NEXA Core listo">
          <Sparkles size={15} />
          <span><strong>NEXA CORE</strong><small>Sistema listo</small></span>
        </div>
      </div>
    </aside>
  );
}
