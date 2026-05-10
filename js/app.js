import { initMap, addRouteToMap, enableDrawingMode } from './map.js';
import { fetchRoutes, syncRoute } from './api.js';
import { parseGPX, showToast, generateId } from './utils.js';

let appMap;
let appDirections;
let watchId = null;
let activeDrawing = null;
let allRoutes = [];
let allPOIs = [];

document.addEventListener('DOMContentLoaded', async () => {
    const { map, directions } = initMap();
    appMap = map;
    appDirections = directions;

    appMap.on('load', () => {
        showToast('MotoRoute Lista', 'success');
        setupNavigationTracking();
        loadData();
    });

    setupUI();
});

async function loadData() {
    try {
        const [routes, pois] = await Promise.all([
            fetchRoutes('rutas'),
            fetchRoutes('pois')
        ]);
        allRoutes = routes || [];
        allPOIs = pois || [];
        
        allRoutes.forEach(r => {
            if (r.geojson) addRouteToMap(appMap, JSON.parse(r.geojson), `route-${r.id}`);
        });

        allPOIs.forEach(p => {
            if (p.lng && p.lat) {
                new mapboxgl.Marker({ color: '#ff9800' })
                    .setLngLat([parseFloat(p.lng), parseFloat(p.lat)])
                    .addTo(appMap);
            }
        });
    } catch (e) {
        showToast('Error cargando datos', 'error');
    }
}

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    
    // GPS Nav Bar State
    document.querySelectorAll('.gps-nav-item').forEach(item => {
        item.classList.remove('active');
        if (viewId === 'map-container' && item.id === 'btn-map') item.classList.add('active');
        if (viewId === 'view-settings' && item.id === 'btn-settings') item.classList.add('active');
    });

    if (viewId === 'map-container') appMap.resize();
}

function setupNavigationTracking() {
    const hud = document.getElementById('moto-hud');
    const navBar = document.querySelector('.gps-nav-bar');
    const hudTurn = document.getElementById('hud-turn-icon');
    const hudNextDist = document.getElementById('hud-next-dist');
    const hudInstruction = document.getElementById('hud-instruction');
    const hudSpeed = document.getElementById('hud-speed');
    const hudEta = document.getElementById('hud-eta');
    const btnStart = document.getElementById('btn-start-nav');

    appDirections.on('route', (e) => {
        const route = e.route[0];
        if (route) {
            btnStart.style.display = 'block';
            btnStart.onclick = () => {
                hud.classList.add('active');
                navBar.classList.add('hidden');
                btnStart.style.display = 'none';
                updateHUD(route);
                
                appMap.easeTo({
                    pitch: 60,
                    zoom: 17,
                    duration: 1000
                });
            };
        }
    });

    function updateHUD(route) {
        const step = route.legs[0].steps[0];
        hudInstruction.innerText = step.maneuver.instruction;
        hudNextDist.innerText = `${Math.round(step.distance)} m`;
        
        const now = new Date();
        const eta = new Date(now.getTime() + route.duration * 1000);
        hudEta.innerText = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Icono de giro simplificado
        const type = step.maneuver.type;
        if (type.includes('left')) hudTurn.innerText = '⬅';
        else if (type.includes('right')) hudTurn.innerText = '➡';
        else hudTurn.innerText = '⬆';
    }

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            const speed = Math.round((pos.coords.speed || 0) * 3.6);
            hudSpeed.innerText = speed;
            if (hud.classList.contains('active')) {
                appMap.easeTo({
                    center: [pos.coords.longitude, pos.coords.latitude],
                    bearing: pos.coords.heading || 0,
                    duration: 1000
                });
            }
        }, null, { enableHighAccuracy: true });
    }
}

function setupUI() {
    const planner = document.getElementById('planner-panel');
    const navBar = document.querySelector('.gps-nav-bar');
    const hud = document.getElementById('moto-hud');

    document.getElementById('btn-map').onclick = () => {
        planner.classList.remove('active');
        switchView('map-container');
    };

    document.getElementById('btn-search').onclick = () => {
        planner.classList.add('active');
        document.querySelectorAll('.gps-nav-item').forEach(i => i.classList.remove('active'));
        document.getElementById('btn-search').classList.add('active');
    };

    document.getElementById('btn-settings').onclick = () => {
        planner.classList.remove('active');
        switchView('view-settings');
    };

    document.querySelector('.close-sidebar').onclick = () => planner.classList.remove('active');

    document.getElementById('btn-exit-nav').onclick = () => {
        hud.classList.remove('active');
        navBar.classList.remove('hidden');
        appMap.easeTo({ pitch: 0, zoom: 12 });
    };

    document.getElementById('btn-recenter').onclick = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(p => {
                appMap.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 15 });
            });
        }
    };

    document.getElementById('btn-compass').onclick = () => {
        appMap.easeTo({ bearing: 0, pitch: 0 });
    };

    // Mover Directions al sidebar
    const moveSearch = () => {
        const dir = document.querySelector('.mapboxgl-ctrl-directions');
        if (dir) {
            document.getElementById('directions-container').appendChild(dir);
            return true;
        }
        return false;
    };
    const interval = setInterval(() => { if (moveSearch()) clearInterval(interval); }, 500);
}
