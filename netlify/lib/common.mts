/*
 * Outils partagés par les fonctions de candidature.
 *
 * Stockage (Netlify Blobs, stores à l'échelle du site) :
 *   - "candidatures"          : une fiche JSON par dossier, clé = numéro de dossier ;
 *   - "candidature-fichiers"  : les pièces jointes, découpées en morceaux,
 *                               clé = <numéro>/<champ>/<rang du fichier>/<rang du morceau>.
 * Attention : ces stores sont partagés par tous les contextes de déploiement
 * (production et prévisualisations). Ne pas tester d'envois factices sur une prévisualisation.
 */
import { getStore } from "@netlify/blobs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 Mo par fichier
export const CHUNK_BYTES = 3 * 1024 * 1024;     // 3 Mo par morceau (limite des fonctions : ~4,5 Mo)
export const MAX_FILES_PER_FIELD = 10;

/** Champs de dépôt : nombre de fichiers autorisé et extensions acceptées. */
export const FILE_FIELDS: Record<string, { min: number; max: number; ext: string[] }> = {
  idfile: { min: 1, max: 1, ext: ["pdf", "png", "jpg", "jpeg"] },
  transcripts: { min: 1, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg"] },
  diplomas: { min: 0, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg"] },
  otherfiles: { min: 0, max: MAX_FILES_PER_FIELD, ext: ["pdf", "png", "jpg", "jpeg", "doc", "docx"] },
};

export const MIME: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export type FileEntry = { field: string; index: number; name: string; size: number; ext: string; chunks: number };
export type Dossier = {
  id: string;
  status: "en_cours" | "soumis";
  createdAt: string;
  submittedAt?: string;
  uploadTokenHash?: string;
  fields: Record<string, string | boolean>;
  files: FileEntry[];
  email?: { status: "envoye" | "echec" | "non_configure"; detail?: string };
};

export const records = () => getStore({ name: "candidatures", consistency: "strong" });
export const fileStore = () => getStore({ name: "candidature-fichiers", consistency: "strong" });
/** Index des dossiers dont l'envoi n'est pas terminé (clé = numéro), pour le nettoyage quotidien. */
export const pendingStore = () => getStore({ name: "candidatures-en-cours", consistency: "strong" });

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const fail = (message: string, status = 400) => json({ error: message }, status);

export const sha256 = (s: string) => createHash("sha256").update(s).digest();
export function safeEqual(a: string, b: string) {
  return timingSafeEqual(sha256(a), sha256(b));
}

/** Numéro de dossier lisible, trié dans l'ordre d'arrivée : ZTF-<horodatage base 36>-<4 caractères>. */
export function newId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = Array.from(randomBytes(4), (b) => alphabet[b % alphabet.length]).join("");
  return `ZTF-${Date.now().toString(36).toUpperCase()}-${rnd}`;
}
export const newToken = () => randomBytes(24).toString("base64url");
export const ID_RE = /^ZTF-[0-9A-Z]{6,12}-[0-9A-Z]{4}$/;

/** Vérifie le mot de passe d'administration (en-tête Authorization: Bearer …). */
export function checkAdmin(req: Request): Response | null {
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  if (!expected) return fail("ADMIN_PASSWORD n'est pas configuré sur Netlify.", 503);
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!given || !safeEqual(given, expected)) return fail("Mot de passe incorrect.", 401);
  return null;
}

export function chunkCount(size: number) {
  return Math.max(1, Math.ceil(size / CHUNK_BYTES));
}

export function sanitizeName(name: string) {
  return String(name || "fichier").replace(/[\u0000-\u001f\\/:*?"<>|]+/g, "_").slice(0, 150);
}
