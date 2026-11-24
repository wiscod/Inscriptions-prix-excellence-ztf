/*
 * Service worker du formulaire : la page reste ouverte quand le réseau coupe.
 *  - pages (/, /enspy, …) : toujours demandées au réseau d'abord, donc toujours à jour ; la copie gardée ne sert
 *    que si le réseau ne répond pas (hors connexion, ou plus de 10 s sans réponse alors qu'une copie existe) ;
 *  - ressources versionnées (?v=…, voir scripts/optimise-dist.mjs) et jsPDF : servies depuis le cache, elles ne
 *    changent jamais à adresse égale ;
 *  - /api/ et /admin/ ne passent jamais par ce cache (données personnelles, jetons).
 * Le nom du cache change à chaque version du site (« __VERSION__ » est remplacé au build) ; l'ancien est effacé.
 */
var CACHE = "ztf-__VERSION__";
var NAV_TIMEOUT_MS = 10000;

self.addEventListener("install", function (e) {
  self.skipWaiting();
  // Garde tout de suite les pages déjà ouvertes et leurs ressources (déjà dans le cache HTTP : pas de nouveau téléchargement).
  e.waitUntil(self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then(function (list) {
    return caches.open(CACHE).then(function (cache) {
      return Promise.all(list.map(function (c) {
        var u = new URL(c.url);
        if (u.origin !== location.origin || skip(u)) return null;
        return fetch(u.pathname).then(function (res) {
          if (!res.ok) return null;
          var copy = res.clone();
          return res.text().then(function (html) {
            // Scripts, styles et polices seulement : les images ne sont pas indispensables hors connexion.
            var refs = [], re = /(?:src|href)="([^"]+\.(?:js|css|woff2)\?v=[0-9a-f]+)"/g, m;
            while ((m = re.exec(html))) refs.push(m[1]);
            return Promise.all([cache.put(u.pathname, copy)].concat(refs.map(function (r) {
              return cache.add(new URL(r, u).href).catch(function () { /* ressource facultative */ });
            })));
          });
        }).catch(function () { return null; });
      }));
    });
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("ztf-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function skip(u) { return /^\/(api|admin|maquettes)(\/|$)/.test(u.pathname) || u.pathname === "/sw.js"; }

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var u = new URL(req.url);
  if (u.origin !== location.origin || skip(u)) return;

  if (req.mode === "navigate") { e.respondWith(page(req, u)); return; }
  if (/[?&]v=[0-9a-f]+/.test(u.search) || /^\/vendor\//.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok) cache.put(req, res.clone()); return res; });
      });
    }));
  }
});

function page(req, u) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(u.pathname).then(function (copy) {
      var net = fetch(req).then(function (res) {
        if (res.ok && res.type === "basic") cache.put(u.pathname, res.clone());
        return res;
      });
      if (!copy) return net.catch(function () { return offline(); });
      // Réseau d'abord ; la copie si le réseau échoue ou traîne trop.
      return new Promise(function (resolve) {
        var done = false, finish = function (r) { if (!done) { done = true; resolve(r); } };
        var timer = setTimeout(function () { finish(copy); }, NAV_TIMEOUT_MS);
        net.then(function (res) { clearTimeout(timer); finish(res); }, function () { clearTimeout(timer); finish(copy); });
      });
    });
  });
}

function offline() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors connexion</title>' +
    '<body style="font:16px/1.5 system-ui,sans-serif;max-width:520px;margin:40px auto;padding:0 16px;color:#0d1330">' +
    "<h1 style=\"font-size:1.2rem\">Hors connexion · Offline</h1><p>La page n'a pas encore été gardée sur cet appareil. Réessayez quand le réseau revient.</p>" +
    "<p>This page has not been saved on this device yet. Try again when the network is back.</p><button onclick=\"location.reload()\">Réessayer · Retry</button></body>",
    { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}
