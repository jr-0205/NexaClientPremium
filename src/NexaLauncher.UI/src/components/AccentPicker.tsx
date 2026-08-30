import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { accentThemes, type AccentTheme } from "../app/theme";

type Props = {
  value: AccentTheme;
  onChange(theme: AccentTheme): void;
};

export function AccentPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  const active = accentThemes.find((theme) => theme.id === value) ?? accentThemes[0];

  return (
    <div className="accent-picker" ref={root}>
      <button
        type="button"
        className={`sidebar-control-button ${open ? "active" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label="Cambiar color base de NEXA"
        title="Color de interfaz"
      >
        <Palette size={18} />
        <span className="sidebar-control-copy"><strong>Color</strong><small>{active.label}</small></span>
        <span className="accent-current-dot" style={{ background: active.swatch }} />
      </button>

      {open && (
        <div className="accent-popover glass-panel" role="dialog" aria-label="Color base de NEXA">
          <div className="accent-popover-heading">
            <span className="eyebrow">PERSONALIZACIÓN</span>
            <strong>Color base del launcher</strong>
            <p>Elige un solo acento. Se aplicará a toda la experiencia de NEXA.</p>
          </div>
          <div className="accent-options">
            {accentThemes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`accent-option ${theme.id === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(theme.id);
                  setOpen(false);
                }}
              >
                <span className="accent-swatch" style={{ background: theme.swatch }} />
                <span><strong>{theme.label}</strong><small>{theme.description}</small></span>
                {theme.id === value && <Check size={15} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
