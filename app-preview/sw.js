/* Handles Lab app service worker, scope /app-preview/.
 * Precache: app shell + data + art + ball-path diagrams. Loop clips (.mp4) are NOT precached:
 * each is cached the first time it's viewed (Range-aware for iOS). Bump V to ship a new shell. */
const V = "hlapp-shell-v1", CLIPS = "hlapp-clips-v1";
const PATHS = ["behind","chain","combo","control","cross","double","fig8","fig8drib","gauntlet","halfspin","hang","hesi","inout","jumpstop","kill","ladder","pace","pivot","pound","pushpull","retreat","ricochet","skip","slaps","snatch","speed","spin","stance","stutter","thru","vfront","vside","wrap"];
const SHELL = ["/app-preview/", "/app-preview/app.css", "/app-preview/app.js", "/app-preview/data.js", "/app-preview/manifest.webmanifest",
  "/assets/signup.js", "/assets/fonts/luckiest-guy-400.woff2", "/assets/fonts/anton-latin-400.woff2",
  "/assets/img/hero.webp", "/assets/img/athlete.webp", "/assets/img/icon-180.png", "/assets/img/icon-192.png", "/assets/img/icon-32.png"]
  .concat(PATHS.map(p => "/assets/paths/" + p + ".svg"));
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("hlapp-") && k !== V && k !== CLIPS).map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function clip(req) {
  const url = req.url.split("#")[0], cache = await caches.open(CLIPS);
  let full = await cache.match(url);
  if (!full) { const r = await fetch(url); if (!r.ok) return r; await cache.put(url, r.clone()); full = r; }
  const range = req.headers.get("range"); if (!range) return full;
  const buf = await full.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { "Content-Type": "video/mp4", "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;     // signups (POST) and third parties pass through
  if (url.pathname.endsWith(".mp4")) { e.respondWith(clip(req).catch(() => fetch(req))); return; }
  if (req.mode === "navigate") {                                          // network-first so new builds show up, shell offline
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(x => x.put("/app-preview/", c)); return r; }).catch(() => caches.match("/app-preview/")));
    return;
  }
  if (url.pathname.startsWith("/app-preview/") || url.pathname === "/assets/signup.js") {   // app code + data: network-first, cache fallback
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {   // fonts/art/diagrams: cache-first
    if (r.ok && url.pathname.startsWith("/assets/")) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); }
    return r;
  })));
});
