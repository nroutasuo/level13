/*
My(@aeiea) attempt at making level 13 offline.
*/


cachecontent = JSON.parse(open('/src/files.json'));
self.addEventListener("install", (e) => {
    console.log("[Offline Service Worker]: Installed");
    e.waitUntil((async () => {
        const cache = await caches.open('level13');
        console.log('[Offline Service Worker] Caching all: app shell and content');
        await cache.addAll(cachecontent);
    })());
});
self.addEventListener("fetch", (e) => {
    console.log(`[Offline Service Worker] Fetched resource ${e.request.url}`);
});
self.addEventListener('fetch', (e) => {
    // Cache http and https only, skip unsupported chrome-extension:// and file://...
    if (!(
       e.request.url.startsWith('http:') || e.request.url.startsWith('https:')
    )) {
        return; 
    }

  e.respondWith((async () => {
    const r = await caches.match(e.request);
    console.log(`[Offline Service Worker] Fetching resource: ${e.request.url}`);
    if (r) return r;
    const response = await fetch(e.request);
    const cache = await caches.open('level13');
    console.log(`[Offline Service Worker] Caching new resource: ${e.request.url}`);
    cache.put(e.request, response.clone());
    return response;
  })());
});
