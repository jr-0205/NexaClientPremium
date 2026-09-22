NEXA CLIENT — REDESIGN V2

Archivos listos para reemplazar en el repositorio:

1. Sidebar / Topbar / fallback visual
   src/NexaLauncher.UI/public/brand/nexa-mark.png
   <- nexa-mark.png

2. Alias legacy para no tocar imports existentes
   src/NexaLauncher.UI/public/brand/original/NEXA N.png
   <- NEXA N.png

   src/NexaLauncher.UI/public/brand/original/NEXA nombre.png
   <- NEXA nombre.png

   src/NexaLauncher.UI/public/brand/original/NEXA CLIENT.png
   <- NEXA CLIENT.png

3. Icono de ventana WPF
   src/NexaLauncher.Desktop/Assets/NEXA N.png
   <- NEXA N.png

4. Icono del ejecutable / instalador
   Copia nexa-app-icon.ico a:
   src/NexaLauncher.Desktop/Assets/nexa-app-icon.ico

   Y añade al PropertyGroup de NexaLauncher.Desktop.csproj:
   <ApplicationIcon>Assets\nexa-app-icon.ico</ApplicationIcon>

5. Splash / About
   src/NexaLauncher.UI/public/brand/nexa-splash.png

6. Fondo principal / perfiles
   src/NexaLauncher.UI/public/brand/nexa-background.jpg
   src/NexaLauncher.UI/public/brand/nexa-profile-default.png

7. Biblioteca vacía
   src/NexaLauncher.UI/public/brand/nexa-empty-library.png

8. Avatar fallback
   src/NexaLauncher.UI/public/brand/nexa-avatar-default.png

9. Banner
   src/NexaLauncher.UI/public/brand/nexa-banner.png

Las versiones *-transparent.png son recomendables para componentes React donde el fondo
ya lo proporciona CSS.
