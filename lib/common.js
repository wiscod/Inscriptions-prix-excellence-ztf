/*
 * Outils partagés par les fonctions de candidature (Vercel).
 *
 * Stockage : Cloudflare R2 dès que les variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 * et R2_BUCKET sont posées ; sinon le store Vercel Blob privé (BLOB_READ_WRITE_TOKEN). Dans les deux cas,
 * rien n'est lisible sans passer par les fonctions ci-dessous.
 *   candidatures/<numéro>.json                   la fiche du candidat ;
 *   fichiers/<numéro>/<champ>/<rang>             une pièce jointe (R2 : envoyée directement par le navigateur) ;
 *   fichiers/<numéro>/<champ>/<rang>/<morceau>   une pièce jointe découpée en morceaux (Vercel Blob) ;
 *   en-cours/<numéro>                            index des envois inachevés (nettoyage quotidien) ;
 *   identifiants/<empreinte>.json                identifiant remis au candidat → numéro de dossier (« Déjà inscrit ? ») ;
 *   comptes/, journal/                           comptes de l'administration et journal (lib/auth.js).
 */
import { del, get, list, put } from "@vercel/blob";
import { AwsClient } from "aws4fetch";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 Mo par fichier
export const CHUNK_BYTES = 3 * 1024 * 1024;    // 3 Mo par morceau (limite des fonctions Vercel : 4,5 Mo par requête)
export const MAX_FILES_PER_FIELD = 10;

/** Champs de dépôt : nombre de fichiers autorisé et extensions acceptées. */
export const FILE_FIELDS = {
  transcripts: { min: 1, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg"] },
  diplomas: { min: 0, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg"] },
  otherfiles: { min: 0, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg"] },
};

export const MIME = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const ID_RE = /^ZTF-[0-9A-Z]{6,12}-[0-9A-Z]{4}$/;
export const recordPath = (id) => `candidatures/${id}.json`;
export const chunkPath = (id, field, index, chunk) => `fichiers/${id}/${field}/${index}/${chunk}`;
export const filePath = (id, field, index) => `fichiers/${id}/${field}/${index}`;
export const pendingPath = (id) => `en-cours/${id}`;
export const lookupPath = (hash) => `identifiants/${hash}.json`;

/* ---------- Cloudflare R2 (API compatible S3) ---------- */
const env = process.env;
export const USE_R2 = !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET);
let r2client;
const r2 = () => (r2client ||= new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" }));
const r2url = (key = "") => `${env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`}/${env.R2_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
async function r2fetch(key, init = {}, okMissing = false) {
  const res = await r2().fetch(r2url(key), init);
  if (okMissing && res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 ${init.method || "GET"} ${key} : ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}
const xmlDecode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
async function r2list(prefix) {
  const out = [];
  let token;
  do {
    const q = new URLSearchParams({ "list-type": "2", prefix, "max-keys": "1000" });
    if (token) q.set("continuation-token", token);
    const res = await r2().fetch(`${r2url()}?${q}`);
    if (!res.ok) throw new Error(`R2 liste ${prefix} : ${res.status}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const tag = (t) => (m[1].match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [])[1] || "";
      out.push({ pathname: xmlDecode(tag("Key")), size: Number(tag("Size")), uploadedAt: new Date(tag("LastModified")) });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? xmlDecode((xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [])[1] || "") : undefined;
  } while (token);
  return out;
}
/** Adresse signée, valable `seconds` secondes, pour que le navigateur envoie ou lise un fichier sans passer par Vercel. */
export async function signedUrl(key, method, seconds, query = {}) {
  const u = new URL(r2url(key));
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  u.searchParams.set("X-Amz-Expires", String(seconds));
  const signed = await r2().sign(u.toString(), { method, aws: { signQuery: true } });
  return signed.url;
}

/* ---------- Accès au stockage ---------- */
const PRIVATE = { access: "private" };
const WRITE = { access: "private", addRandomSuffix: false, allowOverwrite: true };

export async function readJSON(pathname) {
  if (USE_R2) {
    const res = await r2fetch(pathname, {}, true);
    return res ? res.json() : null;
  }
  const r = await get(pathname, { ...PRIVATE, useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function writeJSON(pathname, data) {
  if (USE_R2) { await r2fetch(pathname, { method: "PUT", body: JSON.stringify(data), headers: { "content-type": "application/json" } }); return; }
  await put(pathname, JSON.stringify(data), { ...WRITE, contentType: "application/json" });
}
export async function writeBytes(pathname, data, contentType = "application/octet-stream") {
  if (USE_R2) { await r2fetch(pathname, { method: "PUT", body: data, headers: { "content-type": contentType } }); return; }
  await put(pathname, data, { ...WRITE, contentType });
}
export async function readStream(pathname) {
  if (USE_R2) { const res = await r2fetch(pathname, {}, true); return res ? res.body : null; }
  const r = await get(pathname, { ...PRIVATE, useCache: false });
  return r && r.statusCode === 200 ? r.stream : null;
}
/** Tous les objets dont le chemin commence par `prefix` : [{ pathname, size, uploadedAt }]. */
export async function listAll(prefix) {
  if (USE_R2) return r2list(prefix);
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}
export async function deletePaths(paths) {
  if (USE_R2) {
    for (let i = 0; i < paths.length; i += 20) await Promise.all(paths.slice(i, i + 20).map((p) => r2fetch(p, { method: "DELETE" }, true)));
    return;
  }
  for (let i = 0; i < paths.length; i += 100) await del(paths.slice(i, i + 100));
}

/* ---------- Réponses ---------- */
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const fail = (message, status = 400) => json({ error: message }, status);

/** Segments du chemin de la requête, ex. ["api", "dossiers", "ZTF-…", "finalize"]. */
export const segments = (req) => new URL(req.url).pathname.split("/").filter(Boolean).map(decodeURIComponent);

/* ---------- Sécurité ---------- */
export const sha256 = (s) => createHash("sha256").update(s).digest();
export const safeEqual = (a, b) => timingSafeEqual(sha256(a), sha256(b));
export const tokenHash = (t) => sha256(t).toString("hex");

/** Numéro de dossier lisible, trié dans l'ordre d'arrivée : ZTF-<horodatage base 36>-<4 caractères>. */
export function newId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = Array.from(randomBytes(4), (b) => alphabet[b % alphabet.length]).join("");
  return `ZTF-${Date.now().toString(36).toUpperCase()}-${rnd}`;
}
export const newToken = () => randomBytes(24).toString("base64url");

/** Identifiant remis au candidat après l'envoi, ex. « K7QF2-9MXTB » (10 caractères, sans 0/O ni 1/I). */
export function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const c = Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
  return `${c.slice(0, 5)}-${c.slice(5)}`;
}
export const normalizeCode = (code) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const codeHash = (code) => tokenHash("ztf-identifiant:" + normalizeCode(code));

/**
 * Identifiant chiffré avec le jeton d'envoi (AES-256-GCM), gardé dans la fiche : si la réponse de /finalize
 * se perd en route (coupure), le navigateur la redemande avec le même jeton et reçoit le même identifiant.
 * Sans le jeton, que seul le navigateur du candidat connaît, l'identifiant reste illisible.
 */
const codeKey = (token) => sha256("ztf-identifiant-chiffre:" + token);
export function sealCode(code, token) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", codeKey(token), iv);
  const data = Buffer.concat([c.update(code, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64url");
}
export function openCode(sealed, token) {
  try {
    const b = Buffer.from(String(sealed), "base64url");
    const d = createDecipheriv("aes-256-gcm", codeKey(token), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch { return null; }
}

/** Partie d'un dossier que le candidat peut revoir avec son identifiant (sans données techniques). */
export const publicRecord = (d) => ({
  id: d.id, status: d.status, submittedAt: d.submittedAt, fields: d.fields,
  files: d.files.map((f) => ({ field: f.field, name: f.name, size: f.size })),
});

export const chunkCount = (size) => Math.max(1, Math.ceil(size / CHUNK_BYTES));
export const sanitizeName = (name) => String(name || "fichier").replace(/[\u0000-\u001f\\/:*?"<>|]+/g, "_").slice(0, 150);
