// Inicializa el mapa usando el token global definido en index.html
export function initMap() {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-3.70379, 40.41678], // Madrid por defecto
        zoom: 12,
        pitch: 45
    });

    // Control de geolocalización
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
    }));

    return map;
}

// Añadir una ruta al mapa (cuando ya tengas GeoJSON)
export function addRouteToMap(map, routeData) {
    if (!routeData.geoJson) return;

    const id = `route-${Date.now()}`;

    // Si el mapa ya está cargado, añade la capa directamente
    if (map.loaded()) {
        addLayer();
    } else {
        map.on('load', addLayer);
    }

    function addLayer() {
        map.addSource(id, {
            type: 'geojson',
            data: routeData.geoJson
        });

        map.addLayer({
            id: id,
            type: 'line',
            source: id,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#ff9800', 'line-width': 4 }
        });
    }
}
