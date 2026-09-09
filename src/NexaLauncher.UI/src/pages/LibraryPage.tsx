import type { CSSProperties } from "react";
import { ArrowDownUp, Clock3, Grid2X2, Loader2, MoreVertical, Play, Plus, Search } from "lucide-react";
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
    backgroundImage: `linear-gradient(90deg, rgba(4,6,10,.97) 0%, rgba(5,7,11,.78) 42%, rgba(5,7,11,.18) 100%), linear-gradient(180deg, transparent 54%, rgba(4,6,10,.72)), url(${recent.backgroundDataUrl})`,
    "--nexa-bg-position": `${recentArtwork.backgroundPositionX}% ${recentArtwork.backgroundPositionY}%`,
    "--nexa-bg-fit": recentArtwork.backgroundFit,
  } : undefined;

  return (
    <section className="page library-page launcher-home">
      <div className="home-section-title nexa-home-heading">
        <div>
          <span className="eyebrow">NEXA CLIENT</span>
          <h1>Inicio</h1>
        </div>
        <div className="home-heading-actions">
          <span className="home-core-status"><span className="status-dot" /> NEXA listo</span>
          <button className="primary-button" type="button" onClick={onCreate}><Plus size={17} /> CREAR INSTANCIA</button>
        </div>
      </div>

      {recent ? (
        <section className="play-section nexa-featured-play">
          <div className="recent-instance recent-instance-hero" style={recentStyle} onClick={() => onOpen(recent)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(recent); }}>
            <div className="hero-instance-content">
              <span className="hero-instance-label">ÚLTIMA INSTANCIA</span>
              <div className="hero-instance-title-row">
                <ArtworkViewport
                  src={recent.iconDataUrl ?? "./brand/nexa-mark.png"}
                  fit={recentArtwork.iconFit}
                  positionX={recentArtwork.iconPositionX}
                  positionY={recentArtwork.iconPositionY}
                  zoom={recentArtwork.iconZoom}
                  className="recent-instance-icon hero-instance-icon"
                />
                <div className="recent-instance-copy hero-instance-copy">
                  <strong>{recent.name}</strong>
                  <div className="hero-instance-meta">
                    <span>{recent.minecraftVersion}</span>
                    <span className="meta-separator" />
                    <span>{recent.loader}</span>
                    <span className="meta-separator" />
                    <span><Clock3 size={13} /> Reciente</span>
                  </div>
                </div>
              </div>
              <div className="hero-instance-actions">
                <button className="play-button home-play-button" type="button" disabled={launchingProfileId === recent.id} onClick={(event) => { event.stopPropagation(); onPlay(recent); }}>
                  {launchingProfileId === recent.id ? <Loader2 className="spin" size={18} /> : <Play size={18} fill="currentColor" />} JUGAR
                </button>
                <button className="instance-more hero-more" type="button" aria-label="Abrir instancia" onClick={(event) => { event.stopPropagation(); onOpen(recent); }}><MoreVertical size={18} /></button>
              </div>
            </div>
            {!recent.backgroundDataUrl && <div className="nexa-hero-geometry" aria-hidden="true"><span /><span /><span /></div>}
          </div>
        </section>
      ) : (
        <section className="empty-home-hero">
          <img src="./brand/nexa-mark.png" alt="NEXA" />
          <div><strong>No hay instancias todavía</strong><span>Crea una instancia para comenzar.</span></div>
          <button className="primary-button" type="button" onClick={onCreate}><Plus size={17} /> CREAR INSTANCIA</button>
        </section>
      )}

      <section className="library-section nexa-library-section">
        <div className="section-heading library-heading-row">
          <div><h2>Biblioteca</h2><span className="library-count">{profiles.length}</span></div>
          <div className="library-view-indicator"><Grid2X2 size={14} /> Instancias</div>
        </div>
        <div className="library-command-row">
          <div className="search-field library-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar instancias" /></div>
          <button className="primary-button" type="button" onClick={onCreate}><Plus size={16} /> CREAR INSTANCIA</button>
        </div>
        <div className="library-filter-row">
          <button className="filter-chip active" type="button"><ArrowDownUp size={15} /> Última vez jugado</button>
          <span className="library-result-count">{visible.length} visibles</span>
        </div>

        {visible.length > 0 ? (
          <div className="profile-grid home-profile-grid">
            {visible.map((profile) => <ProfileCard key={profile.id} profile={profile} launching={launchingProfileId === profile.id} onOpen={onOpen} onPlay={onPlay} />)}
          </div>
        ) : (
          <div className="empty-state glass-panel compact-empty">
            <img className="empty-brand-mark" src="./brand/nexa-mark.png" alt="NEXA" />
            <h2>{profiles.length ? "No encontramos instancias" : "Biblioteca vacía"}</h2>
            <p>{profiles.length ? "Prueba con otra búsqueda." : "Crea tu primera instancia para empezar."}</p>
            {!profiles.length && <button className="primary-button" type="button" onClick={onCreate}><Plus size={17} /> CREAR INSTANCIA</button>}
          </div>
        )}
      </section>
    </section>
  );
}
