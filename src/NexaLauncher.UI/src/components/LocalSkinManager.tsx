import { Shirt, Upload, Xmark } from "iconoir-react";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { loadLocalSkinPreference, readLocalSkinFile, saveLocalSkinPreference, type LocalSkinPreference } from "../app/local-skin";

type Props = {
  onNotice?(message: string, kind?: "success" | "error"): void;
};

export function LocalSkinManager({ onNotice }: Props) {
  const initial = loadLocalSkinPreference();
  const [skin, setSkin] = useState<LocalSkinPreference>(initial);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function choose(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const dataUrl = await readLocalSkinFile(file);
      const next = { ...skin, dataUrl };
      saveLocalSkinPreference(next);
      setSkin(next);
      onNotice?.("Skin local actualizada. Sólo se muestra dentro de NEXA.", "success");
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "No se pudo usar esa skin local.", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function setVariant(variant: LocalSkinPreference["variant"]) {
    const next = { ...skin, variant };
    saveLocalSkinPreference(next);
    setSkin(next);
  }

  function clear() {
    const next = { ...skin, dataUrl: null };
    saveLocalSkinPreference(next);
    setSkin(next);
    onNotice?.("Skin local eliminada.", "success");
  }

  return (
    <article className="local-skin-manager glass-panel">
      <div className="local-skin-manager-copy">
        <span className="eyebrow">APARIENCIA LOCAL</span>
        <h2>Skin local</h2>
        <p>Personaliza tu perfil de NEXA sin una cuenta Premium. Esta imagen se guarda sólo en este equipo: no se sube a Mojang, no cambia tu skin oficial y otros jugadores no la ven.</p>
        <div className="skin-variant-picker" role="group" aria-label="Modelo de skin local">
          <button type="button" className={skin.variant === "classic" ? "active" : ""} onClick={() => setVariant("classic")}>CLASSIC <small>Brazos de 4 px</small></button>
          <button type="button" className={skin.variant === "slim" ? "active" : ""} onClick={() => setVariant("slim")}>SLIM <small>Brazos de 3 px</small></button>
        </div>
        <div className="local-skin-manager-actions">
          <input ref={input} className="local-skin-file-input" type="file" accept="image/png" onChange={(event) => void choose(event.target.files?.[0])} />
          <button className="primary-button" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? <Loader2 className="spin" size={16} /> : <Upload width={16} height={16} />} {skin.dataUrl ? "CAMBIAR SKIN LOCAL" : "ELEGIR SKIN LOCAL"}</button>
          {skin.dataUrl && <button className="ghost-button" type="button" onClick={clear}><Xmark width={15} height={15} /> QUITAR</button>}
        </div>
        <span className="skin-upload-hint">PNG · 64×64 o 64×32 · máximo 1 MB</span>
      </div>
      <div className="local-skin-preview">
        {skin.dataUrl ? <img src={skin.dataUrl} alt="Textura de skin local" /> : <div><Shirt width={34} height={34} /><span>Sin skin local</span></div>}
        <small>{skin.variant === "slim" ? "SLIM" : "CLASSIC"}</small>
      </div>
    </article>
  );
}
