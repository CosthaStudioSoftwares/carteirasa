// sw.js

/*
 * Sempre altere a versão do cache quando publicar mudanças.
 * Exemplo: v4, v5, v6...
 */
const CACHE_NAME = "carteirinha-virtual-v4";

/*
 * Caminho do projeto no GitHub Pages.
 */
const BASE_PATH = "/Universidade-Cruzeiro-do-Sul/";

/*
 * Arquivos locais essenciais para o funcionamento offline.
 *
 * Evitamos colocar arquivos externos no cache.addAll(),
 * pois a falha de apenas um deles poderia impedir a instalação
 * correta do Service Worker.
 */
const LOCAL_FILES = [
    BASE_PATH,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}manifest.json`,
    `${BASE_PATH}logo_faculdade.png`,
    `${BASE_PATH}jef.jpg`,
    `${BASE_PATH}icon-192x192.png`,
    `${BASE_PATH}icon-512x512.png`
];

/*
 * Evento de instalação.
 *
 * Salva os arquivos locais no cache e força o novo
 * Service Worker a assumir sem aguardar o antigo fechar.
 */
self.addEventListener("install", (event) => {
    console.log(
        "Service Worker: instalando nova versão..."
    );

    self.skipWaiting();

    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => {
                console.log(
                    "Service Worker: adicionando arquivos ao cache."
                );

                return cache.addAll(LOCAL_FILES);
            })
            .catch((error) => {
                console.error(
                    "Service Worker: erro ao criar o cache:",
                    error
                );

                throw error;
            })
    );
});

/*
 * Evento de ativação.
 *
 * Remove versões antigas do cache e faz o novo
 * Service Worker controlar imediatamente as páginas abertas.
 */
self.addEventListener("activate", (event) => {
    console.log(
        "Service Worker: ativando nova versão..."
    );

    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log(
                                "Service Worker: removendo cache antigo:",
                                cacheName
                            );

                            return caches.delete(cacheName);
                        }

                        return Promise.resolve();
                    })
                );
            }),

            self.clients.claim()
        ])
    );
});

/*
 * Evento de requisição.
 *
 * Para páginas HTML, utiliza Network First:
 * primeiro procura a versão mais recente na internet.
 *
 * Para imagens, scripts e outros arquivos, utiliza Cache First:
 * primeiro tenta carregar o arquivo armazenado.
 */
self.addEventListener("fetch", (event) => {
    const request = event.request;

    /*
     * Ignora requisições que não sejam GET.
     */
    if (request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(request.url);

    /*
     * Evita interferir em extensões do navegador,
     * chrome-extension e outros protocolos.
     */
    if (
        requestUrl.protocol !== "http:" &&
        requestUrl.protocol !== "https:"
    ) {
        return;
    }

    /*
     * Requisições de navegação representam páginas HTML.
     */
    const isPageRequest =
        request.mode === "navigate" ||
        request.destination === "document";

    if (isPageRequest) {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(cacheFirst(request));
});

/*
 * Estratégia Network First.
 *
 * Tenta carregar a página atualizada pela internet.
 * Caso não haja conexão, utiliza a versão salva no cache.
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request, {
            cache: "no-store"
        });

        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);

            await cache.put(
                request,
                networkResponse.clone()
            );
        }

        return networkResponse;
    } catch (error) {
        console.warn(
            "Service Worker: sem conexão. Carregando página do cache."
        );

        const cachedResponse =
            await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        const cachedIndex =
            await caches.match(
                `${BASE_PATH}index.html`
            );

        if (cachedIndex) {
            return cachedIndex;
        }

        return new Response(
            `
                <!DOCTYPE html>
                <html lang="pt-BR">
                    <head>
                        <meta charset="UTF-8">
                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1.0"
                        >
                        <title>Sem conexão</title>

                        <style>
                            body {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                                margin: 0;
                                padding: 24px;
                                font-family: Arial, sans-serif;
                                text-align: center;
                                color: #374151;
                                background-color: #f3f4f6;
                            }

                            .offline-container {
                                max-width: 380px;
                                padding: 28px;
                                background-color: #ffffff;
                                border-radius: 16px;
                                box-shadow:
                                    0 10px 25px rgba(0, 0, 0, 0.1);
                            }

                            h1 {
                                color: #0d63ac;
                            }
                        </style>
                    </head>

                    <body>
                        <div class="offline-container">
                            <h1>Você está sem conexão</h1>

                            <p>
                                Não foi possível carregar a Carteirinha
                                Virtual neste momento.
                            </p>

                            <p>
                                Verifique sua conexão com a internet
                                e tente novamente.
                            </p>
                        </div>
                    </body>
                </html>
            `,
            {
                status: 503,
                statusText: "Offline",
                headers: {
                    "Content-Type":
                        "text/html; charset=UTF-8"
                }
            }
        );
    }
}

/*
 * Estratégia Cache First.
 *
 * Tenta carregar imagens, scripts, fontes e outros recursos
 * pelo cache. Caso não encontre, busca na internet e armazena.
 */
async function cacheFirst(request) {
    const cachedResponse =
        await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse =
            await fetch(request);

        /*
         * Apenas respostas válidas são armazenadas.
         */
        if (
            networkResponse &&
            (
                networkResponse.ok ||
                networkResponse.type === "opaque"
            )
        ) {
            const cache =
                await caches.open(CACHE_NAME);

            await cache.put(
                request,
                networkResponse.clone()
            );
        }

        return networkResponse;
    } catch (error) {
        console.warn(
            "Service Worker: recurso indisponível:",
            request.url
        );

        /*
         * Para imagens indisponíveis, retorna uma resposta vazia.
         * Isso evita que o Service Worker apresente um erro interno.
         */
        if (request.destination === "image") {
            return new Response("", {
                status: 404,
                statusText: "Imagem indisponível"
            });
        }

        return new Response(
            "Recurso indisponível.",
            {
                status: 503,
                statusText: "Offline"
            }
        );
    }
}

/*
 * Permite que a página envie uma mensagem para solicitar
 * atualização imediata do Service Worker.
 */
self.addEventListener("message", (event) => {
    if (
        event.data &&
        event.data.type === "SKIP_WAITING"
    ) {
        self.skipWaiting();
    }
});
