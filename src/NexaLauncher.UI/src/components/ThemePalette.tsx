import { Check, Palette } from "iconoir-react";

export type AccentTone = "blue" | "gray" | "white" | "custom";

const options: Array<{ id: AccentTone; label: string; value: string }> = [
  { id: "blue", label: "Azul", value: "#1687ff" },
  { id: "gray", label: "Plateado", value: "#aeb7c4" },
  { id: "white", label: "Blanco", value: "#f4f7fb" },
  { id: "custom", label: "Personalizado", value: "#8b5cf6" },
];

type Props = {
  value: AccentTone;
  customColor: string;
  onChange(value: AccentTone): void;
  onCustomColor(value: string): void;
};

export function ThemePalette({ value, customColor, onChange, onCustomColor }: Props) {
  return (
    <section className="appearance-panel glass-panel" aria-label="Apariencia de NEXA">
      <div className="appearance-copy">
        <span className="appearance-icon"><Palette width={20} height={20} /></span>
        <div>
          <span className="eyebrow">APARIENCIA</span>
          <h2>Color de énfasis</h2>
          <p>La base visual permanece negra, gris y plateada. El acento modifica controles, selecciones e indicadores.</p>
        </div>
      </div>
      <div className="accent-options" role="radiogroup" aria-label="Color de énfasis">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`accent-option ${value === option.id ? "active" : ""}`}
            onClick={() => onChange(option.id)}
            role="radio"
            aria-checked={value === option.id}
          >
            <span className="accent-swatch" style={{ background: option.id === "custom" ? customColor : option.value }} />
            <span>{option.label}</span>
            {value === option.id && <Check width={15} height={15} />}
          </button>
        ))}
        {value === "custom" && (
          <label className="custom-color-picker">
            <span>Elegir color</span>
            <input type="color" value={customColor} onChange={(event) => onCustomColor(event.target.value)} />
          </label>
        )}
      </div>
    </section>
  );
}
