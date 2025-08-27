// Service Worker for Ocarina Fingering Chart Web Application
// Provides offline functionality and performance optimizations

const CACHE_NAME = 'ocarina-chart-v1.0.0';
const STATIC_CACHE_NAME = 'ocarina-static-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/vite.svg',
  // Note: Vite build files will be added dynamically
];

// Runtime cache configuration
const RUNTIME_CACHE_CONFIG = {
  // Cache images for 30 days
  images: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 50
  },
  // Cache API responses for 1 hour
  api: {
    maxAge: 60 * 60 * 1000, // 1 hour
    maxEntries: 100
  }
};

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|woff2?|ttf|eot|ico|svg)$/);
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  return request.destination === 'image' || 
         request.url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/);
}

/**
 * Check if request is for an API endpoint
 */
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

/**
 * Handle static asset requests (cache first strategy)
 */
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Failed to handle static asset:', error);
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return new Response('Asset not available offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Handle image requests (cache first with expiration)
 */
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Check if cached response is still valid
    if (cachedResponse && !isExpired(cachedResponse, RUNTIME_CACHE_CONFIG.images.maxAge)) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Add timestamp header for expiration checking
      const responseToCache = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      cache.put(request, responseToCache.clone());
      return networkResponse;
    }
    
    // Return cached version if network fails
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw new Error('Network request failed');
  } catch (error) {
    console.error('Failed to handle image request:', error);
    
    // Return a placeholder or error response
    return new Response('Image not available', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Handle API requests (network first with cache fallback)
 */
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      const responseToCache = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      cache.put(request, responseToCache.clone());
      return networkResponse;
    }
    
    throw new Error('Network request failed');
  } catch (error) {
    console.error('API request failed, trying cache:', error);
    
    // Fallback to cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, RUNTIME_CACHE_CONFIG.api.maxAge)) {
      // Add header to indicate this is from cache
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...Object.fromEntries(cachedResponse.headers.entries()),
          'x-served-from': 'cache'
        }
      });
      
      return response;
    }
    
    // Return error response
    return new Response(JSON.stringify({ 
      error: 'Service unavailable',
      message: 'Unable to fetch data. Please check your connection.'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle navigation requests (cache first with network fallback)
 */
async function handleNavigationRequest(request) {
  try {
    // For navigation requests, try cache first for better performance
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Fetch updated version in background
      fetch(request).then(async (networkResponse) => {
        if (networkResponse.ok) {
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(request, networkResponse);
        }
      }).catch(() => {
        // Ignore background fetch errors
      });
      
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Navigation request failed:', error);
    
    // Try to return cached index.html for SPA routing
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
    
    // Return offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Ocarina Chart Generator</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              background: #f8f9fa;
              color: #2d3748;
            }
            .offline-content {
              text-align: center;
              max-width: 400px;
              padding: 2rem;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { margin-bottom: 1rem; }
            p { color: #718096; line-height: 1.6; }
            button {
              background: #3182ce;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              margin-top: 1rem;
            }
            button:hover { background: #2c5aa0; }
          </style>
        </head>
        <body>
          <div class="offline-content">
            <div class="offline-icon">📱</div>
            <h1>You're Offline</h1>
            <p>The Ocarina Chart Generator is not available right now. Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
    `, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/**
 * Check if cached response is expired
 */
function isExpired(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) {
    return true; // Consider expired if no timestamp
  }
  
  const age = Date.now() - parseInt(cachedAt, 10);
  return age > maxAge;
}

/**
 * Clean up expired cache entries
 */
async function cleanupExpiredEntries() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    const deletePromises = requests.map(async (request) => {
      const response = await cache.match(request);
      if (response && isExpired(response, RUNTIME_CACHE_CONFIG.images.maxAge)) {
        return cache.delete(request);
      }
    });
    
    await Promise.all(deletePromises);
    console.log('Expired cache entries cleaned up');
  } catch (error) {
    console.error('Failed to cleanup expired entries:', error);
  }
}

// Periodic cleanup of expired entries
setInterval(cleanupExpiredEntries, 60 * 60 * 1000); // Every hour

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

console.log('Service Worker loaded successfully');