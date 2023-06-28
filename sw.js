let version = '2.0.2'
let cacheName = 'v' + version + '_wifir-pwa';
let filesToCache = [
  '/',
  '/index.html',
  '/js/main.js'
];

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});

/* Serve cached content when offline */
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});

/* Update PWA on version mismatch */
self.addEventListener('activate', function(event) {
  event.waitUntil(
      caches.keys().then(function(cacheNames) {
          return Promise.all(
              cacheNames.filter(function(cacheName) {
                  if (!cacheName.startsWith(cacheName)) {
                      return true;
                  }
              }).map(function(cacheName) {
                  // completely deregister for ios to get changes too
                  console.log('deregistering Serviceworker')
                  if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(function(registrations) {
                          registrations.map(r => {
                              r.unregister()
                          })
                      })
                      window.location.reload(true)
                  }

                  console.log('Removing old cache.', cacheName);
                  return caches.delete(cacheName);
              })
          );
      })
  );
});