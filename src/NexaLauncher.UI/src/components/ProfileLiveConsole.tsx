import { ChevronRight, Clipboard, ExternalLink, File, Folder, FolderOpen, Globe2, Home, RefreshCw, Search, Settings2, Terminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getProfileLiveLogs,
  listProfileFiles,
  listProfileWorlds,
  onBridgeEvent,
  openProfileFile,
  openProfileWorld,
} from "../app/nexa-bridge";
import type {
  NexaProfile,
  ProfileFileListing,
  ProfileLiveLogs,
  ProfileLogSnapshot,
  ProfileWorldListing,
} from "../app/types";
import { InstanceSettingsPanel } from "./InstanceSettingsPanel";

type Props = {
  profile: NexaProfile;
  running: boolean;
  onNotice(message: string, kind?: "success" | "error"): void;
};

type ModuleTab = "files" | "worlds" | "logs" | "settings";
type LogTab = "game" | "launcher" | "crash";
type LogFilter = "all" | "error" | "warn" | "info";

const EMPTY_LOG: ProfileLogSnapshot = {
  available: false,
  path: null,
  text: "",
  updatedAt: null,
  sizeBytes: 0,
};

function tailLines(value: string, maximum = 600) {
  const lines = value.replace(/\r/g, "").split("\n");
  return lines.length <= maximum ? lines.join("\n") : lines.slice(-maximum).join("\n");
}

function lineTone(line: string) {
  if (/\b(fatal|error|exception|crash|caused by:)\b/i.test(line)) return "error";
  if (/\b(warn|warning)\b/i.test(line)) return "warning";
  return "normal";
}

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function ProfileLiveConsole({ profile, running, onNotice }: Props) {
  const [moduleTab, setModuleTab] = useState<ModuleTab>("files");
  const [files, setFiles] = useState<ProfileFileListing | null>(null);
  const [filePath, setFilePath] = useState("");
  const [fileFilter, setFileFilter] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const [worlds, setWorlds] = useState<ProfileWorldListing | null>(null);
  const [worldsLoading, setWorldsLoading] = useState(false);
  const [logTab, setLogTab] = useState<LogTab>("game");
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [logSearch, setLogSearch] = useState("");
  const [logs, setLogs] = useState<ProfileLiveLogs | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [following, setFollowing] = useState(true);
  const consoleBody = useRef<HTMLDivElement>(null);

  async function refreshFiles(path = filePath) {
    setFilesLoading(true);
    try {
      const result = await listProfileFiles(profile.id, path);
      setFiles(result);
      setFilePath(result.path);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudieron leer los archivos del perfil.", "error");
    } finally {
      setFilesLoading(false);
    }
  }

  async function refreshWorlds() {
    setWorldsLoading(true);
    try {
      setWorlds(await listProfileWorlds(profile.id));
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudieron leer los mundos del perfil.", "error");
    } finally {
      setWorldsLoading(false);
    }
  }

  async function refreshLogs() {
    try {
      const result = await getProfileLiveLogs(profile.id);
      setLogs(result);
      setLogError(null);
      return result;
    } catch (error) {
      setLogError(error instanceof Error ? error.message : "No se pudieron leer los logs del perfil.");
      return null;
    }
  }

  useEffect(() => {
    setFiles(null);
    setWorlds(null);
    setFilePath("");
    setFileFilter("");
    setLogs(null);
    setLogError(null);
    setExitCode(null);
    setLogTab("game");
    setModuleTab("files");
    void refreshFiles("");
    void refreshWorlds();
    void refreshLogs();
  }, [profile.id]);

  useEffect(() => {
    if (moduleTab !== "logs") return;
    const timer = window.setInterval(() => void refreshLogs(), running ? 500 : 1800);
    return () => window.clearInterval(timer);
  }, [profile.id, running, moduleTab]);

  useEffect(() => {
    const offStarted = onBridgeEvent<{ profileId: string }>("launch.started", ({ profileId }) => {
      if (profileId !== profile.id) return;
      setExitCode(null);
      setFollowing(true);
      setLogTab("game");
      window.setTimeout(() => void refreshLogs(), 100);
    });

    const offExited = onBridgeEvent<{ profileId: string; exitCode: number }>("launch.exited", ({ profileId, exitCode: code }) => {
      if (profileId !== profile.id) return;
      setExitCode(code);
      window.setTimeout(async () => {
        const result = await refreshLogs();
        if (code !== 0 && result?.crash.available && result.crash.text.trim()) {
          setModuleTab("logs");
          setLogTab("crash");
        }
      }, 300);
      window.setTimeout(() => void refreshLogs(), 1200);
    });

    return () => {
      offStarted();
      offExited();
    };
  }, [profile.id]);

  const activeSnapshot = logs?.[logTab] ?? EMPTY_LOG;
  const activeText = useMemo(() => tailLines(activeSnapshot.text), [activeSnapshot.text]);
  const visibleLogLines = useMemo(() => {
    const needle = logSearch.trim().toLowerCase();
    return activeText.split("\n").filter((line) => {
      const tone = lineTone(line);
      if (logFilter === "error" && tone !== "error") return false;
      if (logFilter === "warn" && tone !== "warning") return false;
      if (logFilter === "info" && tone !== "normal") return false;
      return !needle || line.toLowerCase().includes(needle);
    });
  }, [activeText, logFilter, logSearch]);

  const filteredFiles = useMemo(() => {
    const needle = fileFilter.trim().toLowerCase();
    return !needle ? files?.entries ?? [] : (files?.entries ?? []).filter((entry) => entry.name.toLowerCase().includes(needle));
  }, [files, fileFilter]);

  useEffect(() => {
    if (!following || !consoleBody.current || moduleTab !== "logs") return;
    consoleBody.current.scrollTop = consoleBody.current.scrollHeight;
  }, [visibleLogLines, following, logTab, moduleTab]);

  async function copyLog() {
    const text = visibleLogLines.join("\n");
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      onNotice("Log visible copiado al portapapeles.", "success");
    } catch {
      onNotice("No se pudo copiar el log.", "error");
    }
  }

  function handleScroll() {
    const element = consoleBody.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setFollowing(distanceFromBottom < 36);
  }

  function parentPath() {
    if (!filePath) return "";
    const segments = filePath.split("/").filter(Boolean);
    segments.pop();
    return segments.join("/");
  }

  const breadcrumbs = filePath.split("/").filter(Boolean);
  const sessionLabel = running
    ? "EN EJECUCIÓN"
    : exitCode === null
      ? "EN ESPERA"
      : exitCode === 0
        ? "CERRADO · 0"
        : `ERROR · CÓDIGO ${exitCode}`;

  return (
    <section className="profile-modules glass-panel" aria-label={`Módulos de ${profile.name}`}>
      <header className="profile-modules-head">
        <div>
          <span className="eyebrow">GESTIÓN DE INSTANCIA</span>
          <strong>Archivos, mundos, registros y configuración</strong>
          <span>Minecraft {profile.minecraftVersion} · {profile.loader}{profile.loaderVersion ? ` ${profile.loaderVersion}` : ""}</span>
        </div>
        <div className="profile-module-tabs" role="tablist" aria-label="Módulos del perfil">
          <button type="button" className={moduleTab === "files" ? "active" : ""} onClick={() => setModuleTab("files")}><Folder size={15} /> ARCHIVOS</button>
          <button type="button" className={moduleTab === "worlds" ? "active" : ""} onClick={() => setModuleTab("worlds")}><Globe2 size={15} /> MUNDOS</button>
          <button type="button" className={moduleTab === "logs" ? "active" : ""} onClick={() => setModuleTab("logs")}><Terminal size={15} /> REGISTROS</button>
          <button type="button" className={moduleTab === "settings" ? "active" : ""} onClick={() => setModuleTab("settings")}><Settings2 size={15} /> CONFIGURACIÓN</button>
        </div>
      </header>

      {moduleTab === "files" && (
        <div className="profile-files-module">
          <div className="module-toolbar">
            <div className="file-breadcrumbs">
              <button type="button" title="Raíz de la instancia" onClick={() => void refreshFiles("")}><Home size={14} /></button>
              {breadcrumbs.map((segment, index) => {
                const path = breadcrumbs.slice(0, index + 1).join("/");
                return <span key={path}><ChevronRight size={13} /><button type="button" onClick={() => void refreshFiles(path)}>{segment}</button></span>;
              })}
            </div>
            <div className="module-toolbar-actions">
              <label className="module-search"><Search size={14} /><input value={fileFilter} onChange={(event) => setFileFilter(event.target.value)} placeholder="Buscar en esta carpeta" /></label>
              <button type="button" onClick={() => void refreshFiles()} disabled={filesLoading}><RefreshCw size={14} className={filesLoading ? "spin" : ""} /> ACTUALIZAR</button>
              <button type="button" onClick={() => openProfileFile(profile.id, filePath).catch((error: Error) => onNotice(error.message, "error"))}><ExternalLink size={14} /> EXPLORADOR</button>
            </div>
          </div>

          {filePath && <button className="file-up-row" type="button" onClick={() => void refreshFiles(parentPath())}><FolderOpen size={15} /><span>..</span><small>Subir un nivel</small></button>}

          <div className="profile-file-table">
            <div className="profile-file-head"><span>NOMBRE</span><span>TAMAÑO</span><span>CREADO</span><span>MODIFICADO</span><span>ACCIONES</span></div>
            {filesLoading && !files ? <div className="module-empty">Leyendo archivos de la instancia…</div> : filteredFiles.length === 0 ? <div className="module-empty"><Folder size={25} /><strong>Esta carpeta está vacía</strong><span>No hay archivos que coincidan con el filtro actual.</span></div> : filteredFiles.map((entry) => (
              <div className="profile-file-row" key={entry.relativePath}>
                <button className="file-name-button" type="button" onClick={() => entry.isDirectory ? void refreshFiles(entry.relativePath) : openProfileFile(profile.id, entry.relativePath).catch((error: Error) => onNotice(error.message, "error"))}>
                  {entry.isDirectory ? <Folder size={16} /> : <File size={16} />}<span>{entry.name}</span>
                </button>
                <span>{entry.isDirectory ? "Carpeta" : formatSize(entry.sizeBytes)}</span>
                <span>{formatDate(entry.createdAt)}</span>
                <span>{formatDate(entry.modifiedAt)}</span>
                <button className="module-icon-action" type="button" title="Abrir en Explorador" onClick={() => openProfileFile(profile.id, entry.relativePath).catch((error: Error) => onNotice(error.message, "error"))}><ExternalLink size={14} /></button>
              </div>
            ))}
          </div>
          {files?.truncated && <div className="module-note">La carpeta contiene más de 500 elementos. NEXA muestra los primeros 500 para mantener la interfaz fluida.</div>}
        </div>
      )}

      {moduleTab === "worlds" && (
        <div className="profile-worlds-module">
          <div className="module-toolbar worlds-toolbar">
            <div><strong>Mundos locales</strong><span>{worlds?.serversConfigured ? "servers.dat detectado · servidores guardados en Minecraft" : "Sin servidores guardados detectados"}</span></div>
            <div className="module-toolbar-actions">
              <button type="button" onClick={() => void refreshWorlds()} disabled={worldsLoading}><RefreshCw size={14} className={worldsLoading ? "spin" : ""} /> ACTUALIZAR</button>
              <button type="button" onClick={() => openProfileWorld(profile.id).catch((error: Error) => onNotice(error.message, "error"))}><FolderOpen size={14} /> ABRIR SAVES</button>
            </div>
          </div>

          {worldsLoading && !worlds ? <div className="module-empty">Buscando mundos…</div> : !worlds?.worlds.length ? (
            <div className="module-empty worlds-empty"><Globe2 size={30} /><strong>No hay mundos añadidos</strong><span>Los mundos de Minecraft guardados en esta instancia aparecerán aquí automáticamente.</span><button className="secondary-button" type="button" onClick={() => openProfileWorld(profile.id).catch((error: Error) => onNotice(error.message, "error"))}><FolderOpen size={15} /> ABRIR CARPETA SAVES</button></div>
          ) : (
            <div className="world-card-grid">
              {worlds.worlds.map((world) => (
                <article className="world-card" key={world.relativePath}>
                  <div className="world-card-icon"><Globe2 size={23} /></div>
                  <div className="world-card-copy"><strong>{world.name}</strong><span>{formatSize(world.sizeBytes)} · modificado {formatDate(world.modifiedAt)}</span><small>{world.locked ? "Minecraft mantiene session.lock en este mundo" : "Disponible"}</small></div>
                  <button className="module-icon-action" type="button" title="Abrir carpeta del mundo" onClick={() => openProfileWorld(profile.id, world.relativePath).catch((error: Error) => onNotice(error.message, "error"))}><ExternalLink size={15} /></button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {moduleTab === "logs" && (
        <div className="profile-logs-module">
          <div className="live-console-heading module-log-heading">
            <div className="live-console-title"><Terminal size={18} /><div><span className="eyebrow">DIAGNÓSTICO</span><strong>Live Log</strong><span>{sessionLabel}</span></div></div>
            <div className="live-console-actions">
              <span className={`live-console-status ${running ? "live" : exitCode !== null && exitCode !== 0 ? "failed" : ""}`}>{sessionLabel}</span>
              {!following && <button type="button" onClick={() => setFollowing(true)}>SEGUIR FINAL</button>}
              <button type="button" onClick={() => void refreshLogs()}><RefreshCw size={13} /> ACTUALIZAR</button>
              <button type="button" disabled={!visibleLogLines.length} onClick={() => void copyLog()}><Clipboard size={13} /> COPIAR</button>
            </div>
          </div>

          <div className="logs-control-row">
            <div className="live-console-tabs compact-log-tabs">
              <button className={logTab === "game" ? "active" : ""} type="button" onClick={() => { setLogTab("game"); setFollowing(true); }}>MINECRAFT</button>
              <button className={logTab === "launcher" ? "active" : ""} type="button" onClick={() => { setLogTab("launcher"); setFollowing(true); }}>NEXA</button>
              <button className={`${logTab === "crash" ? "active" : ""} ${logs?.crash.available ? "has-crash" : ""}`} type="button" onClick={() => { setLogTab("crash"); setFollowing(true); }}>CRASH{logs?.crash.available ? " · DETECTADO" : ""}</button>
            </div>
            <label className="module-search log-search"><Search size={14} /><input value={logSearch} onChange={(event) => setLogSearch(event.target.value)} placeholder="Buscar en el registro" /></label>
            <div className="log-filter-chips">
              {(["all", "error", "warn", "info"] as LogFilter[]).map((filter) => <button key={filter} type="button" className={logFilter === filter ? "active" : ""} onClick={() => setLogFilter(filter)}>{filter === "all" ? "TODO" : filter.toUpperCase()}</button>)}
            </div>
          </div>

          {logError ? (
            <div className="live-console-body empty">{logError}</div>
          ) : visibleLogLines.length ? (
            <div className="live-console-body" ref={consoleBody} onScroll={handleScroll}>
              <pre>{visibleLogLines.map((line, index) => <span className={`log-line ${lineTone(line)}`} key={`${index}-${line.slice(0, 18)}`}>{line}{"\n"}</span>)}</pre>
            </div>
          ) : (
            <div className="live-console-body empty" ref={consoleBody}>No hay líneas que coincidan con esta fuente o filtro.</div>
          )}

          <div className="live-console-path" title={activeSnapshot.path ?? ""}>{activeSnapshot.path ?? "Sin archivo todavía"}</div>
        </div>
      )}

      {moduleTab === "settings" && (
        <InstanceSettingsPanel profile={profile} open onClose={() => setModuleTab("files")} onNotice={onNotice} />
      )}
    </section>
  );
}
