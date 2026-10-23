/* Handles Lab service worker. Pages: network-first (offline falls back to the last copy).
 * CSS/JS/fonts/images: stale-while-revalidate. Loop clips (.mp4): NOT precached; each clip is cached
 * the first time it is viewed, then served from cache (with Range support for iOS Safari).
 * Activate cleanup deletes only the site's own old "hl-" caches; the app's "hlapp-" caches (/app-preview/sw.js) are never touched. */
const V = "hl-v2", PAGES = "hl-pages-v1", CLIPS = "hl-clips-v1";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(["/", "/assets/site.css", "/assets/progress.js", "/assets/signup.js"]))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("hl-") && !k.startsWith("hlapp-") && ![V, PAGES, CLIPS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function clip(req) {
  const url = req.url.split("#")[0], cache = await caches.open(CLIPS);
  let full = await cache.match(url);
  if (!full) {
    const r = await fetch(url);                       // whole file, first view only
    if (!r.ok) return r;
    await cache.put(url, r.clone()); full = r;
  }
  const range = req.headers.get("range");
  if (!range) return full;
  const buf = await full.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { "Content-Type": "video/mp4", "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // signup POSTs and third parties untouched
  if (url.pathname.endsWith(".mp4")) { e.respondWith(clip(req).catch(() => fetch(req))); return; }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(PAGES).then(p => p.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("/"))));
    return;
  }
  if (/^\/assets\//.test(url.pathname)) {
    e.respondWith(caches.open(V).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
