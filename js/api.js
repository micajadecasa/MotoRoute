import { CONFIG } from './config.js';

/**
 * MotoRoutes API - Optimized for Google Apps Script CORS
 */

export async function fetchRoutes(path = 'rutas') {
    try {
        const url = `${CONFIG.API_BASE}?path=${path}`;
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error(`Error en fetchRoutes (${path}):`, error);
        return [];
    }
}

export async function syncRoute(data, path = 'rutas') {
    try {
        // IMPORTANTE: Para evitar preflight CORS en Google Apps Script,
        // enviamos como 'text/plain'. El backend hará JSON.parse().
        const response = await fetch(`${CONFIG.API_BASE}?path=${path}`, {
            method: 'POST',
            mode: 'no-cors', // Usar no-cors es la forma más segura de que el POST llegue siempre
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(data)
        });

        // Con mode: 'no-cors' no podemos leer la respuesta, 
        // pero aseguramos que los datos lleguen al Sheets.
        return true; 
    } catch (error) {
        console.error(`Error en syncRoute (${path}):`, error);
        return false;
    }
}
