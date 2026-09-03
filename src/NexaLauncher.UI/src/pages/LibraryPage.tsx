import type { CSSProperties } from "react";
import { Loader2, Plus, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { defaultArtworkPlacement, type NexaProfile } from "../app/types";
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
    backgroundImage: `linear-gradient(90deg, rgba(5,9,15,.90) 0%, rgba(5,9,15,.62) 44%, rgba(5,9,15,.18) 100%), url(${recent.backgroundDataUrl})`,
    "--nexa-bg-position": `${recentArtwork.backgroundPositionX}% ${recentArtwork.backgroundPositionY}%`,
    "--nexa-bg-fit": recentArtwork.backgroundFit,
  } : undefined;

  return (
    <section className="page library-page nordic-library">
      <header className="nordic-library-heading">
        <div>
          <span className="eyebrow">BIBLIOTECA</span>
          <h1>¿Qué quieres jugar?</h1>
          <p>Continúa donde lo dejaste o elige otro perfil.</p>
        </div>
        <button className="primary-button nordic-create-button" type="button" onClick={onCreate}><Plus size={16} /> NUEVO PERFIL</button>
      </header>

      {recent ? (
        <div className="nordic-hero-grid nordic-hero-simple">
          <article className="nordic-session-panel" style={recentStyle}>
            <div className="nordic-session-overlay" />
            <div className="nordic-session-content">
              <div>
                <span className="nordic-session-kicker"><i /> JUGADO RECIENTEMENTE</span>
                <h2>{recent.name}</h2>
                <p className="nordic-profile-meta">Minecraft {recent.minecraftVersion} · {recent.loader}</p>
                <div className="nordic-session-actions">
                  <button className="play-button" type="button" disabled={launchingProfileId === recent.id} onClick={() => onPlay(recent)}>
                    {launchingProfileId === recent.id ? <Loader2 className="spin" size={18} /> : <Play size={17} fill="currentColor" />} JUGAR
                  </button>
                  <button className="secondary-button" type="button" onClick={() => onOpen(recent)}>ABRIR PERFIL</button>
                </div>
              </div>

            </div>
          </article>
        </div>
      ) : (
        <div className="nordic-empty-hero">
          <span className="nordic-brand-glyph">ᚾ</span>
          <span className="eyebrow">PRIMERA INSTANCIA</span>
          <h2>Empieza con un espacio limpio.</h2>
          <p>Crea un perfil y NEXA mantendrá versión, loader, mundos, mods y ajustes separados desde el principio.</p>
          <button className="primary-button" type="button" onClick={onCreate}><Plus size={16} /> CREAR PERFIL</button>
        </div>
      )}

      {profiles.length > 0 && (
        <section className="nordic-library-section">
          <div className="nordic-library-toolbar">
            <div>
              <span className="nordic-section-label">TUS PERFILES</span>
              <h2>Elige otro perfil</h2>
            </div>
            <div className="nordic-toolbar-actions">
              <div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar perfil" /></div>
            </div>
          </div>

          {visible.length > 0 ? (
            <div className="profile-grid nordic-profile-grid">
              {visible.map((profile) => <ProfileCard key={profile.id} profile={profile} launching={launchingProfileId === profile.id} onOpen={onOpen} onPlay={onPlay} />)}
              {!query && (
                <button className="create-profile-card" type="button" onClick={onCreate}>
                  <span><Plus size={22} /></span>
                  <strong>Crear otro perfil</strong>
                  <small>Nueva versión, modpack o configuración aislada.</small>
                </button>
              )}
            </div>
          ) : (
            <div className="empty-state glass-panel"><h2>No encontramos perfiles</h2><p>Prueba con otro nombre, versión o loader.</p></div>
          )}
        </section>
      )}
    </section>
  );
}
