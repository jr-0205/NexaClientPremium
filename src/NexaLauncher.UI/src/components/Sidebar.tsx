import { Boxes, Crown, LibraryBig, Plus, Settings2, ShieldCheck } from "lucide-react";

type Section = "library" | "create" | "content" | "account" | "settings";

type SidebarProps = {
  active: Section;
  onChange(section: Section): void;
};

const items: Array<{ key: Section; label: string; icon: typeof LibraryBig }> = [
  { key: "library", label: "Biblioteca", icon: LibraryBig },
  { key: "create", label: "Nuevo perfil", icon: Plus },
  { key: "content", label: "Contenido", icon: Boxes },
  { key: "account", label: "Cuenta", icon: Crown },
  { key: "settings", label: "Ajustes", icon: Settings2 },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <header className="sidebar nordic-header">
      <button className="brand-button" onClick={() => onChange("library")} aria-label="Abrir biblioteca de NEXA Client">
        <span className="nordic-brand-glyph">ᚾ</span>
        <span className="brand-lockup">
          <strong>NEXA</strong>
          <small>CLIENT</small>
        </span>
      </button>

      <nav className="sidebar-nav nordic-nav" aria-label="Navegación principal">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`nav-button ${active === key ? "active" : ""}`}
            onClick={() => onChange(key)}
            aria-label={label}
            aria-current={active === key ? "page" : undefined}
          >
            <Icon size={16} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer nordic-core-state" title="NEXA Core listo">
        <ShieldCheck size={15} />
        <span><strong>CORE</strong><small>LISTO</small></span>
      </div>
    </header>
  );
}
