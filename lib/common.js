/*
 * Outils partagés par les fonctions de candidature (Vercel).
 *
 * Stockage : un store Vercel Blob PRIVÉ (variable BLOB_READ_WRITE_TOKEN, créée quand le store
 * est relié au projet). Rien n'y est lisible sans passer par les fonctions ci-dessous.
 *   candidatures/<numéro>.json                   la fiche du candidat ;
 *   fichiers/<numéro>/<champ>/<rang>/<morceau>   les pièces jointes, découpées en morceaux ;
 *   en-cours/<numéro>                            index des envois inachevés (nettoyage quotidien).
 */
import { del, get, list, put } from "@vercel/blob";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 Mo par fichier
export const CHUNK_BYTES = 3 * 1024 * 1024;    // 3 Mo par morceau (limite des fonctions Vercel : 4,5 Mo par requête)
export const MAX_FILES_PER_FIELD = 10;

/** Champs de dépôt : nombre de fichiers autorisé et extensions acceptées. */
export const FILE_FIELDS = {
  idfile: { min: 1, max: 1, ext: ["pdf", "png", "jpg", "jpeg"] },
  transcripts: { min: 1, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg"] },
  diplomas: { min: 0, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg"] },
  otherfiles: { min: 0, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg", "doc", "docx"] },
};

export const MIME = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const ID_RE = /^ZTF-[0-9A-Z]{6,12}-[0-9A-Z]{4}$/;
export const recordPath = (id) => `candidatures/${id}.json`;
export const chunkPath = (id, field, index, chunk) => `fichiers/${id}/${field}/${index}/${chunk}`;
export const pendingPath = (id) => `en-cours/${id}`;

const PRIVATE = { access: "private" };
const WRITE = { access: "private", addRandomSuffix: false, allowOverwrite: true };

/* ---------- Accès au stockage ---------- */
export async function readJSON(pathname) {
  const r = await get(pathname, { ...PRIVATE, useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function writeJSON(pathname, data) {
  await put(pathname, JSON.stringify(data), { ...WRITE, contentType: "application/json" });
}
export async function writeBytes(pathname, data) {
  await put(pathname, data, { ...WRITE, contentType: "application/octet-stream" });
}
export async function readStream(pathname) {
  const r = await get(pathname, { ...PRIVATE, useCache: false });
  return r && r.statusCode === 200 ? r.stream : null;
}
export async function listAll(prefix) {
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

/** Vérifie le mot de passe d'administration (en-tête Authorization: Bearer …). */
export function checkAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return fail("ADMIN_PASSWORD n'est pas configuré sur Vercel.", 503);
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!given || !safeEqual(given, expected)) return fail("Mot de passe incorrect.", 401);
  return null;
}

export const chunkCount = (size) => Math.max(1, Math.ceil(size / CHUNK_BYTES));
export const sanitizeName = (name) => String(name || "fichier").replace(/[\u0000-\u001f\\/:*?"<>|]+/g, "_").slice(0, 150);
