const CACHE_NAME = 'motoroutes-v1';
const ASSETS = [
    'index.html',
    'css/style.css',
    'js/app.js',
    'js/map.js',
    'js/api.js',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
