const CACHE = "malachite-static-v60";
const APP_SHELL = ["./", "./manifest.webmanifest", "./icons/malachite.svg", "./calls.js", "./i18n.js", "./avatar-builder.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
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
  // Never cache authenticated, database, storage, or Edge Function traffic.
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
  if (staticPaths.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = event.notification.data && event.notification.data.url || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow(destination);
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data.json(); } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Malachite", {
      body: data.body || "",
      icon: "./icons/malachite.svg",
      badge: "./icons/malachite.svg",
      tag: data.tag || "malachite",
      data: { url: data.url || "./" },
      vibrate: [100, 50, 100]
    })
  );
});
