// CORTEX Gestao - service worker (sprint 34)
// Estrategia: SEMPRE rede primeiro (nunca serve versao velha com
// internet); o cache so entra quando estiver sem conexao.
const CACHE = "cortex-v35";
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); }).catch(function () {});
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});
