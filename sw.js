// sw.js - Basic Service Worker for Shalom Premium

const CACHE_NAME = 'shalom-premium-cache-v1'; // Increment version if you update cached files later
const urlsToCache = [
  '/',                  // The root path (needed for start_url)
  '/index.html',        // The main HTML file
  '/manifest.json',     // The app manifest file
  '/sw.js',             // The service worker itself (important to cache itself!)
  '/icons/icon.svg'     // The SVG icon file
  // If you had other essential files like a separate CSS file, add its path here too
];

// ---- Install Event ----
// This runs when the service worker is first installed.
// We open a cache and save our essential app files.
self.addEventListener('install', event => {
  console.log('[Service Worker] Install event triggered');
  event.waitUntil( // Wait until the caching is done before finishing install
    caches.open(CACHE_NAME) // Open our specific cache
      .then(cache => {
        console.log('[Service Worker] Cache opened. Caching core assets...');
        return cache.addAll(urlsToCache); // Add all the files listed above to the cache
      })
      .then(() => {
        console.log('[Service Worker] Core assets cached successfully.');
        // Force the waiting service worker to become the active service worker.
         return self.skipWaiting(); 
      })
      .catch(error => {
        // Log any errors during caching
        console.error('[Service Worker] Caching failed during install:', error);
      })
  );
});

// ---- Activate Event ----
// This runs after the service worker is installed (and potentially after waiting).
// It's a good place to clean up old caches.
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate event triggered');
    event.waitUntil(
        caches.keys().then(keyList => {
            // Delete caches that are not our current one
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => {
             console.log('[Service Worker] Claiming clients...');
             // Take control of any open pages immediately
             return self.clients.claim();
        })
    );
});


// ---- Fetch Event ----
// This runs every time the website requests a file (like an image, CSS, or the page itself).
// We check if we have it in the cache first.
self.addEventListener('fetch', event => {
  // We only want to cache GET requests for our own assets, not external APIs etc.
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
      // Let the browser handle non-GET requests or requests to other origins normally
      // console.log('[Service Worker] Ignoring non-GET or cross-origin request:', event.request.url);
      return; 
  }

  // Skip caching for specific external resources like the quote API or the CORS proxy
  // (Ensures these always try to fetch live data)
  if (event.request.url.includes('zenquotes.io') || event.request.url.includes('proxy.cors.sh')) {
    // console.log('[Service Worker] Fetch event ignored for external API:', event.request.url);
    return; // Let the browser handle it directly
  }

  // Strategy: Cache First, then Network
  event.respondWith(
    caches.match(event.request) // Check if the request matches something in our cache
      .then(cachedResponse => {
        // Return the cached response if found
        if (cachedResponse) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        // If not in cache, fetch it from the network
        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request); 
        // Note: We are not dynamically adding network responses to cache in this basic version
      })
      .catch(error => {
        console.error('[Service Worker] Fetch failed:', error);
        // Optional: You could return a specific offline fallback page here
        // For example: return caches.match('/offline.html');
      })
  );
});