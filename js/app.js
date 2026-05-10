import { initMap, addRouteToMap, enableDrawingMode } from './map.js';
import { fetchRoutes, syncRoute } from './api.js';
import { parseGPX, showToast, generateId } from './utils.js';

let appMap;
let activeDrawing = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar mapa
    appMap = initMap();

    // Esperar a que el mapa cargue
    appMap.on('load', async () => {
        showToast('Cargando rutas...', 'info');
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
            showToast(`${routes.length} rutas cargadas`, 'success');
        } catch (error) {
            console.error("Error inicial:", error);
            showToast('Error al cargar rutas', 'error');
        }
    });

    // Configurar UI
    setupUI();
});

function setupUI() {
    const modal = document.getElementById('modal-add');
    const btnAdd = document.getElementById('btn-add');
    const btnClose = document.querySelectorAll('.close-modal');
    const btnManual = document.getElementById('btn-manual-route');
    const btnImport = document.getElementById('btn-import-gpx');

    // Abrir modal
    btnAdd.addEventListener('click', () => {
        modal.classList.add('active');
    });

    // Cerrar modal
    btnClose.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('active');
            if (activeDrawing) {
                activeDrawing.cancel();
                activeDrawing = null;
            }
        });
    });

    // Cerrar modal al pulsar fuera
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Lógica: Ruta Manual
    btnManual.addEventListener('click', () => {
        modal.classList.remove('active');
        showToast('Toca el mapa para añadir puntos. Pulsa el botón de Guardar al terminar.', 'info');
        
        // Crear botón flotante para finalizar
        const finishBtn = document.createElement('button');
        finishBtn.id = 'btn-finish-draw';
        finishBtn.innerText = 'Guardar Ruta';
        finishBtn.className = 'floating-action-btn';
        document.body.appendChild(finishBtn);

        activeDrawing = enableDrawingMode(appMap, null, async (finalGeoJSON) => {
            finishBtn.remove();
            showToast('Guardando ruta...', 'info');
            
            const newRoute = {
                id: generateId(),
                nombre: "Ruta Manual " + new Date().toLocaleDateString(),
                geojson: JSON.stringify(finalGeoJSON),
                fecha: new Date().toISOString()
            };

            const success = await syncRoute(newRoute);
            if (success) {
                showToast('¡Ruta guardada con éxito!', 'success');
                addRouteToMap(appMap, finalGeoJSON, `route-${newRoute.id}`);
            } else {
                showToast('Error al sincronizar. Revisa la consola.', 'error');
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
                    
                    showToast('Subiendo GPX...', 'info');
                    
                    const newRoute = {
                        id: generateId(),
                        nombre: file.name.replace('.gpx', ''),
                        geojson: JSON.stringify(geojson),
                        fecha: new Date().toISOString()
                    };

                    const success = await syncRoute(newRoute);
                    if (success) {
                        showToast('GPX importado con éxito', 'success');
                        addRouteToMap(appMap, geojson, `route-${newRoute.id}`);
                    } else {
                        showToast('Error al subir GPX', 'error');
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

    // Navegación inferior
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (this.id === 'btn-add') return;
            document.querySelector('.nav-item.active').classList.remove('active');
            this.classList.add('active');
            
            // Aquí podrías implementar navegación SPA real
            // history.pushState({page: this.id}, "", `/${this.id}`);
        });
    });
}
