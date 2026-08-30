import type { CSSProperties } from "react";
import { Boxes, Layers3, Loader2, Plus, Play, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { defaultArtworkPlacement, type NexaProfile } from "../app/types";
import { ArtworkViewport } from "../components/ArtworkViewport";
import { ProfileCard } from "../components/ProfileCard";

type LibraryPageProps = {
  profiles: NexaProfile[];
  launchingProfileId?: string | null;
  onCreate(): void;
  onOpen(profile: NexaProfile): void;
  onPlay(profile: NexaProfile): void;
};

type ArtworkCss = CSSProperties & {
  "--nexa-bg-position"?: string;
  "--nexa-bg-fit"?: string;
};

export function LibraryPage({ profiles, launchingProfileId, onCreate, onOpen, onPlay }: LibraryPageProps) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((profile) => `${profile.name} ${profile.minecraftVersion} ${profile.loader}`.toLowerCase().includes(q));
  }, [profiles, query]);

  const recent = profiles[0];
  const uniqueVersions = useMemo(() => new Set(profiles.map((profile) => profile.minecraftVersion)).size, [profiles]);
  const moddedProfiles = useMemo(() => profiles.filter((profile) => profile.loader.toLowerCase() !== "vanilla").length, [profiles]);
  const recentArtwork = recent?.artwork ?? defaultArtworkPlacement;
  const recentStyle: ArtworkCss | undefined = recent?.backgroundDataUrl ? {
    backgroundImage: `linear-gradient(90deg, rgba(5,9,15,.97) 0%, rgba(5,9,15,.78) 42%, rgba(5,9,15,.25) 100%), url(${recent.backgroundDataUrl})`,
    "--nexa-bg-position": `${recentArtwork.backgroundPositionX}% ${recentArtwork.backgroundPositionY}%`,
    "--nexa-bg-fit": recentArtwork.backgroundFit,
  } : undefined;

  return (
    <section className="page library-page">
      <div className="library-intro">
        <div>
          <span className="eyebrow">NEXA CLIENT · CENTRO DE JUEGO</span>
          <h1>Tu Minecraft, organizado.</h1>
          <p>Cada perfil conserva su versión, loader, contenido y configuración de forma independiente.</p>
        </div>
        <button className="primary-button library-create-button" type="button" onClick={onCreate}><Plus size={17} /> NUEVO PERFIL</button>
      </div>

      {profiles.length > 0 && (
        <div className="library-stats" aria-label="Resumen de biblioteca">
          <div className="library-stat glass-panel"><Layers3 size={17} /><span><strong>{profiles.length}</strong><small>{profiles.length === 1 ? "perfil" : "perfiles"}</small></span></div>
          <div className="library-stat glass-panel"><Sparkles size={17} /><span><strong>{uniqueVersions}</strong><small>{uniqueVersions === 1 ? "versión" : "versiones"}</small></span></div>
          <div className="library-stat glass-panel"><Boxes size={17} /><span><strong>{moddedProfiles}</strong><small>con loader</small></span></div>
        </div>
      )}

      {recent && (
        <div className="continue-panel glass-panel" style={recentStyle} onClick={() => onOpen(recent)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(recent); }}>
          <div className="continue-icon">
            <ArtworkViewport
              src={recent.iconDataUrl ?? "./brand/nexa-mark.png"}
              fit={recentArtwork.iconFit}
              positionX={recentArtwork.iconPositionX}
              positionY={recentArtwork.iconPositionY}
              zoom={recentArtwork.iconZoom}
              className="continue-icon-viewport"
            />
          </div>
          <div className="continue-copy">
            <span>CONTINUAR JUGANDO</span>
            <h2>{recent.name}</h2>
            <p>{recent.loader} · Minecraft {recent.minecraftVersion}</p>
            <small>Abre el perfil para administrar mods, recursos, rendimiento y opciones de lanzamiento.</small>
          </div>
          <button className="play-button" type="button" disabled={launchingProfileId === recent.id} onClick={(event) => { event.stopPropagation(); onPlay(recent); }}>
            {launchingProfileId === recent.id ? <Loader2 className="spin" size={18} /> : <Play size={18} fill="currentColor" />} INICIAR
          </button>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="library-section-heading">
          <div><span className="eyebrow">BIBLIOTECA</span><h2>Perfiles</h2></div>
          <div className="library-toolbar">
            <div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, versión o loader" /></div>
            <span>{visible.length} de {profiles.length}</span>
          </div>
        </div>
      )}

      {visible.length > 0 ? (
        <div className="profile-grid">
          {visible.map((profile) => <ProfileCard key={profile.id} profile={profile} launching={launchingProfileId === profile.id} onOpen={onOpen} onPlay={onPlay} />)}
          {!query && (
            <button className="create-profile-card" type="button" onClick={onCreate}>
              <span><Plus size={24} /></span>
              <strong>Crear otro perfil</strong>
              <small>Nueva versión, modpack o configuración aislada.</small>
            </button>
          )}
        </div>
      ) : (
        <div className="empty-state glass-panel">
          <img className="empty-brand-mark" src="./brand/nexa-mark.png" alt="NEXA" />
          <h2>{profiles.length ? "No encontramos perfiles" : "Crea tu primer espacio de juego"}</h2>
          <p>{profiles.length ? "Prueba con otro nombre, versión o loader." : "NEXA separará mundos, mods, resource packs y ajustes para que cada instalación permanezca limpia y fácil de mantener."}</p>
          {!profiles.length && <button className="primary-button" type="button" onClick={onCreate}><Plus size={17} /> CREAR PRIMER PERFIL</button>}
        </div>
      )}
    </section>
  );
}
