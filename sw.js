// sw.js

// Define um nome e versão para o nosso cache.
// IMPORTANTE: Se você fizer alterações futuras nos arquivos, mude a versão (ex: v4, v5)
// para forçar o navegador a atualizar o cache.
const CACHE_NAME = 'carteirinha-virtual-v3';

// Define o caminho base do projeto no GitHub Pages.
const BASE_PATH = '/Universidade-Cruzeiro-do-Sul/';

// Lista completa de todos os arquivos necessários para o app funcionar offline.
// Os caminhos foram corrigidos para a estrutura do seu projeto.
const URLS_TO_CACHE = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}logo_faculdade.png`,
  `${BASE_PATH}jef.jpg`,
  `${BASE_PATH}icon-192x192.png`,
  `${BASE_PATH}icon-512x512.png`,
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js',
  'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js'
];

// Evento 'install': é disparado quando o Service Worker é instalado.
// Ele abre o cache e salva todos os arquivos da lista.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto. Adicionando arquivos ao cache...');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => {
          console.error('Falha ao adicionar arquivos ao cache durante a instalação:', err);
      })
  );
});

// Evento 'fetch': é disparado para cada requisição que a página faz.
// A estratégia aqui é "cache-first": primeiro tenta buscar do cache, se não encontrar, busca na rede.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Se a resposta for encontrada no cache, a retorna.
        if (response) {
          return response;
        }
        // Se não, faz a requisição à rede.
        return fetch(event.request);
      })
  );
});

// Evento 'activate': é disparado quando o novo Service Worker é ativado.
// Ele é perfeito para limpar caches antigos e garantir que o usuário tenha a versão mais recente.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Se o nome de um cache for diferente do cache atual, ele é deletado.
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
