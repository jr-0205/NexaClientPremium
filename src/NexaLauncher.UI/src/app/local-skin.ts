export type LocalSkinPreference = {
  dataUrl: string | null;
  variant: "classic" | "slim";
};

const SKIN_KEY = "nexa-local-skin";
const VARIANT_KEY = "nexa-local-skin-variant";
const SKIN_EVENT = "nexa:local-skin-change";

export function loadLocalSkinPreference(): LocalSkinPreference {
  const variant = localStorage.getItem(VARIANT_KEY) === "slim" ? "slim" : "classic";
  return { dataUrl: localStorage.getItem(SKIN_KEY), variant };
}

export function saveLocalSkinPreference(value: LocalSkinPreference) {
  if (value.dataUrl) localStorage.setItem(SKIN_KEY, value.dataUrl);
  else localStorage.removeItem(SKIN_KEY);
  localStorage.setItem(VARIANT_KEY, value.variant);
  window.dispatchEvent(new CustomEvent(SKIN_EVENT, { detail: value }));
}

export function onLocalSkinPreferenceChanged(listener: (value: LocalSkinPreference) => void) {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<LocalSkinPreference>;
    if (custom.detail) listener(custom.detail);
  };
  window.addEventListener(SKIN_EVENT, handler);
  return () => window.removeEventListener(SKIN_EVENT, handler);
}

export async function readLocalSkinFile(file: File): Promise<string> {
  if (file.type !== "image/png") throw new Error("Selecciona una skin en formato PNG.");
  if (file.size > 1024 * 1024) throw new Error("La skin local no puede superar 1 MB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la skin local."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("El PNG seleccionado no es válido."));
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = dataUrl;
  });
  if (dimensions.width !== 64 || ![32, 64].includes(dimensions.height)) {
    throw new Error("Usa una skin de Minecraft de 64×64 o 64×32 píxeles.");
  }
  return dataUrl;
}
