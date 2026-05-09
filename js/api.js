const API_BASE = "https://script.google.com/macros/s/AKfycbzXfjgUoLjuvCcTE9udgHDkQBViyJCvkHEGK14t0CyMTTOSKyjrxQ4WntstFVG--pLeAA/exec";

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(routeData)
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
