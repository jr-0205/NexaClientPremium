# NEXA Client — conceptos de rediseño

Esta carpeta contiene maquetas HTML **no productivas** para elegir una dirección visual antes de reescribir la interfaz React del launcher.

## Cómo verlas

Abre `index.html` en un navegador y entra a cada concepto. Las maquetas cargan Tailwind CSS, Lucide y fuentes web desde CDN, por lo que requieren conexión a Internet para verse exactamente como fueron diseñadas.

## Conceptos

1. **Aurora Cinematic** — launcher inmersivo, wallpaper protagonista, navegación flotante y cristal muy contenido.
2. **Obsidian Command** — industrial/tecnológico, estructura precisa, paneles sólidos, métricas y estética de herramienta profesional.
3. **Nordic Atelier** — premium, sobrio, plata/azul, geometría inspirada en runas y mucho espacio negativo.
4. **Nexus Bento** — modular, rápido de escanear, tarjetas bento con acciones y estados visibles.
5. **Monolith** — ultra minimalista, casi sin paneles, tipografía grande, dock inferior y foco absoluto en el perfil seleccionado.

## Criterio de implementación

La dirección elegida se trasladará a React 19 + Tailwind 4 + Lucide + Motion. La arquitectura funcional, el bridge nativo y la autenticación existente no deben depender del diseño visual.

Estas maquetas no sustituyen el launcher ni modifican `main`, `milestone/auth-xbox-ready` o `feature/ui-flow-polish`.
