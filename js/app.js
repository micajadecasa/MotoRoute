import { initMap, addRouteToMap, enableDrawingMode, updateUserMarker } from './map.js';
import { fetchRoutes, syncRoute } from './api.js';
import { parseGPX, showToast, generateId } from './utils.js';

let appMap;
let appDirections;
let activeDrawing = null;
let allRoutes = [];
let allPOIs = [];
let backPressCount = 0;
let userCoords = null;
let vehicleType = localStorage.getItem('vehicleType') || 'moto';

// Solicitar posición lo antes posible
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(p => {
        userCoords = [p.coords.longitude, p.coords.latitude];
    }, null, { enableHighAccuracy: true });
}

document.addEventListener('DOMContentLoaded', async () => {
    const { map, directions } = initMap();
    appMap = map;
    appDirections = directions;

    appMap.on('load', () => {
        showToast('MotoRoute Cargado', 'success');
        setupNavigationTracking();
        loadData();
        
        // Centrar en el usuario al cargar si tenemos coordenadas
        if (userCoords) {
            appMap.flyTo({ center: userCoords, zoom: 14, duration: 2000 });
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(p => {
                userCoords = [p.coords.longitude, p.coords.latitude];
                appMap.flyTo({ center: userCoords, zoom: 14, duration: 2000 });
            });
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
    const btnStartSidebar = document.getElementById('btn-start-nav-sidebar');

    const startNav = (route) => {
        hud.classList.add('active');
        navBar.classList.add('hidden');
        btnStartSidebar.style.display = 'none';
        document.getElementById('planner-panel').classList.remove('active');
        
        // FORZAR MODO PRIMERA PERSONA
        appMap.easeTo({
            pitch: 65,
            zoom: 19,
            bearing: appMap.getBearing(),
            duration: 1500
        });
        updateHUD(route);
    };

    appDirections.on('route', (e) => {
        const route = e.route[0];
        if (route) {
            btnStartSidebar.style.display = 'block';
            btnStartSidebar.onclick = () => startNav(route);
            showToast('Ruta lista. Pulsa EMPEZAR.', 'info');
        }
    });

    function updateHUD(route) {
        const step = route.legs[0].steps[0];
        const iconMap = {
            'turn': '↩',
            'sharp right': '⤍',
            'right': '➜',
            'slight right': '⬈',
            'straight': '⬆',
            'slight left': '⬉',
            'left': '⬅',
            'sharp left': '⤌',
            'uturn': '⟲',
            'arrive': '🏁'
        };
        
        const maneuver = step.maneuver.type;
        const modifier = step.maneuver.modifier;
        const iconKey = modifier ? `${maneuver} ${modifier}` : maneuver;
        
        document.getElementById('hud-turn-icon').innerText = iconMap[modifier] || iconMap[maneuver] || '⬆';
        document.getElementById('hud-instruction').innerText = step.maneuver.instruction;
        document.getElementById('hud-next-dist').innerText = `${Math.round(step.distance)} m`;
        const eta = new Date(new Date().getTime() + route.duration * 1000);
        document.getElementById('hud-eta').innerText = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            userCoords = [pos.coords.longitude, pos.coords.latitude];
            document.getElementById('hud-speed').innerText = Math.round((pos.coords.speed || 0) * 3.6);
            
            // Actualizar marcador de posición con rotación
            updateUserMarker(appMap, userCoords, pos.coords.heading, vehicleType);
            
            if (hud.classList.contains('active')) {
                appMap.easeTo({
                    center: userCoords,
                    pitch: 65,
                    zoom: 19,
                    bearing: pos.coords.heading || appMap.getBearing(),
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

    document.getElementById('btn-map').onclick = () => { planner.classList.remove('active'); switchView('map-container'); };
    document.getElementById('btn-search').onclick = () => { 
        planner.classList.add('active'); 
        document.querySelectorAll('.gps-nav-item').forEach(i => i.classList.remove('active'));
        document.getElementById('btn-search').classList.add('active');
    };
    document.getElementById('btn-settings').onclick = () => { planner.classList.remove('active'); switchView('view-settings'); };
    document.querySelector('.close-sidebar').onclick = () => planner.classList.remove('active');
    document.querySelector('.back-btn').onclick = () => switchView('map-container');

    document.getElementById('btn-exit-nav').onclick = () => {
        hud.classList.remove('active');
        navBar.classList.remove('hidden');
        appMap.easeTo({ pitch: 0, zoom: 12 });
    };

    // BOTÓN CENTRAR
    const btnRecenter = document.getElementById('btn-recenter');
    if (btnRecenter) {
        btnRecenter.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (userCoords) {
                appMap.flyTo({ 
                    center: userCoords, 
                    zoom: 19, 
                    pitch: 65,
                    bearing: appMap.getBearing() 
                });
                showToast('Centrado en tu posición', 'info');
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(p => {
                    userCoords = [p.coords.longitude, p.coords.latitude];
                    appMap.flyTo({ center: userCoords, zoom: 19, pitch: 65 });
                }, null, { enableHighAccuracy: true });
            }
        };
    }

    // CLICK EN EL MAPA PARA CAMBIAR RUTA (DESTINO)
    appMap.on('click', (e) => {
        const planner = document.getElementById('planner-panel');
        if (planner.classList.contains('active')) {
            const coords = [e.lngLat.lng, e.lngLat.lat];
            appDirections.setDestination(coords);
            showToast('Nuevo destino marcado', 'success');
        }
    });

    // Botón Usar Mi Ubicación
    document.getElementById('btn-use-mylocation').onclick = () => {
        if (userCoords) {
            appDirections.setOrigin(userCoords);
            showToast('Origen establecido en tu ubicación', 'success');
        } else {
            showToast('Obteniendo ubicación...', 'info');
            navigator.geolocation.getCurrentPosition(p => {
                userCoords = [p.coords.longitude, p.coords.latitude];
                appDirections.setOrigin(userCoords);
                showToast('Origen establecido', 'success');
            });
        }
    };

    document.getElementById('btn-compass').onclick = () => { appMap.easeTo({ bearing: 0, pitch: 0 }); };

    document.getElementById('toggle-theme').onchange = (e) => {
        if (e.target.checked) document.body.classList.remove('light-mode');
        else document.body.classList.add('light-mode');
    };

    // Selección de Vehículo
    const vehicleOptions = document.querySelectorAll('.vehicle-option');
    // Aplicar estado inicial
    vehicleOptions.forEach(opt => {
        if (opt.dataset.vehicle === vehicleType) opt.classList.add('active');
        else opt.classList.remove('active');
    });

    vehicleOptions.forEach(opt => {
        opt.onclick = () => {
            vehicleType = opt.dataset.vehicle;
            localStorage.setItem('vehicleType', vehicleType);
            vehicleOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            showToast(`Vehículo: ${vehicleType.toUpperCase()}`, 'info');
            if (userCoords) updateUserMarker(appMap, userCoords, appMap.getBearing(), vehicleType);
        };
    });

    const moveSearch = () => {
        const dir = document.querySelector('.mapboxgl-ctrl-directions');
        if (dir) { document.getElementById('directions-container').appendChild(dir); return true; }
        return false;
    };
    const interval = setInterval(() => { if (moveSearch()) clearInterval(interval); }, 500);
}
