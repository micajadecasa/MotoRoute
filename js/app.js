import { initMap, addRouteToMap } from './map.js';
import { fetchRoutes, syncRoute } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar mapa
    const map = initMap();

    // Esperar a que el mapa cargue antes de añadir rutas
    map.on('load', async () => {
        try {
            // Cargar rutas desde Google Sheets
            const routes = await fetchRoutes();

            // Dibujar cada ruta que tenga geoJson
            routes.forEach(route => {
                if (route.geoJson) {
                    try {
                        const geoJson = JSON.parse(route.geoJson);
                        addRouteToMap(map, { geoJson });
                    } catch (e) {
                        console.error("GeoJSON inválido en ruta:", route, e);
                    }
                }
            });
        } catch (error) {
            console.error("Error cargando rutas:", error);
        }
    });

    // Inicializar UI
    setupUI();
});

function setupUI() {
    const modal = document.getElementById('modal-add');
    const btnAdd = document.getElementById('btn-add');
    const btnClose = document.querySelector('.close-modal');

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

    // Navegación inferior
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (this.id === 'btn-add') return;
            document.querySelector('.nav-item.active').classList.remove('active');
            this.classList.add('active');
        });
    });
}
