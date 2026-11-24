// Serveur local pour les tests : sert dist/ comme Vercel (en-têtes de cache de vercel.json, compression,
// adresses sans .html), exécute les vraies fonctions de api/ et simule Cloudflare R2 en mémoire
// (le code serveur parle au faux R2 par R2_ENDPOINT ; les signatures ne sont pas vérifiées).
//
//   npm run build && node tests/serveur-local.mjs [port]
//
// Pannes simulées (pour les tests de coupure) : POST /__test/pannes avec une liste de règles
//   [{ "path": "expression régulière", "method": "PUT", "times": 2, "mode": "couper" | "apres" | "500" | "bloquer" }]
//   couper  : la connexion est coupée avant que le serveur ne traite la requête ;
//   apres   : la requête est traitée, puis la connexion est coupée (la réponse se perd) ;
//   500     : erreur serveur ;   bloquer : aucune réponse (le client doit abandonner de lui-même).
// GET /__test/etat : clés présentes dans le faux R2 et nombre de requêtes reçues par chemin.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { brotliCompressSync } from "node:zlib";

const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
Object.assign(process.env, {
  R2_ACCOUNT_ID: "local", R2_ACCESS_KEY_ID: "local", R2_SECRET_ACCESS_KEY: "local", R2_BUCKET: "ztf",
  R2_ENDPOINT: `http://localhost:${PORT}/r2`, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "mot-de-passe-local", SESSION_SECRET: "local",
});

const store = new Map();   // clé → { body: Buffer, type, at }
const hits = new Map();
let rules = [];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".pdf": "application/pdf" };

const handlers = {};
async function handler(file) {
  if (!handlers[file]) handlers[file] = (await import(pathToFileURL(join(ROOT, "api", file)).href)).default;
  return handlers[file];
}
function route(pathname) {
  if (pathname.startsWith("/api/admin")) return ["admin.js", "route=" + encodeURIComponent(pathname.replace(/^\/api\/admin\/?/, ""))];
  if (pathname === "/api/dossiers") return ["dossiers/index.js"];
  if (/^\/api\/dossiers\/[^/]+\/finalize$/.test(pathname)) return ["dossiers/[id]/finalize.js"];
  if (/^\/api\/dossiers\/[^/]+\/files\//.test(pathname)) return ["dossiers/[id]/files/[field]/[index]/[chunk].js"];
  if (pathname === "/api/lookup") return ["lookup.js"];
  return null;
}
const readBody = (req) => new Promise((ok) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => ok(Buffer.concat(c))); });
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function fakeR2(req, res, url, body) {
  const key = decodeURIComponent(url.pathname.replace(/^\/r2\/ztf\/?/, ""));
  const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT,GET,HEAD", "access-control-allow-headers": "content-type" };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.method === "PUT") { store.set(key, { body, type: req.headers["content-type"] || "", at: new Date() }); res.writeHead(200, cors); return res.end(); }
  if (req.method === "DELETE") { store.delete(key); res.writeHead(204); return res.end(); }
  if (req.method === "GET" && url.searchParams.get("list-type") === "2") {
    const prefix = url.searchParams.get("prefix") || "";
    const items = [...store.entries()].filter(([k]) => k.startsWith(prefix)).sort();
    res.writeHead(200, { "content-type": "application/xml" });
    return res.end(`<ListBucketResult><IsTruncated>false</IsTruncated>${items.map(([k, v]) =>
      `<Contents><Key>${xml(k)}</Key><Size>${v.body.length}</Size><LastModified>${v.at.toISOString()}</LastModified></Contents>`).join("")}</ListBucketResult>`);
  }
  const o = store.get(key);
  if (!o) { res.writeHead(404, cors); return res.end("NoSuchKey"); }
  res.writeHead(200, { ...cors, "content-type": o.type }); res.end(o.body);
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  let file = join(DIST, p);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  else if (!existsSync(file) && existsSync(file + "/index.html")) file = file + "/index.html";
  if (!file.startsWith(DIST) || !existsSync(file)) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("404"); }
  const type = TYPES[extname(file)] || "application/octet-stream";
  let cache = "public, max-age=0, must-revalidate";
  if (url.searchParams.has("v") || p.startsWith("/vendor/")) cache = "public, max-age=31536000, immutable";
  if (p === "/sw.js") cache = "no-cache";
  let data = readFileSync(file);
  const headers = { "content-type": type, "cache-control": cache };
  if (/text|javascript|json|svg/.test(type) && /\bbr\b/.test(req.headers["accept-encoding"] || "")) { data = brotliCompressSync(data); headers["content-encoding"] = "br"; }
  headers["content-length"] = data.length;
  res.writeHead(200, headers); res.end(req.method === "HEAD" ? undefined : data);
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const body = await readBody(req);
  hits.set(req.method + " " + url.pathname, (hits.get(req.method + " " + url.pathname) || 0) + 1);

  if (url.pathname === "/__test/pannes" && req.method === "POST") { rules = JSON.parse(body.toString() || "[]"); res.writeHead(204); return res.end(); }
  if (url.pathname === "/__test/etat") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ keys: [...store.keys()].sort(), sizes: Object.fromEntries([...store].map(([k, v]) => [k, v.body.length])), hits: Object.fromEntries(hits) }));
  }
  if (url.pathname === "/__test/vider") { store.clear(); hits.clear(); rules = []; res.writeHead(204); return res.end(); }

  const rule = req.method !== "OPTIONS" && rules.find((r) => r.times > 0 && new RegExp(r.path).test(url.pathname) && (!r.method || r.method === req.method));
  if (rule) {
    rule.times--;
    if (rule.mode === "couper") return req.socket.destroy();
    if (rule.mode === "500") { res.writeHead(500, { "content-type": "application/json" }); return res.end('{"error":"panne simulée"}'); }
    if (rule.mode === "bloquer") return; // jamais de réponse
  }
  const lose = rule && rule.mode === "apres";

  try {
    if (url.pathname.startsWith("/r2/")) { if (lose) { fakeR2(req, { writeHead() {}, end() {} }, url, body); return req.socket.destroy(); } return fakeR2(req, res, url, body); }
    const r = route(url.pathname);
    if (r) {
      const h = await handler(r[0]);
      const target = new URL(url); if (r[1]) target.search = r[1] + (url.search ? "&" + url.search.slice(1) : "");
      const request = new Request(target, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
      const out = await h.fetch(request);
      if (lose) return req.socket.destroy();
      const buf = Buffer.from(await out.arrayBuffer());
      res.writeHead(out.status, Object.fromEntries(out.headers)); return res.end(buf);
    }
    if (lose) return req.socket.destroy();
    serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    res.writeHead(500, { "content-type": "application/json" }); res.end(JSON.stringify({ error: String(e.message || e) }));
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
