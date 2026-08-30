import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(uiRoot, "..", "..");
const targetRoot = path.join(uiRoot, "public", "wallpapers");
const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const sourceNames = ["images", "imagenes", "wallpapers"];

async function isDirectory(value) {
  try {
    return (await stat(value)).isDirectory();
  } catch {
    return false;
  }
}

async function walk(directory, prefix = "") {
  const result = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(absolute, relative));
    else if (entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())) result.push({ absolute, relative });
  }
  return result;
}

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });

const catalog = [];
const copied = new Set();

for (const sourceName of sourceNames) {
  const sourceRoot = path.join(repoRoot, sourceName);
  if (!await isDirectory(sourceRoot)) continue;

  for (const entry of await walk(sourceRoot)) {
    const normalizedRelative = entry.relative.replaceAll("\\", "/");
    if (copied.has(normalizedRelative.toLowerCase())) continue;
    copied.add(normalizedRelative.toLowerCase());

    const destination = path.join(targetRoot, entry.relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(entry.absolute, destination);

    const encodedPath = normalizedRelative.split("/").map(encodeURIComponent).join("/");
    catalog.push({
      name: path.parse(entry.relative).name,
      url: `./wallpapers/${encodedPath}`,
    });
  }
}

catalog.sort((left, right) => left.name.localeCompare(right.name, "es"));
await writeFile(path.join(targetRoot, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

console.log(`NEXA wallpapers: ${catalog.length} fondo(s) sincronizado(s) desde la raíz del repositorio.`);
