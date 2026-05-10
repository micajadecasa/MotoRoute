/**
 * Utilidades para MotoRoutes
 */

/**
 * Parsea un string GPX a GeoJSON usando toGeoJSON (cargado vía CDN en index.html)
 */
export function parseGPX(gpxText) {
    try {
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, "text/xml");
        
        // toGeoJSON es una global cargada desde el script tmcw/togeojson
        if (typeof toGeoJSON === 'undefined') {
            throw new Error("Librería toGeoJSON no cargada");
        }
        
        const geojson = toGeoJSON.gpx(gpxDoc);
        
        // Validación básica
        if (!geojson.features || geojson.features.length === 0) {
            throw new Error("El GPX no contiene rutas válidas");
        }
        
        return geojson;
    } catch (error) {
        console.error("Error parseando GPX:", error);
        throw error;
    }
}

/**
 * Sistema de notificaciones Toast (Vanilla JS)
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Animación entrada
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-eliminar
    const timer = setTimeout(() => hideToast(toast), 5000);

    toast.querySelector('.toast-close').onclick = () => {
        clearTimeout(timer);
        hideToast(toast);
    };
}

function hideToast(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
}

/**
 * Genera un ID único
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
