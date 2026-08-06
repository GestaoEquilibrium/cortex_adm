// CORTEX Gestao - service worker (sprint 34)
// Estrategia: SEMPRE rede primeiro (nunca serve versao velha com
// internet); o cache so entra quando estiver sem conexao.
const CACHE = "cortex-v45";
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
  if (e.request.url.indexOf("http") !== 0) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); }).catch(function () {});
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});

// ---- Notificacoes (sprint 37) ----
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { corpo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "CORTEX Gestão", {
    body: d.corpo || "Novo aviso.",
    icon: "icons/icon-192.png",
    badge: "icons/badge-96.png",
    data: { url: d.url || "./" },
    tag: d.tipo || "cortex",
    vibrate: [80, 40, 80]
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var alvo = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) { if ("focus" in lista[i]) return lista[i].focus(); }
    if (clients.openWindow) return clients.openWindow(alvo);
  }));
});
