import { initMap, addRouteToMap, enableDrawingMode } from './map.js';
import { fetchRoutes, syncRoute } from './api.js';
import { parseGPX, showToast, generateId } from './utils.js';

let appMap;
let appDirections;
let watchId = null;
let activeDrawing = null;
let allRoutes = [];

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
        allRoutes = await fetchRoutes();
        renderRoutesList(allRoutes);
        
        allRoutes.forEach(route => {
            if (route.geojson) {
                try {
                    const geo = JSON.parse(route.geojson);
                    addRouteToMap(appMap, geo, `route-${route.id}`);
                } catch (e) {
                    console.warn("Error parseando geojson:", route.id);
                }
            }
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
                <p>${new Date(route.fecha).toLocaleDateString()}</p>
            </div>
            <button class="btn-view-route primary-btn" data-id="${route.id}">VER</button>
        </div>
    `).join('');

    // Eventos para ver ruta
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

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    // Actualizar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (viewId === 'map-container' && item.id === 'btn-home') item.classList.add('active');
        if (viewId === 'view-routes' && item.id === 'btn-routes') item.classList.add('active');
        if (viewId === 'view-pois' && item.id === 'btn-pois') item.classList.add('active');
    });

    if (viewId === 'map-container') {
        appMap.resize();
    }
}

function setupNavigationTracking() {
    const hud = document.getElementById('moto-hud');
    const hudInstruction = document.getElementById('hud-instruction');
    const hudNextDist = document.getElementById('hud-next-dist');
    const hudSpeed = document.getElementById('hud-speed');
    const hudLimit = document.getElementById('hud-limit');
    const hudEta = document.getElementById('hud-eta');

    appDirections.on('route', (e) => {
        const route = e.route[0];
        if (route) {
            hud.classList.add('active');
            updateHUD(route);
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

            if (hud.classList.contains('active')) {
                appMap.easeTo({
                    center: [pos.coords.longitude, pos.coords.latitude],
                    pitch: 60,
                    bearing: pos.coords.heading || 0
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

    // Botón Salir Navegación: Oculta HUD pero mantiene la ruta si el usuario quiere
    btnExitNav.onclick = () => {
        document.getElementById('moto-hud').classList.remove('active');
        // No eliminamos la ruta de Directions para que el usuario pueda seguir viéndola
        // Si prefiere limpiar todo, descomenta la línea de abajo:
        // appDirections.removeRoutes();
        showToast('Navegación finalizada. Ruta mantenida en mapa.', 'info');
    };

    btnAdd.onclick = () => modal.classList.add('active');

    btnClose.forEach(btn => {
        btn.onclick = () => {
            modal.classList.remove('active');
            if (activeDrawing) {
                activeDrawing.cancel();
                activeDrawing = null;
            }
        };
    });

    // Navegación de pestañas
    document.getElementById('btn-home').onclick = () => switchView('map-container');
    document.getElementById('btn-routes').onclick = () => switchView('view-routes');
    document.getElementById('btn-pois').onclick = () => switchView('view-pois');

    // Lógica: Añadir POI (Punto de Interés)
    btnAddPoi.onclick = () => {
        modal.classList.remove('active');
        showToast('Toca el mapa para situar el punto de interés.', 'info');
        
        const clickHandler = async (e) => {
            appMap.off('click', clickHandler);
            const nombre = prompt("Nombre del Punto de Interés:");
            if (!nombre) return;

            const newPoi = {
                id: generateId(),
                nombre: nombre,
                lat: e.lngLat.lat,
                lng: e.lngLat.lng,
                tipo: 'marcador',
                fecha: new Date().toISOString()
            };

            showToast('Guardando punto...', 'info');
            const success = await syncRoute(newPoi, 'pois'); // Usamos el path 'pois'
            if (success) {
                showToast('¡Punto guardado con éxito!', 'success');
                new mapboxgl.Marker({ color: '#ff9800' })
                    .setLngLat([newPoi.lng, newPoi.lat])
                    .setPopup(new mapboxgl.Popup().setHTML(`<h3>${newPoi.nombre}</h3>`))
                    .addTo(appMap);
            } else {
                showToast('Error al guardar. Revisa la consola.', 'error');
            }
        };

        appMap.on('click', clickHandler);
    };

    // Ruta Manual
    btnManual.onclick = () => {
        modal.classList.remove('active');
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
                nombre: "Ruta Manual " + new Date().toLocaleDateString('es-ES'),
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
                console.error("Error al guardar la ruta. Verifica el despliegue de Apps Script como 'Anyone'.");
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
            const reader = new FileReader();
            reader.onload = async ev => {
                try {
                    const geojson = parseGPX(ev.target.result);
                    showToast('Importando archivo...', 'info');
                    
                    const newRoute = {
                        id: generateId(),
                        nombre: file.name.replace('.gpx', ''),
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
