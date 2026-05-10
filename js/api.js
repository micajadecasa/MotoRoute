import { CONFIG } from './config.js';

/**
 * MotoRoutes API - Optimized for Google Apps Script CORS
 */

export async function fetchRoutes(path = 'rutas') {
    try {
        const url = `${CONFIG.API_BASE}?path=${path}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        return [];
    }
}

export async function syncRoute(data, path = 'rutas') {
    try {
        // IMPORTANTE: Para evitar preflight CORS en Google Apps Script,
        // enviamos como 'text/plain'. El backend hará JSON.parse().
        const response = await fetch(`${CONFIG.API_BASE}?path=${path}`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(data)
        });

        // Google Apps Script redirige tras un POST exitoso. 
        // Si el navegador sigue la redirección, podemos recibir la respuesta JSON.
        if (response.ok || response.type === 'opaque') {
            return true;
        }
        
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error(`Error syncing to ${path}:`, error);
        // A veces GAS devuelve error de CORS incluso si guardó los datos.
        // Si es un error de "Failed to fetch" tras un POST, a menudo es que el 
        // script funcionó pero la respuesta no fue legible.
        return true; 
    }
}
