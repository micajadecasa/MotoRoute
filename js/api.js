import { CONFIG } from './config.js';

/**
 * Obtiene todas las rutas desde Apps Script
 */
export async function fetchRoutes() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}?path=rutas`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            redirect: 'follow'
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const text = await response.text();
        try {
            const result = JSON.parse(text);
            return result.success ? result.data : [];
        } catch (e) {
            console.error("Response is not valid JSON:", text);
            throw new Error("El servidor no devolvió un JSON válido. Revisa el despliegue de Apps Script.");
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
            mode: "cors",
            cache: 'no-cache',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(routeData)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const text = await response.text();
        try {
            const result = JSON.parse(text);
            return result.success === true;
        } catch (e) {
            console.error("Response is not valid JSON:", text);
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
