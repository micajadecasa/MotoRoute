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
        showToast('MotoRoutes lista', 'success');
        setupNavigationTracking();
        loadData();
    });

    setupUI();
});

async function loadData() {
    try {
        const [routes, pois] = await Promise.all([
            fetchRoutes(),
            fetchRoutes('pois')
        ]);
        
        allRoutes = routes;
        allPOIs = pois;

        renderRoutesList(allRoutes);
        renderPOIsList(allPOIs);
        
        allRoutes.forEach(route => {
            if (route.geojson) {
                try {
                    const geo = JSON.parse(route.geojson);
                    addRouteToMap(appMap, geo, `route-${route.id}`);
                } catch (e) {}
            }
        });

        allPOIs.forEach(poi => {
            new mapboxgl.Marker({ color: '#ff9800' })
                .setLngLat([poi.lng, poi.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`<h3>${poi.nombre}</h3>`))
                .addTo(appMap);
        });
    } catch (error) {
        showToast('Error cargando datos', 'error');
    }
}

function renderRoutesList(routes) {
    const listSidebar = document.getElementById('routes-list');
    const listFull = document.getElementById('routes-list-full');
    
    const html = routes.length === 0 ? '<p class="empty-msg">No hay rutas guardadas.</p>' : 
        routes.map(route => `
            <div class="route-item" id="item-${route.id}">
                <div class="route-info">
                    <h3>${route.nombre || 'Sin nombre'}</h3>
                    <p>${new Date(route.fecha).toLocaleDateString('es-ES')}</p>
                </div>
                <button class="btn-view-route primary-btn" data-id="${route.id}">VER</button>
            </div>
        `).join('');

    if (listSidebar) listSidebar.innerHTML = html;
    if (listFull) listFull.innerHTML = html;

    document.querySelectorAll('.btn-view-route').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const route = allRoutes.find(r => r.id == id);
            if (route && route.geojson) {
                switchView('map-container');
                const geo = JSON.parse(route.geojson);
                addRouteToMap(appMap, geo, `route-${id}`);
            }
        };
    });
}

function renderPOIsList(pois) {
    const list = document.getElementById('pois-list');
    if (!list) return;
    list.innerHTML = pois.length === 0 ? '<p class="empty-msg">No hay puntos guardados.</p>' :
        pois.map(poi => `
            <div class="poi-item" id="poi-${poi.id}">
                <div class="route-info">
                    <h3>${poi.nombre || 'Punto'}</h3>
                    <p>${poi.tipo || 'Marcador'}</p>
                </div>
                <button class="btn-view-route secondary-btn" data-id="${poi.id}">IR</button>
            </div>
        `).join('');

    list.querySelectorAll('.btn-view-route').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const poi = allPOIs.find(p => p.id == id);
            if (poi) {
                switchView('map-container');
                appMap.flyTo({ center: [poi.lng, poi.lat], zoom: 15 });
            }
        };
    });
}

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (viewId === 'map-container' && item.id === 'btn-home') item.classList.add('active');
        if (item.id === 'btn-routes-toggle' && document.getElementById('planner-panel').classList.contains('active')) item.classList.add('active');
        if (viewId === 'view-pois' && item.id === 'btn-pois') item.classList.add('active');
    });

    if (viewId === 'map-container') appMap.resize();
}

function setupNavigationTracking() {
    const hud = document.getElementById('moto-hud');
    const hudInstruction = document.getElementById('hud-instruction');
    const hudNextDist = document.getElementById('hud-next-dist');
    const hudSpeed = document.getElementById('hud-speed');
    const hudLimit = document.getElementById('hud-limit');
    const hudEta = document.getElementById('hud-eta');
    const btnStart = document.getElementById('btn-start-nav');

    appDirections.on('route', (e) => {
        const route = e.route[0];
        if (route) {
            btnStart.style.display = 'flex';
            btnStart.onclick = () => {
                hud.classList.add('active');
                btnStart.style.display = 'none';
                updateHUD(route);
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(p => {
                        appMap.easeTo({
                            center: [p.coords.longitude, p.coords.latitude],
                            zoom: 17,
                            pitch: 60,
                            bearing: p.coords.heading || 0
                        });
                    });
                }
            };
        }
    });

    function updateHUD(route) {
        const firstStep = route.legs[0].steps[0];
        hudInstruction.innerText = firstStep.maneuver.instruction;
        hudNextDist.innerText = `${Math.round(firstStep.distance)} m`;
        const now = new Date();
        const eta = new Date(now.getTime() + route.duration * 1000);
        hudEta.innerText = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition((pos) => {
            const speedKmH = Math.round((pos.coords.speed || 0) * 3.6);
            hudSpeed.innerText = speedKmH;
            const limit = parseInt(hudLimit.innerText) || 90;
            hudSpeed.style.color = speedKmH > limit ? '#ff5252' : '#fff';

            if (hud.classList.contains('active')) {
                appMap.easeTo({
                    center: [pos.coords.longitude, pos.coords.latitude],
                    pitch: 60,
                    bearing: pos.coords.heading || 0,
                    duration: 1000
                });
            }
        }, null, { enableHighAccuracy: true });
    }
}

function setupUI() {
    const modal = document.getElementById('modal-add');
    const btnAdd = document.getElementById('btn-add');
    const btnClose = document.querySelectorAll('.close-modal');
    const btnManual = document.getElementById('btn-manual-route');
    const btnImport = document.getElementById('btn-import-gpx');
    const btnAddPoi = document.getElementById('btn-add-poi');
    const btnExitNav = document.getElementById('btn-exit-nav');
    const plannerPanel = document.getElementById('planner-panel');
    const btnPlannerToggle = document.getElementById('btn-routes-toggle');

    const moveSearch = () => {
        const dirCtrl = document.querySelector('.mapboxgl-ctrl-directions');
        if (dirCtrl) {
            document.getElementById('directions-container').appendChild(dirCtrl);
            return true;
        }
        return false;
    };
    if (!moveSearch()) {
        const interval = setInterval(() => { if (moveSearch()) clearInterval(interval); }, 500);
    }

    btnPlannerToggle.onclick = () => {
        plannerPanel.classList.toggle('active');
        switchView('map-container');
    };

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        };
    });

    document.getElementById('btn-round-trip').onclick = async () => {
        showToast('Generando bucle de 50km...', 'info');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const start = [pos.coords.longitude, pos.coords.latitude];
                const d = 0.12; 
                const waypoints = [
                    [start[0] + d, start[1] + d/2],
                    [start[0], start[1] + d],
                    [start[0] - d, start[1] + d/2]
                ];
                appDirections.setOrigin(start);
                appDirections.setDestination(start);
                waypoints.forEach((wp, i) => appDirections.addWaypoint(i, wp));
                plannerPanel.classList.remove('active');
            });
        }
    };

    document.getElementById('btn-twisty-mode').onclick = function() {
        this.classList.toggle('active');
        appDirections.setExclude(this.classList.contains('active') ? 'motorway' : '');
        showToast(this.classList.contains('active') ? 'Evitando autovías' : 'Ruta rápida', 'info');
    };

    btnExitNav.onclick = () => {
        document.getElementById('moto-hud').classList.remove('active');
        showToast('Navegación finalizada.', 'info');
    };

    btnAdd.onclick = () => modal.classList.add('active');
    btnClose.forEach(btn => {
        btn.onclick = () => {
            modal.classList.remove('active');
            if (activeDrawing) { activeDrawing.cancel(); activeDrawing = null; }
        };
    });

    document.getElementById('btn-home').onclick = () => {
        plannerPanel.classList.remove('active');
        switchView('map-container');
    };
    document.getElementById('btn-pois').onclick = () => {
        plannerPanel.classList.remove('active');
        switchView('view-pois');
    };

    btnAddPoi.onclick = () => {
        modal.classList.remove('active');
        showToast('Toca el mapa para situar el punto.', 'info');
        const h = async (e) => {
            appMap.off('click', h);
            const n = prompt("Nombre del Punto:");
            if (!n) return;
            const p = { id: generateId(), nombre: n, lat: e.lngLat.lat, lng: e.lngLat.lng, fecha: new Date().toISOString() };
            if (await syncRoute(p, 'pois')) {
                showToast('¡Punto guardado!', 'success');
                allPOIs.push(p);
                renderPOIsList(allPOIs);
            }
        };
        appMap.on('click', h);
    };

    btnManual.onclick = () => {
        modal.classList.remove('active');
        const n = prompt("Nombre de la ruta:");
        if (!n) return;
        switchView('map-container');
        const fb = document.createElement('button');
        fb.innerText = 'Guardar Ruta';
        fb.className = 'floating-action-btn';
        document.body.appendChild(fb);
        activeDrawing = enableDrawingMode(appMap, null, async (g) => {
            fb.remove();
            const r = { id: generateId(), nombre: n, geojson: JSON.stringify(g), fecha: new Date().toISOString() };
            if (await syncRoute(r, 'rutas')) {
                showToast('Ruta guardada', 'success');
                allRoutes.push(r);
                renderRoutesList(allRoutes);
            }
            activeDrawing = null;
        });
        fb.onclick = () => activeDrawing.finish();
    };

    btnImport.onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.gpx';
        inp.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async ev => {
                try {
                    const geo = parseGPX(ev.target.result);
                    const n = prompt("Nombre:", file.name.replace('.gpx',''));
                    const r = { id: generateId(), nombre: n, geojson: JSON.stringify(geo), fecha: new Date().toISOString() };
                    if (await syncRoute(r, 'rutas')) {
                        showToast('GPX Importado', 'success');
                        allRoutes.push(r);
                        renderRoutesList(allRoutes);
                    }
                } catch (err) { showToast('GPX inválido', 'error'); }
                modal.classList.remove('active');
            };
            reader.readAsText(file);
        };
        inp.click();
    };
}
