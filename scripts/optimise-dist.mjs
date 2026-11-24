// Dernière étape du build, sur dist/ : allège et versionne les ressources pour les connexions lentes.
//  1. Chaque <img> dont l'image a des variantes AVIF/WebP (site/img/variantes.json, voir scripts/images-web.py)
//     devient un <picture> : le navigateur choisit le format le plus léger qu'il lit, à la largeur utile.
//  2. Chaque ressource locale (CSS, JS, images, polices) est appelée avec « ?v=<empreinte du contenu> ».
//     vercel.json met ces adresses en cache un an (« immutable ») : à la visite suivante, le navigateur
//     ne redemande que la page HTML. Un fichier modifié change d'empreinte, donc d'adresse.
//  3. sw.js reçoit le numéro de version du site (cache hors ligne, voir site/sw.js).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const VERSIONED = /\.(css|js|jpe?g|png|webp|avif|svg|woff2|ico)$/i;

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(DIST);
const urlOf = (p) => "/" + relative(DIST, p).split("\\").join("/");

const hashes = new Map();
function hashOf(urlPath) {
  if (!hashes.has(urlPath)) {
    const p = join(DIST, decodeURIComponent(urlPath));
    hashes.set(urlPath, existsSync(p) && statSync(p).isFile() ? createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 10) : null);
  }
  return hashes.get(urlPath);
}
// Adresse locale (relative ou absolue) → chemin absolu sur le site, ou null si elle est externe.
function resolve(ref, baseDir) {
  if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return null;
  const clean = ref.split(/[?#]/)[0];
  return clean.startsWith("/") ? posix.normalize(clean) : posix.normalize(posix.join(baseDir, clean));
}
function version(ref, baseDir) {
  if (ref.includes("?")) return ref;
  const abs = resolve(ref, baseDir);
  if (!abs || !VERSIONED.test(abs)) return ref;
  const h = hashOf(abs);
  return h ? ref + "?v=" + h : ref;
}
const srcsetVersion = (v, baseDir) => v.split(",").map((part) => {
  const [u, ...rest] = part.trim().split(/\s+/);
  return [version(u, baseDir), ...rest].join(" ");
}).join(", ");

// 1. Feuilles de style d'abord : leur empreinte doit tenir compte des url(...) réécrites.
for (const p of files.filter((f) => f.endsWith(".css"))) {
  const baseDir = posix.dirname(urlOf(p));
  const css = readFileSync(p, "utf8");
  const out = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => `url(${q}${version(ref, baseDir)}${q})`);
  if (out !== css) writeFileSync(p, out);
}

// 2. Pages HTML.
const manifestPath = join(DIST, "img", "variantes.json");
const variants = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
rmSync(manifestPath, { force: true });
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

function picture(tag, baseDir) {
  const abs = resolve(attr(tag, "src"), baseDir), v = abs && variants[abs];
  if (!v) return tag;
  const sizes = attr(tag, "sizes") || v.sizes;
  if (!sizes) return tag;
  const set = (ext) => v.widths.filter((w) => hashOf(`${v.base}-${w}.${ext}`))
    .map((w) => `${v.base}-${w}.${ext}?v=${hashOf(`${v.base}-${w}.${ext}`)} ${w}w`).join(", ");
  const avif = set("avif"), webp = set("webp");
  if (!avif || !webp) return tag;
  return `<picture><source type="image/avif" srcset="${avif}" sizes="${sizes}"><source type="image/webp" srcset="${webp}" sizes="${sizes}">${tag}</picture>`;
}

let pages = 0;
for (const p of files.filter((f) => f.endsWith(".html"))) {
  const baseDir = posix.dirname(urlOf(p));
  const html = readFileSync(p, "utf8");
  let out = html.replace(/<picture\b[\s\S]*?<\/picture>|<img\b[^>]*>/g, (tag) => tag.startsWith("<img") ? picture(tag, baseDir) : tag);
  out = out.replace(/<(?:script|link|img|source)\b[^>]*>/g, (tag) => tag.replace(/(\s)(src|href|srcset)="([^"]*)"/g, (m, sp, name, val) =>
    sp + name + '="' + (name === "srcset" ? srcsetVersion(val, baseDir) : version(val, baseDir)) + '"'));
  if (out !== html) { writeFileSync(p, out); pages++; }
}

// 3. Service worker : son cache change de nom à chaque version du site.
const sw = join(DIST, "sw.js");
if (existsSync(sw)) {
  const siteVersion = createHash("sha256").update([...hashes.entries()].sort().join("|") + readFileSync(sw, "utf8")).digest("hex").slice(0, 10);
  writeFileSync(sw, readFileSync(sw, "utf8").replace("__VERSION__", siteVersion));
}
console.log(`optimise-dist : ${pages} page(s) réécrite(s), ${[...hashes.values()].filter(Boolean).length} ressource(s) versionnée(s)`);
