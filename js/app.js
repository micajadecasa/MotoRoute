import { initMap, addRouteToMap } from './map.js';
import { fetchRoutes, syncRoute } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar mapa
    const map = initMap();

    // Esperar a que el mapa cargue
    map.on('load', async () => {
        try {
            const routes = await fetchRoutes();
            routes.forEach(route => {
                if (route.gpx) {
                    // Aquí podrías parsear el GPX a GeoJSON para dibujarlo
                    // addRouteToMap(map, { geoJson: parsedGpx });
                }
            });
        } catch (error) {
            console.error("Error inicial:", error);
        }
    });

    // Configurar UI
    setupUI(map);
});

function setupUI(map) {
    const modal = document.getElementById('modal-add');
    const btnAdd = document.getElementById('btn-add');
    const btnClose = document.querySelector('.close-modal');
    const btnManual = document.getElementById('btn-manual-route');
    const btnImport = document.getElementById('btn-import-gpx');

    // Abrir modal
    btnAdd.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // Cerrar modal
    btnClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Cerrar modal al pulsar fuera
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Lógica: Ruta Manual
    btnManual.addEventListener('click', () => {
        modal.style.display = 'none';
        alert('Haz clic en el mapa para marcar puntos. (Simulado)');
        
        map.getCanvas().style.cursor = 'crosshair';
        map.once('click', (e) => {
            console.log("Punto marcado:", e.lngLat);
            const newRoute = {
                id: Date.now().toString(),
                nombre: "Ruta Manual " + new Date().toLocaleDateString(),
                lat: e.lngLat.lat,
                lng: e.lngLat.lng,
                gpx: ""
            };
            syncRoute(newRoute).then(success => {
                if (success) alert('¡Ruta guardada en Google Sheets!');
                else alert('Error de sincronización (CORS). Revisa la configuración de Apps Script.');
            });
            map.getCanvas().style.cursor = '';
        });
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
                const content = event.target.result;
                const newRoute = {
                    id: Date.now().toString(),
                    nombre: file.name,
                    gpx: content
                };
                const success = await syncRoute(newRoute);
                if (success) alert('¡GPX subido con éxito!');
                else alert('Error al subir GPX. Revisa el CORS.');
                modal.style.display = 'none';
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
        });
    });
}
