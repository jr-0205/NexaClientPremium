import { Check, Gamepad2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getNexaInGameStatus, installNexaInGame } from "../app/nexa-bridge";
import type { NexaInGameStatus, NexaProfile } from "../app/types";

type Props = {
  profile: NexaProfile;
  launching: boolean;
  onNotice(message: string, kind?: "success" | "error"): void;
};

type ParsedVersion = {
  core: [number, number, number];
  prerelease: string[] | null;
};

function installedVersionFromFileName(fileName?: string | null) {
  if (!fileName) return null;
  const match = fileName.match(/-(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)\.jar$/i);
  return match?.[1] ?? null;
}

function parseVersion(value?: string | null): ParsedVersion | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? null,
  };
}

function compareVersions(left?: string | null, right?: string | null) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return left === right ? 0 : null;

  for (let index = 0; index < a.core.length; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] > b.core[index] ? 1 : -1;
  }

  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;

  const count = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < count; index += 1) {
    const av = a.prerelease[index];
    const bv = b.prerelease[index];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (av === bv) continue;

    const an = /^\d+$/.test(av) ? Number(av) : null;
    const bn = /^\d+$/.test(bv) ? Number(bv) : null;
    if (an !== null && bn !== null) return an > bn ? 1 : -1;
    if (an !== null) return -1;
    if (bn !== null) return 1;
    return av.localeCompare(bv) > 0 ? 1 : -1;
  }
  return 0;
}

export function NexaInGameAction({ profile, launching, onNotice }: Props) {
  const [status, setStatus] = useState<NexaInGameStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus(null);
    getNexaInGameStatus(profile.id)
      .then((result) => { if (active) setStatus(result); })
      .catch((error: Error) => {
        if (!active) return;
        onNotice(error.message, "error");
      });
    return () => { active = false; };
  }, [profile.id]);

  const installedVersion = useMemo(
    () => installedVersionFromFileName(status?.fileName),
    [status?.fileName],
  );
  const versionComparison = useMemo(
    () => compareVersions(status?.version, installedVersion),
    [status?.version, installedVersion],
  );
  const updateAvailable = Boolean(
    status?.installed &&
    status.available &&
    status.version &&
    installedVersion &&
    versionComparison === 1,
  );

  async function installOrRepair() {
    if (busy || launching || !status) return;

    if (!status.available) {
      onNotice(status.installed
        ? "NEXA In-Game está instalado, pero no hay una build publicada disponible para reinstalar o actualizar ahora mismo."
        : status.message, "error");
      return;
    }

    const wasInstalled = status.installed;
    setBusy(true);
    try {
      const result = await installNexaInGame(profile.id);
      const refreshed = await getNexaInGameStatus(profile.id);
      setStatus(refreshed);
      const cache = result.usedCache ? " Se reutilizó la caché verificada." : "";
      onNotice(
        wasInstalled
          ? `NEXA In-Game ${result.version} reinstalado/actualizado correctamente.${cache}`
          : `NEXA In-Game ${result.version} instalado. Shift derecho ya está listo.${cache}`,
        "success",
      );
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudo instalar NEXA In-Game.", "error");
    } finally {
      setBusy(false);
    }
  }

  const label = busy
    ? status?.installed ? "REINSTALANDO / ACTUALIZANDO…" : "INSTALANDO NEXA IN-GAME…"
    : updateAvailable
      ? `NEXA IN-GAME · ACTUALIZAR ${status?.version}`
      : status?.installed
        ? "NEXA IN-GAME · LISTO"
        : status?.available
          ? "AÑADIR NEXA IN-GAME"
          : status
            ? "NEXA IN-GAME · BUILD PENDIENTE"
            : "NEXA IN-GAME";

  const maintenanceLabel = updateAvailable
    ? `ACTUALIZAR A ${status?.version}`
    : "REINSTALAR";

  return (
    <div className="ingame-action-stack">
      <button
        className={`secondary-button ${status?.installed ? "boost-active-button" : ""}`}
        type="button"
        disabled={busy || launching || !status || (!status.installed && !status.available)}
        title={status?.message ?? "Comprobando una build compatible con este perfil…"}
        onClick={status?.installed ? undefined : installOrRepair}
      >
        {busy ? <Loader2 className="spin" size={16} /> : status?.installed ? <Check size={16} /> : <Gamepad2 size={16} />}
        {label}
      </button>

      {status?.installed && (
        <button
          className={`ghost-button ingame-maintenance-button ${updateAvailable ? "update-available" : ""}`}
          type="button"
          disabled={busy || launching || !status.available}
          title={status.available
            ? updateAvailable
              ? `Sustituye ${installedVersion ?? "la build instalada"} por NEXA In-Game ${status.version}.`
              : versionComparison === -1
                ? `La build instalada (${installedVersion}) es más nueva que la publicada (${status.version}); NEXA no ofrecerá un downgrade automático.`
                : "Reinstala la misma build publicada y vuelve a verificar su SHA-256."
            : "No hay una build publicada disponible para mantenimiento en este momento."}
          onClick={installOrRepair}
        >
          {busy ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
          {maintenanceLabel}
        </button>
      )}
    </div>
  );
}
