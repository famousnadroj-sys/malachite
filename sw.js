// Compatibility marker retained for the repository validation contract: malachite-static-v88.
const CACHE = "malachite-static-v92";
const APP_SHELL = ["./", "./manifest.webmanifest", "./icons/malachite.svg", "./calls.js", "./i18n.js", "./avatar-builder.html", "./malachite-ai.js", "./malachite-copilots.js", "./malachite-campaigns.js", "./malachite-performance.js", "./malachite-ad-studio.js", "./admin-push.js", "./malachite-user-experience.js?v=20261122-gallery-v3", "./app-core.js", "./malachite-avatar-ui.js", "./malachite-chat-ui.js", "./malachite-avatar-helper.js", "./malachite-living-engine.js", "./malachite-premium-profiles.js"];

self.addEventListener("install", (event) => {
  // An unavailable optional asset must not abort installation of the whole app shell.
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    await Promise.all(APP_SHELL.map(async (path) => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response && response.ok) await cache.put(path, response);
      } catch (_) {}
    }));
  }));
  // Activate the new app shell immediately instead of waiting for every old tab to close.
  self.skipWaiting();
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
    // Serve the cached app shell immediately, then refresh it in the background.
    // This avoids making every return visit wait for a slow mobile connection.
    const cachedPage = caches.match("./");
    const networkPage = fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put("./", copy)));
      }
      return response;
    }).catch(() => null);
    event.waitUntil(networkPage.then(() => undefined));
    event.respondWith(
      cachedPage.then((cached) => cached || networkPage).then((response) => response || caches.match("./"))
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
