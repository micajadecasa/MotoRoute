import { initMap, addRouteToMap, enableDrawingMode } from './map.js';
import { fetchRoutes, syncRoute } from './api.js';
import { parseGPX, showToast, generateId } from './utils.js';

let appMap;
let appDirections;
let watchId = null;
let activeDrawing = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar mapa y navegación
    const { map, directions } = initMap();
    appMap = map;
    appDirections = directions;

    // Esperar a que el mapa cargue
    appMap.on('load', async () => {
        showToast('Navegación lista', 'success');
        setupNavigationTracking();
        loadExistingRoutes();
    });

    // Configurar UI
    setupUI();
});

async function loadExistingRoutes() {
    try {
        const routes = await fetchRoutes();
        routes.forEach(route => {
            if (route.geojson) {
                try {
                    const geo = JSON.parse(route.geojson);
                    addRouteToMap(appMap, geo, `route-${route.id}`);
                } catch (e) {
                    console.warn("Error parsing geojson for route", route.id);
                }
            }
        });
    } catch (error) {
        console.error("Error inicial:", error);
    }
}

function setupNavigationTracking() {
    const hud = document.getElementById('moto-hud');
    const hudInstruction = document.getElementById('hud-instruction');
    const hudNextDist = document.getElementById('hud-next-dist');
    const hudSpeed = document.getElementById('hud-speed');
    const hudLimit = document.getElementById('hud-limit');
    const hudEta = document.getElementById('hud-eta');

    // Al recibir una ruta, activar HUD
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
            if (speedKmH > limit) {
                hudSpeed.style.color = '#ff5252';
            } else {
                hudSpeed.style.color = '#fff';
            }

            if (hud.classList.contains('active')) {
                appMap.easeTo({
                    center: [pos.coords.longitude, pos.coords.latitude],
                    pitch: 60,
                    bearing: pos.coords.heading || 0
                });
            }
        }, err => console.error(err), { enableHighAccuracy: true });
    }
}

function setupUI() {
    const modal = document.getElementById('modal-add');
    const btnAdd = document.getElementById('btn-add');
    const btnClose = document.querySelectorAll('.close-modal');
    const btnManual = document.getElementById('btn-manual-route');
    const btnImport = document.getElementById('btn-import-gpx');
    const btnExitNav = document.getElementById('btn-exit-nav');

    btnExitNav.addEventListener('click', () => {
        document.getElementById('moto-hud').classList.remove('active');
        appDirections.removeRoutes();
    });

    btnAdd.addEventListener('click', () => {
        modal.classList.add('active');
    });

    btnClose.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('active');
            if (activeDrawing) {
                activeDrawing.cancel();
                activeDrawing = null;
            }
        });
    });

    // Lógica: Ruta Manual
    btnManual.addEventListener('click', () => {
        modal.classList.remove('active');
        showToast('Toca el mapa para añadir puntos.', 'info');
        
        const finishBtn = document.createElement('button');
        finishBtn.id = 'btn-finish-draw';
        finishBtn.innerText = 'Guardar Ruta';
        finishBtn.className = 'floating-action-btn';
        document.body.appendChild(finishBtn);

        activeDrawing = enableDrawingMode(appMap, null, async (finalGeoJSON) => {
            finishBtn.remove();
            const newRoute = {
                id: generateId(),
                nombre: "Ruta Manual " + new Date().toLocaleDateString(),
                geojson: JSON.stringify(finalGeoJSON),
                fecha: new Date().toISOString()
            };

            const success = await syncRoute(newRoute);
            if (success) {
                showToast('¡Ruta guardada!', 'success');
                addRouteToMap(appMap, finalGeoJSON, `route-${newRoute.id}`);
            }
            activeDrawing = null;
        });

        finishBtn.onclick = () => activeDrawing.finish();
    });

    // Lógica: Importar GPX
    btnImport.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gpx';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async event => {
                try {
                    const content = event.target.result;
                    const geojson = parseGPX(content);
                    const newRoute = {
                        id: generateId(),
                        nombre: file.name.replace('.gpx', ''),
                        geojson: JSON.stringify(geojson),
                        fecha: new Date().toISOString()
                    };
                    const success = await syncRoute(newRoute);
                    if (success) {
                        showToast('GPX importado', 'success');
                        addRouteToMap(appMap, geojson, `route-${newRoute.id}`);
                    }
                } catch (err) {
                    showToast('Error: ' + err.message, 'error');
                }
                modal.classList.remove('active');
            };
            reader.readAsText(file);
        };
        input.click();
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (this.id === 'btn-add') return;
            document.querySelector('.nav-item.active').classList.remove('active');
            this.classList.add('active');
        });
    });
}
