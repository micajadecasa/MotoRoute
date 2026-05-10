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
            fetchRoutes('pois') // Reusamos fetchRoutes para pois
        ]);
        
        allRoutes = routes;
        allPOIs = pois;

        renderRoutesList(allRoutes);
        renderPOIsList(allPOIs);
        
        // Dibujar rutas
        allRoutes.forEach(route => {
            if (route.geojson) {
                try {
                    const geo = JSON.parse(route.geojson);
                    addRouteToMap(appMap, geo, `route-${route.id}`);
                } catch (e) {}
            }
        });

        // Dibujar POIs
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
    const list = document.getElementById('routes-list');
    if (!list) return;
    
    if (routes.length === 0) {
        list.innerHTML = '<p class="empty-msg">No hay rutas guardadas.</p>';
        return;
    }

    list.innerHTML = routes.map(route => `
        <div class="route-item" id="item-${route.id}">
            <div class="route-info">
                <h3>${route.nombre || 'Sin nombre'}</h3>
                <p>${new Date(route.fecha).toLocaleDateString('es-ES')}</p>
            </div>
            <button class="btn-view-route primary-btn" data-id="${route.id}">VER</button>
        </div>
    `).join('');

    list.querySelectorAll('.btn-view-route').forEach(btn => {
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
    
    if (pois.length === 0) {
        list.innerHTML = '<p class="empty-msg">No hay puntos guardados.</p>';
        return;
    }

    list.innerHTML = pois.map(poi => `
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
    document.getElementById(viewId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (viewId === 'map-container' && item.id === 'btn-home') item.classList.add('active');
        if (viewId === 'view-routes' && item.id === 'btn-routes') item.classList.add('active');
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

    // Al recibir una ruta, mostrar botón "IR"
    appDirections.on('route', (e) => {
        const route = e.route[0];
        if (route) {
            btnStart.style.display = 'flex';
            btnStart.onclick = () => {
                hud.classList.add('active');
                btnStart.style.display = 'none';
                updateHUD(route);
                // Modo primera persona inicial
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
        hudLimit.innerText = "90"; 
    }

    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition((pos) => {
            const speedKmH = Math.round((pos.coords.speed || 0) * 3.6);
            hudSpeed.innerText = speedKmH;
            const limit = parseInt(hudLimit.innerText) || 90;
            hudSpeed.style.color = speedKmH > limit ? '#ff5252' : '#fff';

            // Seguimiento en primera persona si el HUD está activo
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
    const btnStart = document.getElementById('btn-start-nav');

    // Mover Directions al contenedor lateral
    const dirCtrl = document.querySelector('.mapboxgl-ctrl-directions');
    if (dirCtrl) document.getElementById('directions-container').appendChild(dirCtrl);

    // Toggle Planner
    btnPlannerToggle.onclick = () => plannerPanel.classList.toggle('active');

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        };
    });

    // Ruta Circular (Round Trip)
    document.getElementById('btn-round-trip').onclick = async () => {
        showToast('Generando bucle de 50km...', 'info');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const start = [pos.coords.longitude, pos.coords.latitude];
                const distance = 0.12; 
                
                const waypoints = [
                    [start[0] + distance, start[1] + distance/2],
                    [start[0], start[1] + distance],
                    [start[0] - distance, start[1] + distance/2]
                ];
                
                appDirections.setOrigin(start);
                appDirections.setDestination(start);
                waypoints.forEach((wp, i) => appDirections.addWaypoint(i, wp));
                
                plannerPanel.classList.remove('active');
            });
        }
    };

    // Modo Curvas
    document.getElementById('btn-twisty-mode').onclick = function() {
        this.classList.toggle('active');
        const isTwisty = this.classList.contains('active');
        appDirections.setExclude(isTwisty ? 'motorway' : '');
        showToast(isTwisty ? 'Evitando autovías' : 'Ruta rápida', 'info');
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

    document.getElementById('btn-pois').onclick = () => switchView('view-pois');

    // Lógica: Añadir POI
    btnAddPoi.onclick = () => {
        modal.classList.remove('active');
        showToast('Toca el mapa para situar el punto.', 'info');
        const clickHandler = async (e) => {
            appMap.off('click', clickHandler);
            const nombre = prompt("Nombre del Punto:");
            if (!nombre) return;
            const newPoi = { id: generateId(), nombre, lat: e.lngLat.lat, lng: e.lngLat.lng, fecha: new Date().toISOString() };
            if (await syncRoute(newPoi, 'pois')) {
                showToast('¡Punto guardado!', 'success');
                allPOIs.push(newPoi);
                renderPOIsList(allPOIs);
            }
        };
        appMap.on('click', clickHandler);
    };

    // Ruta Manual
    btnManual.onclick = () => {
        modal.classList.remove('active');
        const nombre = prompt("Nombre de la ruta:");
        if (!nombre) return;
        switchView('map-container');
        const finishBtn = document.createElement('button');
        finishBtn.innerText = 'Guardar Ruta';
        finishBtn.className = 'floating-action-btn';
        document.body.appendChild(finishBtn);
        activeDrawing = enableDrawingMode(appMap, null, async (geo) => {
            finishBtn.remove();
            const newRoute = { id: generateId(), nombre, geojson: JSON.stringify(geo), fecha: new Date().toISOString() };
            if (await syncRoute(newRoute, 'rutas')) {
                showToast('Ruta guardada', 'success');
                allRoutes.push(newRoute);
                renderRoutesList(allRoutes);
            }
            activeDrawing = null;
        });
        finishBtn.onclick = () => activeDrawing.finish();
    };

    // Importar GPX
    btnImport.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gpx';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async ev => {
                try {
                    const geojson = parseGPX(ev.target.result);
                    const newRoute = { id: generateId(), nombre: file.name.replace('.gpx',''), geojson: JSON.stringify(geojson), fecha: new Date().toISOString() };
                    if (await syncRoute(newRoute, 'rutas')) {
                        showToast('GPX Importado', 'success');
                        allRoutes.push(newRoute);
                        renderRoutesList(allRoutes);
                    }
                } catch (err) { showToast('GPX inválido', 'error'); }
                modal.classList.remove('active');
            };
            reader.readAsText(file);
        };
        input.click();
    };
}

    // Ruta Manual
    btnManual.onclick = () => {
        modal.classList.remove('active');
        const nombreSugerido = "Ruta Manual " + new Date().toLocaleDateString('es-ES');
        const nombre = prompt("Nombre de la ruta:", nombreSugerido);
        if (!nombre) return;

        switchView('map-container');
        showToast('Toca el mapa para añadir puntos a tu ruta.', 'info');
        
        const finishBtn = document.createElement('button');
        finishBtn.innerText = 'Guardar Ruta';
        finishBtn.className = 'floating-action-btn';
        document.body.appendChild(finishBtn);

        activeDrawing = enableDrawingMode(appMap, null, async (finalGeoJSON) => {
            finishBtn.remove();
            showToast('Sincronizando con la nube...', 'info');
            
            const newRoute = {
                id: generateId(),
                nombre: nombre,
                geojson: JSON.stringify(finalGeoJSON),
                fecha: new Date().toISOString()
            };

            const success = await syncRoute(newRoute, 'rutas');
            if (success) {
                showToast('¡Ruta guardada!', 'success');
                allRoutes.push(newRoute);
                renderRoutesList(allRoutes);
                addRouteToMap(appMap, finalGeoJSON, `route-${newRoute.id}`);
            } else {
                showToast('Error de conexión o CORS.', 'error');
            }
            activeDrawing = null;
        });

        finishBtn.onclick = () => activeDrawing.finish();
    };

    // Importar GPX
    btnImport.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gpx';
        input.onchange = async e => {
            const file = e.target.files[0];
            const nombreSugerido = file.name.replace('.gpx', '');
            const nombre = prompt("Nombre para la ruta GPX:", nombreSugerido);
            if (!nombre) return;

            const reader = new FileReader();
            reader.onload = async ev => {
                try {
                    const geojson = parseGPX(ev.target.result);
                    showToast('Importando archivo...', 'info');
                    
                    const newRoute = {
                        id: generateId(),
                        nombre: nombre,
                        geojson: JSON.stringify(geojson),
                        fecha: new Date().toISOString()
                    };

                    const success = await syncRoute(newRoute, 'rutas');
                    if (success) {
                        showToast('GPX Importado correctamente', 'success');
                        allRoutes.push(newRoute);
                        renderRoutesList(allRoutes);
                        addRouteToMap(appMap, geojson, `route-${newRoute.id}`);
                    } else {
                        showToast('Error al subir el archivo.', 'error');
                    }
                } catch (err) {
                    showToast('El archivo GPX no es válido.', 'error');
                }
                modal.classList.remove('active');
            };
            reader.readAsText(file);
        };
        input.click();
    };
}
