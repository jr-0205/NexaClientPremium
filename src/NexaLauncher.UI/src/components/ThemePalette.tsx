import { Check, Palette } from "iconoir-react";
import { accentOptions, type AccentTone } from "../app/accent-theme";

export type { AccentTone } from "../app/accent-theme";

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
          <p>La interfaz conserva su base negra, gris y plateada. El acento personaliza controles y estados activos.</p>
        </div>
      </div>
      <div className="accent-options" role="radiogroup" aria-label="Color de énfasis">
        {accentOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`accent-option ${value === option.id ? "active" : ""}`}
            onClick={() => onChange(option.id)}
            role="radio"
            aria-checked={value === option.id}
          >
            <span className="accent-swatch" style={{ background: option.id === "custom" ? customColor : option.color }} />
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
