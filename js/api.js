import { CONFIG } from './config.js';

/**
 * Obtiene todas las rutas desde Apps Script
 */
export async function fetchRoutes() {
    try {
        // Petición ultra-simple para evitar conflictos de CORS
        const response = await fetch(`${CONFIG.API_BASE}?path=rutas`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const text = await response.text();
        try {
            const result = JSON.parse(text);
            return result.success ? result.data : [];
        } catch (e) {
            console.error("La respuesta no es JSON válido:", text);
            throw new Error("El servidor devolvió un error. Revisa el despliegue.");
        }
    } catch (error) {
        console.error("Error fetching routes:", error);
        return [];
    }
}

/**
 * Sincroniza una ruta con el backend.
 * Usa 'text/plain' para evitar el preflight OPTIONS de CORS en Apps Script.
 */
export async function syncRoute(routeData, path = 'rutas') {
    try {
        const response = await fetch(`${CONFIG.API_BASE}?path=${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain" // Sin charset para máxima compatibilidad
            },
            body: JSON.stringify(routeData)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const text = await response.text();
        try {
            const result = JSON.parse(text);
            return result.success === true;
        } catch (e) {
            return false;
        }
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
