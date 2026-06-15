// Service Worker — cache para uso offline na sala de emergência.
// Estratégia: navegação = network-first (conteúdo atualizado quando online,
// fallback ao cache offline); demais GET same-origin = stale-while-revalidate.
const CACHE = "acls-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add("./")));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const { request } = e;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then(res => { caches.open(CACHE).then(c => c.put("./", res.clone())); return res; })
        .catch(() => caches.match("./").then(r => r || caches.match(request)))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res && res.status === 200) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
