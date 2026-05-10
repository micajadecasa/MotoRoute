import { CONFIG } from './config.js';

/**
 * Obtiene todas las rutas desde Apps Script
 */
export async function fetchRoutes() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}?path=rutas`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error("Error fetching routes:", error);
        return [];
    }
}

/**
 * Sincroniza una ruta con el backend.
 * Usa 'text/plain' para evitar el preflight OPTIONS de CORS en Apps Script.
 */
export async function syncRoute(routeData) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}?path=rutas`, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(routeData)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error("Error syncing route:", error);
        return false;
    }
}

/**
 * Obtiene todos los puntos de interés
 */
export async function fetchPOIs() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}?path=pois`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error("Error fetching POIs:", error);
        return [];
    }
}
