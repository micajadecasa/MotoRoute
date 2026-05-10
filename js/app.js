import { initMap, addRouteToMap, enableDrawingMode } from './map.js';
import { fetchRoutes, syncRoute } from './api.js';
import { parseGPX, showToast, generateId } from './utils.js';

let appMap;
let appDirections;
let watchId = null;
let activeDrawing = null;
let allRoutes = [];
let allPOIs = [];
let backPressCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const { map, directions } = initMap();
    appMap = map;
    appDirections = directions;

    appMap.on('load', () => {
        showToast('MotoRoute Cargado', 'success');
        setupNavigationTracking();
        loadData();
        
        // IR A MI POSICIÓN AL INICIAR
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                appMap.flyTo({
                    center: [pos.coords.longitude, pos.coords.latitude],
                    zoom: 14,
                    duration: 2000
                });
            }, null, { enableHighAccuracy: true });
        }
    });

    setupUI();
    setupAndroidBackHandler();
});

function setupAndroidBackHandler() {
    window.history.pushState({ view: 'map' }, '');
    window.onpopstate = () => {
        const planner = document.getElementById('planner-panel');
        const hud = document.getElementById('moto-hud');
        if (hud.classList.contains('active')) {
            if (confirm("¿Deseas salir de la navegación?")) document.getElementById('btn-exit-nav').click();
            window.history.pushState({ view: 'map' }, '');
            return;
        }
        if (planner.classList.contains('active')) {
            planner.classList.remove('active');
            window.history.pushState({ view: 'map' }, '');
            return;
        }
        const activeView = document.querySelector('.app-view.active');
        if (activeView && activeView.id !== 'map-container') {
            switchView('map-container');
            window.history.pushState({ view: 'map' }, '');
            return;
        }
        backPressCount++;
        if (backPressCount === 1) {
            showToast('Pulsa otra vez para salir', 'info');
            setTimeout(() => { backPressCount = 0; }, 2000);
            window.history.pushState({ view: 'map' }, '');
        } else { window.history.back(); }
    };
}

async function loadData() {
    try {
        const [routes, pois] = await Promise.all([fetchRoutes('rutas'), fetchRoutes('pois')]);
        allRoutes = routes || [];
        allPOIs = pois || [];
        allRoutes.forEach(r => { if (r.geojson) addRouteToMap(appMap, JSON.parse(r.geojson), `route-${r.id}`); });
    } catch (e) { showToast('Error de datos', 'error'); }
}

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
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
    const btnStart = document.getElementById('btn-start-nav');
    const btnStartSidebar = document.getElementById('btn-start-nav-sidebar');

    const startNav = (route) => {
        hud.classList.add('active');
        navBar.classList.add('hidden');
        btnStart.style.display = 'none';
        btnStartSidebar.style.display = 'none';
        document.getElementById('planner-panel').classList.remove('active');
        
        // MODO PRIMERA PERSONA ZOOM 15.5
        appMap.easeTo({ pitch: 60, zoom: 15.5, duration: 1000 });
        updateHUD(route);
    };

    appDirections.on('route', (e) => {
        const route = e.route[0];
        if (route) {
            btnStart.style.display = 'block';
            btnStartSidebar.style.display = 'block';
            btnStart.onclick = () => startNav(route);
            btnStartSidebar.onclick = () => startNav(route);
        }
    });

    function updateHUD(route) {
        const step = route.legs[0].steps[0];
        document.getElementById('hud-instruction').innerText = step.maneuver.instruction;
        document.getElementById('hud-next-dist').innerText = `${Math.round(step.distance)} m`;
        const eta = new Date(new Date().getTime() + route.duration * 1000);
        document.getElementById('hud-eta').innerText = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            document.getElementById('hud-speed').innerText = Math.round((pos.coords.speed || 0) * 3.6);
            if (hud.classList.contains('active')) {
                appMap.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], bearing: pos.coords.heading || 0, duration: 1000 });
            }
        }, null, { enableHighAccuracy: true });
    }
}

function setupUI() {
    const planner = document.getElementById('planner-panel');
    const navBar = document.querySelector('.gps-nav-bar');
    const hud = document.getElementById('moto-hud');

    document.getElementById('btn-map').onclick = () => { planner.classList.remove('active'); switchView('map-container'); };
    document.getElementById('btn-search').onclick = () => { 
        planner.classList.add('active'); 
        document.querySelectorAll('.gps-nav-item').forEach(i => i.classList.remove('active'));
        document.getElementById('btn-search').classList.add('active');
    };
    document.getElementById('btn-settings').onclick = () => { planner.classList.remove('active'); switchView('view-settings'); };
    document.querySelector('.close-sidebar').onclick = () => planner.classList.remove('active');

    document.getElementById('btn-exit-nav').onclick = () => {
        hud.classList.remove('active');
        navBar.classList.remove('hidden');
        appMap.easeTo({ pitch: 0, zoom: 12 });
    };

    document.getElementById('btn-recenter').onclick = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(p => {
                appMap.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 15.5 });
            }, null, { enableHighAccuracy: true });
        }
    };

    document.getElementById('btn-compass').onclick = () => { appMap.easeTo({ bearing: 0, pitch: 0 }); };

    document.getElementById('toggle-theme').onchange = (e) => {
        if (e.target.checked) document.body.classList.remove('light-mode');
        else document.body.classList.add('light-mode');
    };

    const moveSearch = () => {
        const dir = document.querySelector('.mapboxgl-ctrl-directions');
        if (dir) { document.getElementById('directions-container').appendChild(dir); return true; }
        return false;
    };
    const interval = setInterval(() => { if (moveSearch()) clearInterval(interval); }, 500);
}
