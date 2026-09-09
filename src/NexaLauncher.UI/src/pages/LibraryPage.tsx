import type { CSSProperties } from "react";
import { ArrowDownUp, Clock3, Grid2X2, Loader2, MoreVertical, Play, Plus, Search, SlidersHorizontal, Sparkles } from "lucide-react";
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
  const recentArtwork = recent?.artwork ?? defaultArtworkPlacement;
  const recentStyle: ArtworkCss | undefined = recent?.backgroundDataUrl ? {
    backgroundImage: `linear-gradient(90deg, rgba(7,10,16,.98), rgba(7,10,16,.74)), url(${recent.backgroundDataUrl})`,
    "--nexa-bg-position": `${recentArtwork.backgroundPositionX}% ${recentArtwork.backgroundPositionY}%`,
    "--nexa-bg-fit": recentArtwork.backgroundFit,
  } : undefined;

  return (
    <section className="page library-page launcher-home">
      <div className="launcher-home-grid">
        <div className="launcher-home-main">
          <div className="home-section-title">
            <div><span className="eyebrow">NEXA CLIENT</span><h1>Inicio</h1></div>
            <button className="primary-button" type="button" onClick={onCreate}><Plus size={17} /> CREAR INSTANCIA</button>
          </div>

          {recent && (
            <section className="play-section">
              <div className="section-heading"><h2>Jugar</h2><span className="section-line" /></div>
              <div className="recent-instance glass-panel" style={recentStyle} onClick={() => onOpen(recent)} role="button" tabIndex={0}>
                <ArtworkViewport
                  src={recent.iconDataUrl ?? "./brand/nexa-mark.png"}
                  fit={recentArtwork.iconFit}
                  positionX={recentArtwork.iconPositionX}
                  positionY={recentArtwork.iconPositionY}
                  zoom={recentArtwork.iconZoom}
                  className="recent-instance-icon"
                />
                <div className="recent-instance-copy">
                  <strong>{recent.name}</strong>
                  <span>{recent.loader} {recent.minecraftVersion}</span>
                </div>
                <div className="recent-instance-time"><Clock3 size={14} /><span>Última instancia</span></div>
                <button className="play-button home-play-button" type="button" disabled={launchingProfileId === recent.id} onClick={(event) => { event.stopPropagation(); onPlay(recent); }}>
                  {launchingProfileId === recent.id ? <Loader2 className="spin" size={18} /> : <Play size={18} fill="currentColor" />} JUGAR
                </button>
                <button className="instance-more" type="button" aria-label="Más opciones" onClick={(event) => event.stopPropagation()}><MoreVertical size={18} /></button>
              </div>
            </section>
          )}

          <section className="library-section">
            <div className="section-heading"><h2>Biblioteca</h2><span className="library-count">{profiles.length}</span></div>
            <div className="library-command-row">
              <div className="search-field library-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar instancias" /></div>
              <button className="secondary-button" type="button"><Grid2X2 size={16} /> GRUPO PERSONALIZADO</button>
              <button className="primary-button" type="button" onClick={onCreate}><Plus size={16} /> CREAR INSTANCIA</button>
            </div>
            <div className="library-filter-row">
              <button className="filter-chip active" type="button"><ArrowDownUp size={15} /> Última vez jugado</button>
              <button className="filter-chip" type="button"><Grid2X2 size={15} /> Todas</button>
              <button className="filter-chip" type="button"><SlidersHorizontal size={15} /> Añadir filtro</button>
            </div>

            {visible.length > 0 ? (
              <div className="profile-grid home-profile-grid">
                {visible.map((profile) => <ProfileCard key={profile.id} profile={profile} launching={launchingProfileId === profile.id} onOpen={onOpen} onPlay={onPlay} />)}
              </div>
            ) : (
              <div className="empty-state glass-panel compact-empty">
                <img className="empty-brand-mark" src="./brand/nexa-mark.png" alt="NEXA" />
                <h2>{profiles.length ? "No encontramos instancias" : "Tu biblioteca está lista"}</h2>
                <p>{profiles.length ? "Prueba con otra búsqueda." : "Crea tu primera instancia. Mundos, mods y configuración permanecerán aislados."}</p>
                {!profiles.length && <button className="primary-button" type="button" onClick={onCreate}><Plus size={17} /> CREAR INSTANCIA</button>}
              </div>
            )}
          </section>
        </div>

        <aside className="launcher-home-rail">
          <section className="rail-card account-rail-card">
            <span className="rail-label">ESTADO</span>
            <div className="rail-status"><span className="status-dot" /><div><strong>NEXA listo</strong><small>No hay instancias en ejecución</small></div></div>
          </section>
          <section className="rail-card">
            <div className="rail-heading"><span>Novedades</span><Sparkles size={16} /></div>
            <article className="news-card accent-news"><span className="eyebrow">NEXA CLIENT</span><strong>Nuevo diseño del launcher</strong><p>Interfaz más compacta, rápida y configurable sin publicidad.</p></article>
            <article className="news-card"><strong>Biblioteca aislada</strong><p>Cada instancia conserva su propio contenido, mundos y ajustes.</p></article>
          </section>
          <section className="rail-card rail-tip">
            <span className="rail-label">CONSEJO</span>
            <p>Puedes cambiar el color de énfasis desde Ajustes. Azul, gris, blanco o uno personalizado.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
