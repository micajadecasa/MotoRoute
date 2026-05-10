# MotoRoutes Web App - Despliegue y Pruebas

Versión corregida y optimizada de la PWA de MotoRoutes. Mejorada para accesibilidad (WCAG 2.1 AA), rendimiento móvil y sincronización robusta.

## 🚀 Instalación y Configuración

1.  **Mapbox**: Obtén un token en [mapbox.com](https://www.mapbox.com/) y configúralo en `js/config.js`.
2.  **Backend (Apps Script)**:
    *   Crea un nuevo proyecto en [Google Apps Script](https://script.google.com/).
    *   Copia el contenido de `apps-script/code.gs`.
    *   Ejecuta la función `setup` una vez para crear las hojas en tu Google Sheet.
    *   Haz clic en **Desplegar > Nueva implementación**.
    *   Selecciona **Tipo: Aplicación Web**.
    *   Configura: **Quién tiene acceso: Cualquier persona**.
    *   Copia la URL generada y pégala en `js/config.js` (campo `API_BASE`).

## 🧪 Pasos de Testing

### 1. Sincronización CORS (Crítico)
*   Abre la consola del navegador (F12).
*   Al cargar la página, deberías ver un mensaje Toast: "Cargando rutas...".
*   Si no hay errores de red (rojos), la conexión con Apps Script es exitosa.

### 2. Dibujo de Ruta Manual
*   Pulsa el botón **(+)**.
*   Selecciona **Dibujar en Mapa**.
*   Toca varios puntos en el mapa. Verás una línea verde punteada uniendo los puntos.
*   Pulsa el botón flotante **Guardar Ruta**.
*   Deberías recibir una notificación de éxito y la ruta se guardará en tu Google Sheet.

### 3. Importación GPX
*   Pulsa **(+)** > **Importar GPX**.
*   Selecciona un archivo `.gpx` válido.
*   La app parseará el XML a GeoJSON, lo mostrará en el mapa y lo subirá automáticamente.

### 4. Responsividad y UX Móvil
*   Usa el modo "Device Toggle" (Ctrl+Shift+M) en Chrome.
*   Verifica que la barra de navegación inferior respete el área segura (`env(safe-area-inset-bottom)`).
*   Comprueba que no hay scroll lateral y que la altura es exacta (`100svh`).

### 5. Routing en GitHub Pages
*   Sube los archivos (incluyendo `404.html`).
*   Navega a una subruta inexistente o recarga la página.
*   El script de `404.html` debería redirigirte a `index.html` sin perder la sesión.

## 🛠️ Tecnologías
*   **Vanilla JS**: Sin frameworks pesados.
*   **Mapbox GL JS v2**: Mapas vectoriales de alto rendimiento.
*   **toGeoJSON**: Conversión ligera de GPX.
*   **CSS Moderno**: Variables, Glassmorphism y unidades dinámicas (`svh`).
