import { CONFIG } from './config.js';

let currentDrawPoints = [];

/**
 * Inicializa el mapa
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

    // Controles
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
    }), 'top-right');

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return map;
}

/**
 * Dibuja una ruta GeoJSON en el mapa
 */
export function addRouteToMap(map, geoJson, id = `route-${Date.now()}`) {
    if (!geoJson) return;

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

    // Ajustar vista si hay coordenadas
    try {
        const coordinates = geoJson.features[0].geometry.coordinates;
        const bounds = coordinates.reduce((acc, coord) => {
            return acc.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        map.fitBounds(bounds, { padding: 50 });
    } catch (e) {
        console.warn("Could not fit bounds", e);
    }
}

/**
 * Activa el modo de dibujo manual
 */
export function enableDrawingMode(map, onPointAdded, onFinished) {
    map.getCanvas().style.cursor = 'crosshair';
    currentDrawPoints = [];
    
    const drawId = 'manual-draw-layer';
    if (map.getSource(drawId)) map.removeLayer(drawId);
    if (map.getSource(drawId)) map.removeSource(drawId);

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
        
        // Actualizar capa de dibujo
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
