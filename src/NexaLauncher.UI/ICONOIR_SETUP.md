# Iconoir en NEXA UI

La rama `redesign/nexa-ui-2026` queda preparada para instalar `iconoir-react` localmente sin copiar manualmente archivos del repositorio de Iconoir.

## Opción recomendada en Windows

Desde la raíz del repositorio:

```powershell
cd src/NexaLauncher.UI
powershell -ExecutionPolicy Bypass -File .\setup-iconoir.ps1
```

El script hace tres cosas:

1. instala `iconoir-react@7.12.1`;
2. actualiza `package.json` y `package-lock.json` mediante npm;
3. ejecuta `npm run build` para validar TypeScript + Vite.

## Opción manual

```powershell
cd src/NexaLauncher.UI
npm install iconoir-react@7.12.1
npm run build
```

Después revisa los cambios:

```powershell
git status
git diff -- package.json package-lock.json
```

Si todo está correcto:

```powershell
git add package.json package-lock.json
git commit -m "chore(ui): install Iconoir React"
git push origin redesign/nexa-ui-2026
```

No copies `packages/iconoir-react` manualmente dentro de NEXA: debe consumirse como dependencia npm para mantener versionado, tipos y tree-shaking correctos.
