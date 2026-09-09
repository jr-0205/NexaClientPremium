import { Check, Crown, Loader2, LogIn, LogOut, ShieldCheck, Shirt, Sparkles, Upload, UserPlus, UserRound } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { NexaAccountState } from "../app/types";

export type SkinVariant = "classic" | "slim";

type Props = {
  account: NexaAccountState;
  busy: boolean;
  onSignIn(): Promise<void>;
  onSignOut(): Promise<void>;
  onUploadSkin(variant: SkinVariant): Promise<void>;
};

export function AccountPage({ account, busy, onSignIn, onSignOut, onUploadSkin }: Props) {
  const initialVariant: SkinVariant = account.activeSkinVariant?.toLowerCase() === "slim" ? "slim" : "classic";
  const [variant, setVariant] = useState<SkinVariant>(initialVariant);

  useEffect(() => {
    setVariant(account.activeSkinVariant?.toLowerCase() === "slim" ? "slim" : "classic");
  }, [account.activeSkinVariant]);

  if (!account.signedIn) {
    return (
      <section className="page account-page">
        <div className="account-landing glass-panel">
          <div className="account-landing-copy">
            <span className="eyebrow">CUENTA · MICROSOFT</span>
            <h1>Conecta tu cuenta oficial de Minecraft.</h1>
            <p>
              NEXA puede funcionar en modo local sin iniciar sesión. Al conectar Microsoft se habilitan la identidad oficial de Minecraft Java,
              sesiones online, skins y capas. El inicio de sesión siempre se abre en tu navegador del sistema.
            </p>
            <button className="primary-button account-login-button" type="button" disabled={busy || !account.configured} onClick={onSignIn}>
              {busy ? <Loader2 className="spin" size={17} /> : <LogIn size={17} />}
              {busy ? "CONECTANDO…" : "AÑADIR CUENTA MICROSOFT"}
            </button>
            {!account.configured && (
              <div className="account-config-warning">
                <ShieldCheck size={16} />
                <span>Esta build aún no tiene configurado un Client ID público autorizado para NEXA.</span>
              </div>
            )}
            {account.message && <p className="account-message">{account.message}</p>}
          </div>

          <div className="account-feature-grid">
            <Feature icon={<ShieldCheck size={20} />} title="Inicio seguro" text="La contraseña nunca entra en React ni en el WebView. Microsoft autentica desde el navegador del sistema." />
            <Feature icon={<UserRound size={20} />} title="Perfil oficial" text="NEXA usa tu nombre y UUID reales de Minecraft para las sesiones autenticadas." />
            <Feature icon={<Shirt size={20} />} title="Skins y capas" text="Administra la apariencia de tu perfil oficial sin exponer credenciales ni rutas locales a la interfaz web." />
          </div>
        </div>
      </section>
    );
  }

  const activeCape = account.capes.find((cape) => cape.active);

  return (
    <section className="page account-page">
      <div className="account-heading">
        <div>
          <span className="eyebrow">NEXA ACCOUNT</span>
          <h1>Cuenta</h1>
          <p>Identidad oficial de Minecraft, apariencia y sesión activa del launcher.</p>
        </div>
        <div className="account-heading-actions">
          <button className="secondary-button" type="button" disabled={busy} onClick={onSignIn}>
            {busy ? <Loader2 className="spin" size={15} /> : <UserPlus size={15} />} CAMBIAR / AÑADIR CUENTA
          </button>
          <div className="premium-badge"><Crown size={15} /> PREMIUM ACTIVO</div>
        </div>
      </div>

      <div className="account-dashboard">
        <article className="account-profile-card glass-panel">
          <div className="account-profile-mark">
            <img src="./brand/original/NEXA%20N.png" alt="NEXA" />
          </div>
          <div className="account-profile-copy">
            <span className="eyebrow">MINECRAFT: JAVA EDITION</span>
            <h2>{account.minecraftName ?? "Minecraft Player"}</h2>
            <p>{account.microsoftAccount ?? "Cuenta Microsoft conectada"}</p>
            <code>{formatUuid(account.minecraftId)}</code>
          </div>
          <div className="account-profile-status">
            <div className="account-verified"><Check size={15} /> Licencia verificada</div>
            <span className="account-session-chip"><span className="status-dot" /> SESIÓN ACTIVA</span>
          </div>
        </article>

        <article className="skin-manager glass-panel">
          <div className="skin-manager-copy">
            <span className="eyebrow">APARIENCIA</span>
            <h2>Skin de Minecraft</h2>
            <p>Selecciona una skin PNG desde Windows. La ruta local permanece en la capa nativa y nunca se entrega a React.</p>

            <div className="skin-variant-picker" role="group" aria-label="Modelo de skin">
              <button type="button" className={variant === "classic" ? "active" : ""} onClick={() => setVariant("classic")} disabled={busy}>
                CLASSIC <small>Steve · brazos de 4 px</small>
              </button>
              <button type="button" className={variant === "slim" ? "active" : ""} onClick={() => setVariant("slim")} disabled={busy}>
                SLIM <small>Alex · brazos de 3 px</small>
              </button>
            </div>

            <button className="primary-button skin-upload-button" type="button" disabled={busy} onClick={() => onUploadSkin(variant)}>
              {busy ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
              {busy ? "ACTUALIZANDO…" : "CAMBIAR SKIN"}
            </button>
            <span className="skin-upload-hint">PNG · 64×64 recomendado · máximo 1 MB</span>
          </div>

          <div className="skin-preview-shell">
            {account.activeSkinUrl ? (
              <img className="skin-texture-preview" src={account.activeSkinUrl} alt={`Skin activa de ${account.minecraftName ?? "Minecraft"}`} />
            ) : (
              <div className="skin-preview-empty"><Shirt size={34} /><span>No hay skin activa disponible.</span></div>
            )}
            <div className="skin-preview-meta">
              <span><Sparkles size={14} /> SKIN ACTIVA</span>
              <strong>{account.activeSkinVariant?.toUpperCase() ?? "CLASSIC"}</strong>
            </div>
          </div>
        </article>

        <article className="account-security-card glass-panel">
          <ShieldCheck size={22} />
          <div>
            <span className="eyebrow">SEGURIDAD DE SESIÓN</span>
            <h3>Credenciales fuera de la interfaz web</h3>
            <p>Microsoft, Xbox, XSTS y Minecraft permanecen en la capa nativa. React sólo recibe información pública y sanitizada del perfil.</p>
          </div>
        </article>

        <article className="account-cape-card glass-panel">
          <span className="eyebrow">CAPA</span>
          <h3>{activeCape?.alias ?? "Sin capa activa"}</h3>
          <p>{account.capes.length > 0 ? `${account.capes.length} capa(s) detectadas en tu perfil.` : "Minecraft no devolvió capas para esta cuenta."}</p>
          {activeCape?.url && <img src={activeCape.url} alt={activeCape.alias} />}
        </article>
      </div>

      <div className="account-danger-row">
        <div>
          <strong>Cerrar sesión en NEXA</strong>
          <span>Quita la sesión actual del launcher y vuelve al modo local.</span>
        </div>
        <button className="ghost-button" type="button" disabled={busy} onClick={onSignOut}><LogOut size={15} /> CERRAR SESIÓN</button>
      </div>
    </section>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="account-feature"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function formatUuid(id?: string | null) {
  if (!id || id.length !== 32) return id ?? "UUID no disponible";
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}
