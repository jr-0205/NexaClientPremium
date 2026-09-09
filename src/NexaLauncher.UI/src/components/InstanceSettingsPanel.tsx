import { FloppyDisk, Refresh, Settings } from "iconoir-react";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getProfileSettings, updateProfileSettings } from "../app/nexa-bridge";
import type { NexaProfile, ProfileRuntimeSettings } from "../app/types";

type Props = {
  profile: NexaProfile;
  open: boolean;
  onClose(): void;
  onNotice(message: string, kind?: "success" | "error"): void;
};

const EMPTY: ProfileRuntimeSettings = {
  profileId: "",
  memoryMiB: null,
  javaPath: null,
  jvmArguments: [],
  windowWidth: null,
  windowHeight: null,
  fullscreen: null,
};

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

export function InstanceSettingsPanel({ profile, open, onClose, onNotice }: Props) {
  const [settings, setSettings] = useState<ProfileRuntimeSettings>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memory, setMemory] = useState("");
  const [javaPath, setJavaPath] = useState("");
  const [jvmText, setJvmText] = useState("");
  const [windowWidth, setWindowWidth] = useState("");
  const [windowHeight, setWindowHeight] = useState("");
  const [fullscreen, setFullscreen] = useState<"inherit" | "on" | "off">("inherit");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getProfileSettings(profile.id)
      .then((value) => {
        setSettings(value);
        setMemory(value.memoryMiB?.toString() ?? "");
        setJavaPath(value.javaPath ?? "");
        setJvmText(value.jvmArguments.join("\n"));
        setWindowWidth(value.windowWidth?.toString() ?? "");
        setWindowHeight(value.windowHeight?.toString() ?? "");
        setFullscreen(value.fullscreen == null ? "inherit" : value.fullscreen ? "on" : "off");
      })
      .catch((error: Error) => onNotice(error.message, "error"))
      .finally(() => setLoading(false));
  }, [open, profile.id]);

  const changed = useMemo(() => {
    const nextJvm = jvmText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    return memory !== (settings.memoryMiB?.toString() ?? "") ||
      javaPath.trim() !== (settings.javaPath ?? "") ||
      nextJvm.join("\n") !== settings.jvmArguments.join("\n") ||
      windowWidth !== (settings.windowWidth?.toString() ?? "") ||
      windowHeight !== (settings.windowHeight?.toString() ?? "") ||
      fullscreen !== (settings.fullscreen == null ? "inherit" : settings.fullscreen ? "on" : "off");
  }, [settings, memory, javaPath, jvmText, windowWidth, windowHeight, fullscreen]);

  function restoreLoadedValues() {
    setMemory(settings.memoryMiB?.toString() ?? "");
    setJavaPath(settings.javaPath ?? "");
    setJvmText(settings.jvmArguments.join("\n"));
    setWindowWidth(settings.windowWidth?.toString() ?? "");
    setWindowHeight(settings.windowHeight?.toString() ?? "");
    setFullscreen(settings.fullscreen == null ? "inherit" : settings.fullscreen ? "on" : "off");
  }

  async function save() {
    const memoryValue = optionalNumber(memory);
    const widthValue = optionalNumber(windowWidth);
    const heightValue = optionalNumber(windowHeight);
    const argumentsList = jvmText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);

    if (memory.trim() && (memoryValue == null || memoryValue < 1024 || memoryValue > 32768)) {
      onNotice("La memoria debe estar entre 1024 y 32768 MB.", "error");
      return;
    }
    if (windowWidth.trim() && (widthValue == null || widthValue < 640 || widthValue > 7680)) {
      onNotice("El ancho debe estar entre 640 y 7680 px.", "error");
      return;
    }
    if (windowHeight.trim() && (heightValue == null || heightValue < 480 || heightValue > 4320)) {
      onNotice("El alto debe estar entre 480 y 4320 px.", "error");
      return;
    }
    if (argumentsList.length > 64) {
      onNotice("NEXA admite hasta 64 argumentos JVM por instancia.", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfileSettings({
        id: profile.id,
        memoryMiB: memoryValue,
        javaPath: javaPath.trim() || null,
        jvmArguments: argumentsList,
        windowWidth: widthValue,
        windowHeight: heightValue,
        fullscreen: fullscreen === "inherit" ? null : fullscreen === "on",
      });
      setSettings(updated);
      onNotice("Configuración de la instancia guardada.", "success");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudo guardar la configuración de la instancia.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <section className="instance-settings-panel glass-panel" aria-label={`Configuración de ${profile.name}`}>
      <header className="instance-settings-heading">
        <div>
          <span className="eyebrow"><Settings width={14} height={14} /> CONFIGURACIÓN DE INSTANCIA</span>
          <h2>{profile.name}</h2>
          <p>Minecraft {profile.minecraftVersion} · {profile.loader}{profile.loaderVersion ? ` ${profile.loaderVersion}` : ""}</p>
        </div>
        <div className="instance-settings-actions">
          {changed && <button className="ghost-button" type="button" disabled={saving} onClick={restoreLoadedValues}><Refresh width={15} height={15} /> DESCARTAR</button>}
          <button className="ghost-button" type="button" onClick={onClose}>CERRAR</button>
          <button className="primary-button" type="button" disabled={loading || saving || !changed} onClick={save}>
            {saving ? <Loader2 className="spin" size={15} /> : <FloppyDisk width={15} height={15} />} GUARDAR
          </button>
        </div>
      </header>

      {loading ? <div className="instance-settings-loading"><Loader2 className="spin" size={18} /> Cargando ajustes…</div> : (
        <div className="instance-settings-grid">
          <article className="instance-settings-card">
            <span className="eyebrow">RENDIMIENTO</span>
            <h3>Memoria</h3>
            <p>Vacío = usa la memoria global del launcher. El límite por instancia es 32 GB.</p>
            <label className="field-label">RAM (MB)<input className="nexa-input" inputMode="numeric" value={memory} onChange={(event) => setMemory(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Heredar ajuste global" /></label>
            <div className="instance-memory-presets">
              {[2048, 4096, 6144, 8192].map((value) => <button type="button" key={value} onClick={() => setMemory(String(value))}>{value / 1024} GB</button>)}
              <button type="button" onClick={() => setMemory("")}>HEREDAR</button>
            </div>
          </article>

          <article className="instance-settings-card">
            <span className="eyebrow">JAVA</span>
            <h3>Runtime de la instancia</h3>
            <p>Vacío = NEXA detecta en cada inicio el Java compatible con la versión de Minecraft.</p>
            <label className="field-label">RUTA DE JAVA<input className="nexa-input" value={javaPath} onChange={(event) => setJavaPath(event.target.value)} placeholder="Detección automática" spellCheck={false} /></label>
            <div className="instance-memory-presets">
              <button type="button" className={!javaPath.trim() ? "active" : ""} onClick={() => setJavaPath("")}>USAR DETECCIÓN AUTOMÁTICA</button>
            </div>
            <small className="instance-settings-hint">El selector nativo de java.exe/javaw.exe se añadirá sobre este mismo override sin enviar rutas arbitrarias fuera del bridge.</small>
          </article>

          <article className="instance-settings-card wide">
            <span className="eyebrow">AVANZADO</span>
            <h3>Argumentos JVM</h3>
            <p>Un argumento por línea. Máximo 64. NEXA conserva estos argumentos únicamente para esta instancia.</p>
            <textarea className="nexa-input instance-jvm-input" value={jvmText} onChange={(event) => setJvmText(event.target.value)} placeholder={'-XX:+UseG1GC\n-Dpropiedad=valor'} spellCheck={false} />
            <small className="instance-settings-hint">{jvmText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).length}/64 argumentos</small>
          </article>

          <article className="instance-settings-card">
            <span className="eyebrow">VENTANA</span>
            <h3>Resolución inicial</h3>
            <div className="instance-resolution-grid">
              <label className="field-label">ANCHO<input className="nexa-input" inputMode="numeric" value={windowWidth} onChange={(event) => setWindowWidth(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Automático" /></label>
              <label className="field-label">ALTO<input className="nexa-input" inputMode="numeric" value={windowHeight} onChange={(event) => setWindowHeight(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Automático" /></label>
            </div>
          </article>

          <article className="instance-settings-card">
            <span className="eyebrow">PANTALLA</span>
            <h3>Pantalla completa</h3>
            <p>Puede heredar el comportamiento normal o forzar el modo sólo para esta instancia.</p>
            <div className="instance-mode-selector" role="group" aria-label="Modo de pantalla">
              <button type="button" className={fullscreen === "inherit" ? "active" : ""} onClick={() => setFullscreen("inherit")}>HEREDAR</button>
              <button type="button" className={fullscreen === "off" ? "active" : ""} onClick={() => setFullscreen("off")}>VENTANA</button>
              <button type="button" className={fullscreen === "on" ? "active" : ""} onClick={() => setFullscreen("on")}>FULLSCREEN</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
