import { FloppyDisk, Refresh, Settings } from "iconoir-react";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  browseProfileJava,
  getLoaderVersions,
  getMinecraftVersions,
  getProfileSettings,
  repairProfileInstallation,
  updateProfileInstallation,
  updateProfileSettings,
} from "../app/nexa-bridge";
import type { LoaderVersionItem, MinecraftVersionItem, NexaProfile, ProfileRuntimeSettings } from "../app/types";

type Props = {
  profile: NexaProfile;
  open: boolean;
  running?: boolean;
  onClose(): void;
  onUpdated(profile: NexaProfile): void;
  onNotice(message: string, kind?: "success" | "error"): void;
};

type SettingsTab = "runtime" | "installation";
type LoaderName = "Vanilla" | "Fabric" | "Forge" | "NeoForge";

const EMPTY: ProfileRuntimeSettings = {
  profileId: "",
  memoryMiB: null,
  javaPath: null,
  jvmArguments: [],
  windowWidth: null,
  windowHeight: null,
  fullscreen: null,
};

const loaders: LoaderName[] = ["Vanilla", "Fabric", "Forge", "NeoForge"];

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function normalizeLoader(value: string): LoaderName {
  const match = loaders.find((item) => item.toLowerCase() === value.toLowerCase());
  return match ?? "Vanilla";
}

export function InstanceSettingsPanel({ profile, open, running = false, onClose, onUpdated, onNotice }: Props) {
  const [tab, setTab] = useState<SettingsTab>("runtime");
  const [settings, setSettings] = useState<ProfileRuntimeSettings>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [browsingJava, setBrowsingJava] = useState(false);
  const [memory, setMemory] = useState("");
  const [javaPath, setJavaPath] = useState("");
  const [jvmText, setJvmText] = useState("");
  const [windowWidth, setWindowWidth] = useState("");
  const [windowHeight, setWindowHeight] = useState("");
  const [fullscreen, setFullscreen] = useState<"inherit" | "on" | "off">("inherit");

  const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersionItem[]>([]);
  const [loaderVersions, setLoaderVersions] = useState<LoaderVersionItem[]>([]);
  const [installationLoading, setInstallationLoading] = useState(false);
  const [installationSaving, setInstallationSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [minecraftVersion, setMinecraftVersion] = useState(profile.minecraftVersion);
  const [loader, setLoader] = useState<LoaderName>(() => normalizeLoader(profile.loader));
  const [loaderVersion, setLoaderVersion] = useState(profile.loaderVersion ?? "");

  useEffect(() => {
    if (!open) return;
    setTab("runtime");
    setMinecraftVersion(profile.minecraftVersion);
    setLoader(normalizeLoader(profile.loader));
    setLoaderVersion(profile.loaderVersion ?? "");
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

  useEffect(() => {
    if (!open || tab !== "installation" || minecraftVersions.length > 0) return;
    setInstallationLoading(true);
    getMinecraftVersions()
      .then(setMinecraftVersions)
      .catch((error: Error) => onNotice(error.message, "error"))
      .finally(() => setInstallationLoading(false));
  }, [open, tab, minecraftVersions.length]);

  useEffect(() => {
    if (!open || tab !== "installation") return;
    if (loader === "Vanilla") {
      setLoaderVersions([]);
      setLoaderVersion("");
      return;
    }
    if (!minecraftVersion) return;
    let cancelled = false;
    setInstallationLoading(true);
    getLoaderVersions(minecraftVersion, loader)
      .then((items) => {
        if (cancelled) return;
        setLoaderVersions(items);
        const stillAvailable = items.some((item) => item.version === loaderVersion);
        if (!stillAvailable) setLoaderVersion(items.find((item) => item.stable)?.version ?? items[0]?.version ?? "");
      })
      .catch((error: Error) => { if (!cancelled) onNotice(error.message, "error"); })
      .finally(() => { if (!cancelled) setInstallationLoading(false); });
    return () => { cancelled = true; };
  }, [open, tab, minecraftVersion, loader]);

  const changed = useMemo(() => {
    const nextJvm = jvmText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    return memory !== (settings.memoryMiB?.toString() ?? "") ||
      javaPath.trim() !== (settings.javaPath ?? "") ||
      nextJvm.join("\n") !== settings.jvmArguments.join("\n") ||
      windowWidth !== (settings.windowWidth?.toString() ?? "") ||
      windowHeight !== (settings.windowHeight?.toString() ?? "") ||
      fullscreen !== (settings.fullscreen == null ? "inherit" : settings.fullscreen ? "on" : "off");
  }, [settings, memory, javaPath, jvmText, windowWidth, windowHeight, fullscreen]);

  const installationChanged = minecraftVersion !== profile.minecraftVersion ||
    loader.toLowerCase() !== profile.loader.toLowerCase() ||
    (loader === "Vanilla" ? null : loaderVersion || null) !== (profile.loaderVersion ?? null);

  function restoreLoadedValues() {
    setMemory(settings.memoryMiB?.toString() ?? "");
    setJavaPath(settings.javaPath ?? "");
    setJvmText(settings.jvmArguments.join("\n"));
    setWindowWidth(settings.windowWidth?.toString() ?? "");
    setWindowHeight(settings.windowHeight?.toString() ?? "");
    setFullscreen(settings.fullscreen == null ? "inherit" : settings.fullscreen ? "on" : "off");
  }

  function restoreInstallation() {
    setMinecraftVersion(profile.minecraftVersion);
    setLoader(normalizeLoader(profile.loader));
    setLoaderVersion(profile.loaderVersion ?? "");
  }

  async function chooseJava() {
    setBrowsingJava(true);
    try {
      const result = await browseProfileJava(profile.id);
      if (result.selected && result.path) setJavaPath(result.path);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudo abrir el selector de Java.", "error");
    } finally {
      setBrowsingJava(false);
    }
  }

  async function save() {
    const memoryValue = optionalNumber(memory);
    const widthValue = optionalNumber(windowWidth);
    const heightValue = optionalNumber(windowHeight);
    const argumentsList = jvmText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);

    if (memory.trim() && (memoryValue == null || memoryValue < 1024 || memoryValue > 32768)) return onNotice("La memoria debe estar entre 1024 y 32768 MB.", "error");
    if (windowWidth.trim() && (widthValue == null || widthValue < 640 || widthValue > 7680)) return onNotice("El ancho debe estar entre 640 y 7680 px.", "error");
    if (windowHeight.trim() && (heightValue == null || heightValue < 480 || heightValue > 4320)) return onNotice("El alto debe estar entre 480 y 4320 px.", "error");
    if (argumentsList.length > 64) return onNotice("NEXA admite hasta 64 argumentos JVM por instancia.", "error");

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
      onUpdated({
        ...profile,
        memoryMiB: updated.memoryMiB,
        javaPath: updated.javaPath,
        jvmArguments: updated.jvmArguments,
        windowWidth: updated.windowWidth,
        windowHeight: updated.windowHeight,
        fullscreen: updated.fullscreen,
      });
      onNotice("Configuración de ejecución guardada.", "success");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudo guardar la configuración de la instancia.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveInstallation() {
    if (running) return onNotice("Cierra Minecraft antes de cambiar la instalación de esta instancia.", "error");
    if (!minecraftVersion) return onNotice("Selecciona una versión de Minecraft.", "error");
    if (loader !== "Vanilla" && !loaderVersion) return onNotice("Selecciona una versión del loader.", "error");

    setInstallationSaving(true);
    try {
      const updated = await updateProfileInstallation({
        id: profile.id,
        minecraftVersion,
        loader,
        loaderVersion: loader === "Vanilla" ? null : loaderVersion,
      });
      setMinecraftVersion(updated.minecraftVersion);
      setLoader(normalizeLoader(updated.loader));
      setLoaderVersion(updated.loaderVersion ?? "");
      onUpdated(updated);
      onNotice("Instalación de la instancia actualizada. Revisa la compatibilidad de mods y contenido instalado.", "success");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudo actualizar la instalación.", "error");
    } finally {
      setInstallationSaving(false);
    }
  }

  async function repairInstallation() {
    if (running) return onNotice("Cierra Minecraft antes de reparar esta instalación.", "error");
    if (installationChanged) return onNotice("Aplica o descarta los cambios de versión antes de reparar.", "error");

    setRepairing(true);
    try {
      const result = await repairProfileInstallation(profile.id);
      onUpdated(result.profile);
      onNotice("Instalación verificada y reparada. Los archivos válidos se conservaron y los dañados o faltantes se restauraron.", "success");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudo reparar la instalación.", "error");
    } finally {
      setRepairing(false);
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
          {tab === "runtime" && changed && <button className="ghost-button" type="button" disabled={saving} onClick={restoreLoadedValues}><Refresh width={15} height={15} /> DESCARTAR</button>}
          {tab === "installation" && installationChanged && <button className="ghost-button" type="button" disabled={installationSaving || repairing} onClick={restoreInstallation}><Refresh width={15} height={15} /> DESCARTAR</button>}
          <button className="ghost-button" type="button" onClick={onClose}>CERRAR</button>
          {tab === "runtime" ? (
            <button className="primary-button" type="button" disabled={loading || saving || !changed} onClick={save}>{saving ? <Loader2 className="spin" size={15} /> : <FloppyDisk width={15} height={15} />} GUARDAR</button>
          ) : (
            <button className="primary-button" type="button" disabled={installationLoading || installationSaving || repairing || running || !installationChanged} onClick={saveInstallation}>{installationSaving ? <Loader2 className="spin" size={15} /> : <FloppyDisk width={15} height={15} />} APLICAR INSTALACIÓN</button>
          )}
        </div>
      </header>

      <div className="instance-settings-tabs" role="tablist" aria-label="Secciones de configuración de instancia">
        <button type="button" className={tab === "runtime" ? "active" : ""} onClick={() => setTab("runtime")}>GENERAL Y RUNTIME</button>
        <button type="button" className={tab === "installation" ? "active" : ""} onClick={() => setTab("installation")}>INSTALACIÓN</button>
      </div>

      {tab === "runtime" && (loading ? <div className="instance-settings-loading"><Loader2 className="spin" size={18} /> Cargando ajustes…</div> : (
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
              <button type="button" disabled={browsingJava} onClick={() => void chooseJava()}>{browsingJava ? "ABRIENDO…" : "EXAMINAR JAVA"}</button>
            </div>
            <small className="instance-settings-hint">Examinar abre un selector nativo de Windows limitado a java.exe/javaw.exe. La ruta sólo se guarda si confirmas los cambios.</small>
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
      ))}

      {tab === "installation" && (
        <div className="instance-settings-grid installation-settings-grid">
          <article className="instance-settings-card wide installation-warning-card">
            <span className="eyebrow">INSTALACIÓN</span>
            <h3>Minecraft y loader</h3>
            <p>Cambiar esta combinación conserva la carpeta del juego y los mundos. Mods, resource packs y otros archivos existentes no se eliminan automáticamente, por lo que debes revisar su compatibilidad después del cambio.</p>
            {running && <div className="instance-installation-lock">Minecraft está en ejecución. Cierra el juego para modificar o reparar la instalación.</div>}
          </article>

          <article className="instance-settings-card">
            <span className="eyebrow">MINECRAFT</span>
            <h3>Versión del juego</h3>
            <label className="field-label">VERSIÓN
              <select className="nexa-input" value={minecraftVersion} disabled={installationLoading || installationSaving || repairing || running} onChange={(event) => setMinecraftVersion(event.target.value)}>
                {!minecraftVersions.some((item) => item.id === minecraftVersion) && <option value={minecraftVersion}>{minecraftVersion}</option>}
                {minecraftVersions.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
              </select>
            </label>
            <small className="instance-settings-hint">Sólo se ofrecen releases disponibles en el catálogo oficial que NEXA ya utiliza al crear perfiles.</small>
          </article>

          <article className="instance-settings-card">
            <span className="eyebrow">LOADER</span>
            <h3>Plataforma</h3>
            <label className="field-label">LOADER
              <select className="nexa-input" value={loader} disabled={installationLoading || installationSaving || repairing || running} onChange={(event) => setLoader(event.target.value as LoaderName)}>
                {loaders.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            {loader !== "Vanilla" && (
              <label className="field-label installation-loader-version">VERSIÓN DEL LOADER
                <select className="nexa-input" value={loaderVersion} disabled={installationLoading || installationSaving || repairing || running || loaderVersions.length === 0} onChange={(event) => setLoaderVersion(event.target.value)}>
                  {loaderVersions.length === 0 && <option value="">Sin versiones disponibles</option>}
                  {loaderVersions.map((item) => <option key={item.version} value={item.version}>{item.version}{item.stable ? " · estable" : ""}</option>)}
                </select>
              </label>
            )}
          </article>

          <article className="instance-settings-card wide instance-repair-card">
            <span className="eyebrow">MANTENIMIENTO</span>
            <h3>Verificar y reparar</h3>
            <p>Vuelve a ejecutar el instalador de la combinación activa. Los recursos con hash válido se reutilizan; los archivos ausentes o dañados se descargan de nuevo. La carpeta <code>game</code>, mundos, mods y ajustes del usuario no se eliminan.</p>
            <button className="secondary-button" type="button" disabled={running || repairing || installationSaving || installationChanged} onClick={() => void repairInstallation()}>
              {repairing ? <Loader2 className="spin" size={15} /> : <Refresh width={15} height={15} />} {repairing ? "REPARANDO…" : "VERIFICAR Y REPARAR INSTALACIÓN"}
            </button>
            {installationChanged && <small className="instance-settings-hint">Aplica o descarta los cambios pendientes antes de reparar la instalación activa.</small>}
          </article>
        </div>
      )}
    </section>
  );
}
