import type { CSSProperties } from "react";
import { Boxes, ChevronRight, Layers3, Loader2, Plus, Play, Search, ShieldCheck, Sparkles } from "lucide-react";
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
  const otherProfiles = profiles.slice(1, 4);
  const uniqueVersions = useMemo(() => new Set(profiles.map((profile) => profile.minecraftVersion)).size, [profiles]);
  const moddedProfiles = useMemo(() => profiles.filter((profile) => profile.loader.toLowerCase() !== "vanilla").length, [profiles]);
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
          <span className="eyebrow">NEXA CLIENT · BIBLIOTECA</span>
          <h1>Tu Minecraft. En orden.</h1>
          <p>Perfiles aislados, versiones controladas y una ruta clara para volver a jugar.</p>
        </div>
        <button className="primary-button nordic-create-button" type="button" onClick={onCreate}><Plus size={16} /> NUEVO PERFIL</button>
      </header>

      {recent ? (
        <div className="nordic-hero-grid">
          <aside className="nordic-instance-panel">
            <span className="nordic-section-label">PERFIL SELECCIONADO</span>
            <div className="nordic-instance-identity">
              <div className="nordic-instance-icon">
                <ArtworkViewport
                  src={recent.iconDataUrl ?? "./brand/nexa-mark.png"}
                  fit={recentArtwork.iconFit}
                  positionX={recentArtwork.iconPositionX}
                  positionY={recentArtwork.iconPositionY}
                  zoom={recentArtwork.iconZoom}
                />
              </div>
              <div>
                <h2>{recent.name}</h2>
                <p>Minecraft {recent.minecraftVersion} · {recent.loader}</p>
              </div>
            </div>

            <div className="nordic-divider" />

            <dl className="nordic-instance-facts">
              <div><dt>Versión</dt><dd>{recent.minecraftVersion}</dd></div>
              <div><dt>Loader</dt><dd>{recent.loader}</dd></div>
              <div><dt>Instancia</dt><dd>Aislada</dd></div>
              <div><dt>Integridad</dt><dd className="verified"><ShieldCheck size={13} /> Lista</dd></div>
            </dl>

            {otherProfiles.length > 0 && (
              <div className="nordic-other-profiles">
                <span className="nordic-section-label">OTROS PERFILES</span>
                {otherProfiles.map((profile) => (
                  <button key={profile.id} type="button" onClick={() => onOpen(profile)}>
                    <span><strong>{profile.name}</strong><small>Minecraft {profile.minecraftVersion} · {profile.loader}</small></span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            )}
          </aside>

          <article className="nordic-session-panel" style={recentStyle}>
            <div className="nordic-session-overlay" />
            <div className="nordic-session-content">
              <div>
                <span className="nordic-session-kicker"><i /> INSTANCIA ACTUAL</span>
                <h2>Preparado para entrar.</h2>
                <p>{recent.description || "NEXA resolverá la instancia y mantendrá cada archivo en su lugar mientras tú sólo te concentras en jugar."}</p>
                <div className="nordic-session-actions">
                  <button className="play-button" type="button" disabled={launchingProfileId === recent.id} onClick={() => onPlay(recent)}>
                    {launchingProfileId === recent.id ? <Loader2 className="spin" size={18} /> : <Play size={17} fill="currentColor" />} INICIAR SESIÓN
                  </button>
                  <button className="secondary-button" type="button" onClick={() => onOpen(recent)}>ABRIR PERFIL</button>
                </div>
              </div>

              <div className="nordic-capabilities">
                <div><Boxes size={16} /><span><strong>Contenido</strong><small>Mods y packs por perfil</small></span></div>
                <div><Sparkles size={16} /><span><strong>Runtime</strong><small>Java resuelto automáticamente</small></span></div>
                <div><ShieldCheck size={16} /><span><strong>Aislamiento</strong><small>Mundos y ajustes separados</small></span></div>
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
              <span className="nordic-section-label">TODAS LAS INSTANCIAS</span>
              <h2>Biblioteca</h2>
            </div>
            <div className="nordic-toolbar-actions">
              <div className="nordic-mini-stats">
                <span><Layers3 size={14} /> {profiles.length} perfiles</span>
                <span><Sparkles size={14} /> {uniqueVersions} versiones</span>
                <span><Boxes size={14} /> {moddedProfiles} con loader</span>
              </div>
              <div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar perfil, versión o loader" /></div>
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
