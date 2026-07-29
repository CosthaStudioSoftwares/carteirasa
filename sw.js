// sw.js

const CACHE_NAME = "carteirinha-ariane-v1";

const BASE_PATH = "/carteirasa/";

const URLS_TO_CACHE = [
    BASE_PATH,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}manifest.json`,
    `${BASE_PATH}logo_faculdade.png`,
    `${BASE_PATH}jef.jpg`,
    `${BASE_PATH}icon-192x192.png`,
    `${BASE_PATH}icon-512x512.png`
];

self.addEventListener("install", (event) => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(
                    "Adicionando arquivos da Ariane ao cache."
                );

                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),

            self.clients.claim()
        ])
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const isPageRequest =
        request.mode === "navigate" ||
        request.destination === "document";

    if (isPageRequest) {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request, {
            cache: "no-store"
        });

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);

            await cache.put(
                request,
                networkResponse.clone()
            );
        }

        return networkResponse;
    } catch (error) {
        const cachedResponse =
            await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        return caches.match(
            `${BASE_PATH}index.html`
        );
    }
}

async function cacheFirst(request) {
    const cachedResponse =
        await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    const networkResponse =
        await fetch(request);

    if (
        networkResponse.ok ||
        networkResponse.type === "opaque"
    ) {
        const cache =
            await caches.open(CACHE_NAME);

        await cache.put(
            request,
            networkResponse.clone()
        );
    }

    return networkResponse;
}
