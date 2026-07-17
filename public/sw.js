// NavStream Service Worker
// Handles push notifications and basic offline caching

const CACHE_NAME = "navstream-v1";
const OFFLINE_URLS = ["/logo.svg"];

// Install — pre-cache essential assets
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(OFFLINE_URLS);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// Activate — clean up old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function (name) {
              return name !== CACHE_NAME;
            })
            .map(function (name) {
              return caches.delete(name);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// Fetch — network-first with cache fallback for navigation
self.addEventListener("fetch", function (event) {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip API and streaming requests
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/whep/") ||
    url.pathname.startsWith("/lk/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match(event.request);
    })
  );
});

// Push notification handler
self.addEventListener("push", function (event) {
  if (event.data) {
    var data = event.data.json();
    var options = {
      body: data.body,
      icon: data.icon || "/logo.svg",
      badge: "/logo.svg",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || "/",
      },
      tag: data.tag || "navstream-notification",
    };
    event.waitUntil(
      self.registration.showNotification(data.title || "NavStream", options)
    );
  }
});

// Notification click — open the app
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Focus existing window if available
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
