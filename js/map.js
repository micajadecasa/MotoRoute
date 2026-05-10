import { CONFIG } from './config.js';

/**
 * Inicializa el mapa con navegación
 */
export function initMap() {
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-3.70379, 40.41678], // Madrid
        zoom: 12,
        pitch: 45,
        antialias: true
    });

    // Control de Navegación (Directions)
    const directions = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: 'metric',
        profile: 'mapbox/driving',
        alternatives: false,
        geometries: 'geojson',
        language: 'es', // Idioma en castellano
        controls: { instructions: true, profileSwitcher: false },
        placeholderOrigin: 'Mi ubicación',
        placeholderDestination: '¿A dónde vamos?'
    });

    map.addControl(directions, 'top-left');

    // Botón de recentrar
    const btnRecenter = document.getElementById('btn-recenter');
    if (btnRecenter) {
        btnRecenter.onclick = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    map.flyTo({
                        center: [pos.coords.longitude, pos.coords.latitude],
                        zoom: 15,
                        pitch: 60
                    });
                }, err => console.warn(err), { enableHighAccuracy: true });
            }
        };
    }

    return { map, directions };
}

/**
 * Dibuja una ruta GeoJSON en el mapa
 */
export function addRouteToMap(map, geoJson, id = `route-${Date.now()}`) {
    if (!geoJson || !map) return;

    if (map.getSource(id)) {
        map.getSource(id).setData(geoJson);
        return;
    }

    map.addSource(id, {
        type: 'geojson',
        data: geoJson
    });

    map.addLayer({
        id: id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
            'line-color': '#ff9800',
            'line-width': 4,
            'line-opacity': 0.8
        }
    });

    try {
        const coordinates = geoJson.features[0].geometry.coordinates;
        const bounds = coordinates.reduce((acc, coord) => {
            return acc.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        map.fitBounds(bounds, { padding: 50 });
    } catch (e) {}
}

/**
 * Activa el modo de dibujo manual
 */
export function enableDrawingMode(map, onPointAdded, onFinished) {
    if (!map) return;
    map.getCanvas().style.cursor = 'crosshair';
    let currentDrawPoints = [];
    
    const drawId = 'manual-draw-layer';
    if (map.getSource(drawId)) {
        map.removeLayer(drawId);
        map.removeSource(drawId);
    }

    map.addSource(drawId, {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [] }
        }
    });

    map.addLayer({
        id: drawId,
        type: 'line',
        source: drawId,
        paint: { 'line-color': '#00ff00', 'line-width': 3, 'line-dasharray': [2, 1] }
    });

    const clickHandler = (e) => {
        const coords = [e.lngLat.lng, e.lngLat.lat];
        currentDrawPoints.push(coords);
        map.getSource(drawId).setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: currentDrawPoints }
        });
        if (onPointAdded) onPointAdded(currentDrawPoints);
    };

    map.on('click', clickHandler);

    return {
        finish: () => {
            map.off('click', clickHandler);
            map.getCanvas().style.cursor = '';
            const finalGeoJSON = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: currentDrawPoints },
                    properties: {}
                }]
            };
            if (onFinished) onFinished(finalGeoJSON);
            return finalGeoJSON;
        },
        cancel: () => {
            map.off('click', clickHandler);
            map.getCanvas().style.cursor = '';
            if (map.getLayer(drawId)) map.removeLayer(drawId);
            if (map.getSource(drawId)) map.removeSource(drawId);
        }
    };
}
