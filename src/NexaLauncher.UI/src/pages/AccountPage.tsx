import { Check, Crown, Gamepad2, Loader2, LogIn, LogOut, Save, ShieldCheck, Shirt, Sparkles, Upload, UserPlus, UserRound } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { NexaAccountState } from "../app/types";

export type SkinVariant = "classic" | "slim";

type Props = {
  account: NexaAccountState;
  busy: boolean;
  localUsername: string;
  onUpdateLocalUsername(username: string): Promise<void>;
  onSignIn(): Promise<void>;
  onSignOut(): Promise<void>;
  onUploadSkin(variant: SkinVariant): Promise<void>;
};

export function AccountPage({ account, busy, localUsername, onUpdateLocalUsername, onSignIn, onSignOut, onUploadSkin }: Props) {
  const initialVariant: SkinVariant = account.activeSkinVariant?.toLowerCase() === "slim" ? "slim" : "classic";
  const [variant, setVariant] = useState<SkinVariant>(initialVariant);
  const [localName, setLocalName] = useState(localUsername);
  const [savingLocal, setSavingLocal] = useState(false);

  useEffect(() => {
    setVariant(account.activeSkinVariant?.toLowerCase() === "slim" ? "slim" : "classic");
  }, [account.activeSkinVariant]);

  useEffect(() => setLocalName(localUsername), [localUsername]);

  async function saveLocalName() {
    const next = localName.trim();
    if (!next || next === localUsername || savingLocal) return;
    setSavingLocal(true);
    try {
      await onUpdateLocalUsername(next);
    } finally {
      setSavingLocal(false);
    }
  }

  if (!account.signedIn) {
    return (
      <section className="page account-page">
        <div className="account-heading local-account-heading">
          <div>
            <span className="eyebrow">NEXA ACCOUNT</span>
            <h1>Cuenta</h1>
            <p>Usa NEXA en modo local o conecta Microsoft cuando necesites una sesión oficial.</p>
          </div>
          <div className="local-mode-badge"><Gamepad2 size={15} /> MODO LOCAL</div>
        </div>

        <article className="local-account-card glass-panel">
          <div className="local-account-icon"><UserRound size={27} /></div>
          <div className="local-account-copy">
            <span className="eyebrow">SIN AUTENTICACIÓN OBLIGATORIA</span>
            <h2>Juega con un nombre local</h2>
            <p>NEXA funciona normalmente sin cuenta Microsoft. Puedes crear instancias, instalar contenido, cambiar ajustes e iniciar Minecraft en modo local.</p>
            <div className="local-name-editor">
              <label className="field-label">
                NOMBRE DE JUGADOR
                <input
                  className="nexa-input"
                  value={localName}
                  maxLength={16}
                  autoComplete="off"
                  onChange={(event) => setLocalName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void saveLocalName(); }}
                  placeholder="Player"
                />
              </label>
              <button className="secondary-button" type="button" disabled={savingLocal || !localName.trim() || localName.trim() === localUsername} onClick={saveLocalName}>
                {savingLocal ? <Loader2 className="spin" size={15} /> : <Save size={15} />} GUARDAR NOMBRE
              </button>
            </div>
            <div className="local-account-status"><span className="status-dot" /><strong>{localUsername}</strong><span>se usará para las sesiones locales.</span></div>
          </div>
        </article>

        <div className="account-landing glass-panel premium-connect-panel">
          <div className="account-landing-copy">
            <span className="eyebrow">OPCIONAL · MICROSOFT</span>
            <h1>Conecta tu cuenta oficial de Minecraft.</h1>
            <p>
              Microsoft sólo es necesario para identidad oficial, servidores que exigen autenticación, skins y capas del perfil premium.
              El inicio de sesión se abre en el navegador del sistema y nunca bloquea el uso local del launcher.
            </p>
            <button className="primary-button account-login-button" type="button" disabled={busy || !account.configured} onClick={onSignIn}>
              {busy ? <Loader2 className="spin" size={17} /> : <LogIn size={17} />}
              {busy ? "CONECTANDO…" : "AÑADIR CUENTA MICROSOFT"}
            </button>
            {!account.configured && (
              <div className="account-config-warning">
                <ShieldCheck size={16} />
                <span>Esta build aún no tiene un Client ID público autorizado para NEXA. El modo local sigue disponible sin restricciones del launcher.</span>
              </div>
            )}
            {account.message && <p className="account-message">{account.message}</p>}
          </div>

          <div className="account-feature-grid">
            <Feature icon={<Gamepad2 size={20} />} title="Modo local completo" text="Biblioteca, instancias, mods, mundos, ajustes y ejecución normal sin iniciar sesión." />
            <Feature icon={<ShieldCheck size={20} />} title="Inicio seguro" text="La contraseña nunca entra en React ni en el WebView. Microsoft autentica desde el navegador del sistema." />
            <Feature icon={<Shirt size={20} />} title="Premium opcional" text="Conecta Microsoft únicamente si quieres identidad oficial, sesiones autenticadas, skins y capas." />
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
          <span>Quita la sesión actual del launcher y vuelve al modo local con el nombre {localUsername}.</span>
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
