import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Gamepad2,
  Layers3,
  ShieldCheck,
  Shirt,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { NexaAccountState, NexaProfile } from "../app/types";

type Props = {
  account: NexaAccountState;
  profiles: NexaProfile[];
  onOpenAccount(): void;
  onOpenLibrary(): void;
};

export function PremiumHubPage({ account, profiles, onOpenAccount, onOpenLibrary }: Props) {
  const activeCape = account.capes.find((cape) => cape.active);
  const latestProfile = [...profiles]
    .filter((profile) => profile.lastPlayedAt)
    .sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))[0] ?? profiles[0] ?? null;

  return (
    <section className="page premium-hub-page">
      <div className="premium-hero glass-panel">
        <div className="premium-hero-copy">
          <div className="premium-kicker"><Crown size={14} /> NEXA PREMIUM</div>
          <h1>Tu launcher, ahora conectado a tu identidad real de Minecraft.</h1>
          <p>
            Premium amplía NEXA sin reemplazar el modo local: mantiene tus perfiles y herramientas base, y añade identidad oficial,
            sesión online y gestión de apariencia desde una capa nativa segura.
          </p>
          <div className="premium-hero-actions">
            <button className="primary-button premium-primary-action" type="button" onClick={onOpenLibrary}>
              <Gamepad2 size={16} /> IR A MI BIBLIOTECA
            </button>
            <button className="ghost-button premium-secondary-action" type="button" onClick={onOpenAccount}>
              <UserRound size={16} /> GESTIONAR CUENTA
            </button>
          </div>
        </div>

        <div className="premium-identity-card">
          <div className="premium-identity-mark">
            <img src="./brand/original/NEXA%20N.png" alt="NEXA" />
          </div>
          <div className="premium-identity-copy">
            <span>IDENTIDAD VERIFICADA</span>
            <strong>{account.minecraftName ?? "Minecraft Player"}</strong>
            <small>{account.microsoftAccount ?? "Cuenta Microsoft conectada"}</small>
          </div>
          <div className="premium-verified"><CheckCircle2 size={15} /> Minecraft Java</div>
        </div>
      </div>

      <div className="premium-metrics" aria-label="Resumen Premium">
        <Metric icon={<Gamepad2 size={18} />} label="PERFILES" value={String(profiles.length)} detail={latestProfile ? `Último: ${latestProfile.name}` : "Crea tu primer perfil"} />
        <Metric icon={<Shirt size={18} />} label="SKIN" value={account.activeSkinVariant?.toUpperCase() ?? "CLASSIC"} detail={account.activeSkinUrl ? "Sincronizada con Minecraft" : "Sin skin activa"} />
        <Metric icon={<Layers3 size={18} />} label="CAPAS" value={String(account.capes.length)} detail={activeCape?.alias ?? "Sin capa activa"} />
        <Metric icon={<ShieldCheck size={18} />} label="SESIÓN" value="SEGURA" detail="Tokens fuera del WebView" />
      </div>

      <div className="premium-workspace-grid">
        <article className="premium-tool-card premium-tool-skin glass-panel">
          <div className="premium-tool-icon"><Shirt size={22} /></div>
          <div className="premium-tool-copy">
            <span className="eyebrow">APARIENCIA</span>
            <h2>Skin Manager</h2>
            <p>Gestiona el modelo Classic/Slim y sincroniza tu textura oficial sin exponer rutas locales ni credenciales a React.</p>
            <button type="button" className="premium-link-button" onClick={onOpenAccount}>ABRIR SKIN MANAGER <ArrowRight size={15} /></button>
          </div>
          <div className="premium-skin-visual">
            {account.activeSkinUrl ? (
              <img src={account.activeSkinUrl} alt={`Skin activa de ${account.minecraftName ?? "Minecraft"}`} />
            ) : (
              <Shirt size={42} />
            )}
          </div>
        </article>

        <article className="premium-tool-card glass-panel">
          <div className="premium-tool-icon"><ShieldCheck size={22} /></div>
          <div className="premium-tool-copy">
            <span className="eyebrow">CUENTA</span>
            <h2>Identidad y seguridad</h2>
            <p>La sesión Premium se mantiene en la capa nativa. NEXA Web sólo recibe metadatos públicos del perfil.</p>
            <button type="button" className="premium-link-button" onClick={onOpenAccount}>VER CUENTA <ArrowRight size={15} /></button>
          </div>
        </article>

        <article className="premium-tool-card glass-panel">
          <div className="premium-tool-icon"><Gamepad2 size={22} /></div>
          <div className="premium-tool-copy">
            <span className="eyebrow">LAUNCHER</span>
            <h2>Biblioteca unificada</h2>
            <p>Tus perfiles locales siguen siendo tuyos. Premium sólo cambia la identidad de lanzamiento cuando la sesión oficial está disponible.</p>
            <button type="button" className="premium-link-button" onClick={onOpenLibrary}>VER PERFILES <ArrowRight size={15} /></button>
          </div>
        </article>

        <article className="premium-tool-card premium-tool-roadmap glass-panel">
          <div className="premium-tool-icon"><Sparkles size={22} /></div>
          <div className="premium-tool-copy">
            <span className="eyebrow">NEXA PREMIUM</span>
            <h2>Base preparada para crecer</h2>
            <p>Este hub será el punto de entrada para herramientas Premium futuras sin contaminar ni bloquear la experiencia local de NEXA Base.</p>
            <div className="premium-roadmap-tags"><span>Cuenta</span><span>Skins</span><span>Capas</span><span>Sesión oficial</span></div>
          </div>
        </article>
      </div>
    </section>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="premium-metric glass-panel">
      <span className="premium-metric-icon">{icon}</span>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}
