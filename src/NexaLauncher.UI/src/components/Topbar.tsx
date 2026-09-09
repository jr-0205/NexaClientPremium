import { Check, Crown, NavArrowDown, Shirt, Trash, User, Upload } from "iconoir-react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadLocalSkinPreference, onLocalSkinPreferenceChanged, readLocalSkinFile, saveLocalSkinPreference } from "../app/local-skin";

type TopbarProps = {
  title: string;
  username: string;
  isPremium?: boolean;
  onOpenAccount(): void;
  onUpdateLocalUsername(username: string): Promise<void>;
};

export function Topbar({ title, username, isPremium = false, onOpenAccount, onUpdateLocalUsername }: TopbarProps) {
  const initialSkin = loadLocalSkinPreference();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(username || "Player");
  const [saving, setSaving] = useState(false);
  const [skinBusy, setSkinBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSkin, setLocalSkin] = useState(initialSkin.dataUrl);
  const [localVariant] = useState(initialSkin.variant);
  const wrapper = useRef<HTMLDivElement>(null);
  const skinInput = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(username || "Player"), [username]);
  useEffect(() => onLocalSkinPreferenceChanged((next) => setLocalSkin(next.dataUrl)), []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  async function save() {
    const value = draft.trim();
    if (isPremium) return;
    if (!/^[A-Za-z0-9_]{3,16}$/.test(value)) {
      setError("Usa de 3 a 16 caracteres: letras, números o guion bajo.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onUpdateLocalUsername(value);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cambiar el nombre de jugador.");
    } finally {
      setSaving(false);
    }
  }

  async function chooseLocalSkin(file?: File) {
    if (!file || skinBusy) return;
    setSkinBusy(true);
    setError(null);
    try {
      const dataUrl = await readLocalSkinFile(file);
      saveLocalSkinPreference({ dataUrl, variant: localVariant });
      setLocalSkin(dataUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo usar esa skin local.");
    } finally {
      setSkinBusy(false);
      if (skinInput.current) skinInput.current.value = "";
    }
  }

  function removeLocalSkin() {
    saveLocalSkinPreference({ dataUrl: null, variant: localVariant });
    setLocalSkin(null);
  }

  function handleAccountClick() {
    if (isPremium) {
      setOpen(false);
      onOpenAccount();
      return;
    }
    setOpen((value) => !value);
  }

  const localAvatarStyle = !isPremium && localSkin ? { backgroundImage: `url(${localSkin})` } : undefined;

  return (
    <header className="topbar glass-edge">
      <div className="topbar-title">{title}</div>
      <div className="topbar-actions">
        <div className={`core-pill ${isPremium ? "premium" : ""}`}>
          {isPremium ? <Crown width={13} height={13} /> : <span className="status-dot" />}
          {isPremium ? "NEXA PREMIUM" : "NEXA CORE LISTO"}
        </div>
        <div className="user-menu-wrap" ref={wrapper}>
          <button className={`user-card ${open ? "active" : ""}`} type="button" aria-label={isPremium ? "Gestionar cuenta NEXA Premium" : "Cuenta local"} aria-expanded={!isPremium && open} onClick={handleAccountClick}>
            {localAvatarStyle ? <span className="user-avatar local-skin-head" style={localAvatarStyle} aria-hidden="true" /> : <span className="user-avatar"><img src="./brand/nexa-mark.png" alt="" /></span>}
            <span className="user-copy">
              <strong>{username || "Player"}</strong>
              <small>{isPremium ? "Minecraft verificado" : "Perfil local"}</small>
            </span>
            <NavArrowDown width={15} height={15} className={`user-chevron ${open ? "open" : ""}`} />
          </button>

          {open && !isPremium && (
            <div className="user-popover glass-panel" role="dialog" aria-label="Perfil de jugador">
              <div className="user-popover-head">
                {localAvatarStyle ? <span className="user-popover-mark local-skin-head" style={localAvatarStyle} aria-hidden="true" /> : <span className="user-popover-mark"><img src="./brand/nexa-mark.png" alt="" /></span>}
                <div><span className="eyebrow">PERFIL LOCAL · NO PREMIUM</span><strong>{username || "Player"}</strong></div>
              </div>

              <p className="user-popover-description">El nombre se usa en sesiones locales. La skin local sólo cambia cómo ves tu perfil dentro de NEXA; no se sube a Mojang ni altera tu skin oficial.</p>
              <label className="field-label">NOMBRE DE JUGADOR
                <div className="user-name-input"><User width={15} height={15} /><input value={draft} maxLength={16} onChange={(event) => { setDraft(event.target.value); setError(null); }} onKeyDown={(event) => { if (event.key === "Enter") void save(); }} autoFocus /></div>
              </label>

              <div className="local-skin-actions">
                <div className="local-skin-label"><Shirt width={15} height={15} /><span><strong>Skin local</strong><small>PNG 64×64 o 64×32 · sólo visible en NEXA</small></span></div>
                <div>
                  <input ref={skinInput} className="local-skin-file-input" type="file" accept="image/png" onChange={(event) => void chooseLocalSkin(event.target.files?.[0])} />
                  <button className="secondary-button" type="button" disabled={skinBusy} onClick={() => skinInput.current?.click()}>{skinBusy ? <Loader2 className="spin" size={14} /> : <Upload width={14} height={14} />} {localSkin ? "CAMBIAR" : "ELEGIR SKIN"}</button>
                  {localSkin && <button className="ghost-button local-skin-remove" type="button" onClick={removeLocalSkin}><Trash width={14} height={14} /> QUITAR</button>}
                </div>
              </div>

              {error && <div className="user-popover-error">{error}</div>}
              <div className="user-popover-actions">
                <button className="ghost-button" type="button" onClick={() => { setDraft(username || "Player"); setError(null); setOpen(false); }}>CANCELAR</button>
                <button className="primary-button" type="button" disabled={saving || draft.trim() === username} onClick={save}>{saving ? <Loader2 className="spin" size={15} /> : <Check width={15} height={15} />} GUARDAR</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
