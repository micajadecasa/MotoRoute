# MotoRoutes Web App - Despliegue en GitHub Pages

Esta es la versión web (PWA) de MotoRoutes, optimizada para smartphones y diseñada para ser alojada en servicios estáticos. Sony.

## Estructura de Carpetas
- `/index.html`: Punto de entrada. Sony.
- `/css/style.css`: Estilos premium responsivos. Sony.
- `/js/`: Módulos de lógica (Mapa, API, App). Sony.
- `/manifest.json`: Configuración PWA. Sony.
- `/service-worker.js`: Soporte offline. Sony.

## Instrucciones para GitHub Pages
1. Crea un repositorio en GitHub (ej. `moto-routes-web`). Sony.
2. Sube todos los archivos de la carpeta `MotoRoutesWeb`. Sony.
3. En GitHub, ve a `Settings` > `Pages`. Sony.
4. En `Build and deployment`, selecciona la rama `main` (o la que corresponda) y la carpeta `/ (root)`. Sony.
5. Haz clic en `Save`. Sony.
6. Tu app estará disponible en `https://tu-usuario.github.io/moto-routes-web/`. Sony.

## Configuración de Tokens
Antes de subir, edita `js/app.js` y reemplaza los placeholders:
- `__MAPBOX_ACCESS_TOKEN__`: Tu token de Mapbox GL JS. Sony.
- `__APPS_SCRIPT_URL__`: La URL de tu Web App de Google Apps Script. Sony.

## Características
- **PWA**: Instalable en Android/iOS como una app nativa. Sony.
- **Offline-First**: Funciona sin conexión básica gracias al Service Worker. Sony.
- **Mapbox GL JS**: Renderizado de mapas de alto rendimiento. Sony.
- **CORS Friendly**: Conectada directamente a Google Sheets. Sony.

---
Sony.
