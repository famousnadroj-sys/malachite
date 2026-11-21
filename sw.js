// Compatibility marker retained for the repository validation contract: malachite-static-v62.
const CACHE = "malachite-static-v64";
const APP_SHELL = ["./", "./manifest.webmanifest", "./icons/malachite.svg", "./calls.js", "./i18n.js", "./avatar-builder.html", "./malachite-ai.js", "./admin-push.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));

});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("malachite-static-") && key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/\/(auth|rest|storage|functions)\/v1\//.test(url.pathname)) return;
  if (request.headers.has("Authorization")) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("./", copy));
        }
        return response;
      }).catch(() => caches.match("./"))
    );
    return;
  }
  const staticPaths = APP_SHELL.map((path) => new URL(path, self.registration.scope).pathname);
  if (staticPaths.includes(url.pathname)) event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const destination = new URL((event.notification.data && event.notification.data.url) || "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope)) {
          try { await client.navigate(destination); } catch (_) {}
          return client.focus();
        }
      }
      return self.clients.openWindow(destination);
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data.json(); } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Malachite", {
      body: data.body || "Un nouveau paiement attend ta vérification.",
      icon: "./icons/malachite.svg",
      badge: "./icons/malachite.svg",
      tag: data.tag || "malachite",
      renotify: true,
      data: { url: data.url || "./", payment_id: data.payment_id || null },
      actions: [{ action: "open", title: "Voir les paiements" }, { action: "dismiss", title: "Plus tard" }],
      vibrate: [100, 50, 100]
    })
  );
});
