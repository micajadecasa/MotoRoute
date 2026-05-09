const API_BASE = "https://script.google.com/macros/s/AKfycbw4T2dES8beEeIrrk4rt96tG5CTFUc2hH_uD0pgU1JIrd2AqKrZVhpffPsGJwc0FuZzOw/exec";

export async function fetchRoutes() {
    try {
        const response = await fetch(`${API_BASE}?path=rutas`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error("Error fetching routes:", error);
        return [];
    }
}

export async function syncRoute(routeData) {
    try {
        const response = await fetch(`${API_BASE}?path=rutas`, {
            method: "POST",
            mode: "cors", // Importante para permitir redirecciones
            body: JSON.stringify(routeData)
            // Eliminamos el header 'application/json' para evitar el preflight OPTIONS
        });

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error("Error syncing route:", error);
        return false;
    }
}

export async function fetchPOIs() {
    try {
        const response = await fetch(`${API_BASE}?path=pois`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error("Error fetching POIs:", error);
        return [];
    }
}
