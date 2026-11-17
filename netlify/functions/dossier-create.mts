/*
 * POST /api/dossiers : enregistre la fiche (sans les fichiers) et renvoie le numéro de dossier
 * et un jeton d'envoi. Les fichiers arrivent ensuite par morceaux (dossier-upload),
 * puis dossier-finalize valide le dossier.
 * Corps : { fields: {...}, files: [{ field, index, name, size }] }
 */
import type { Config } from "@netlify/functions";
import { validateFields } from "../lib/validate.mts";
import {
  CHUNK_BYTES, FILE_FIELDS, MAX_FILE_BYTES, chunkCount, fail, json, newId, newToken, pendingStore, records, sanitizeName, sha256,
  type Dossier, type FileEntry,
} from "../lib/common.mts";

export default async (req: Request) => {
  if (req.method !== "POST") return fail("Méthode non autorisée.", 405);

  const deadline = Netlify.env.get("DEADLINE");
  if (deadline && Date.now() > new Date(deadline).getTime()) return fail("La date limite de candidature est dépassée.", 403);

  let body: { fields?: Record<string, unknown>; files?: Array<Record<string, unknown>> };
  try { body = await req.json(); } catch { return fail("Requête illisible."); }

  const { fields, errors } = validateFields(body.fields || {});

  const files: FileEntry[] = [];
  const counts: Record<string, number> = {};
  for (const raw of Array.isArray(body.files) ? body.files : []) {
    const field = String(raw.field), index = Number(raw.index), size = Number(raw.size), name = sanitizeName(String(raw.name));
    const rule = FILE_FIELDS[field];
    const ext = (name.split(".").pop() || "").toLowerCase();
    if (!rule) { errors.push(`${field}: champ de fichier inconnu`); continue; }
    if (!Number.isInteger(index) || index < 0 || index >= rule.max) { errors.push(`${field}: rang de fichier invalide`); continue; }
    if (!Number.isInteger(size) || size <= 0 || size > MAX_FILE_BYTES) { errors.push(`${field}: « ${name} » dépasse 10 Mo ou est vide`); continue; }
    if (!rule.ext.includes(ext)) { errors.push(`${field}: format de « ${name} » non accepté`); continue; }
    if (files.some((f) => f.field === field && f.index === index)) { errors.push(`${field}: fichier en double`); continue; }
    counts[field] = (counts[field] || 0) + 1;
    files.push({ field, index, name, size, ext, chunks: chunkCount(size) });
  }
  for (const [field, rule] of Object.entries(FILE_FIELDS)) {
    const n = counts[field] || 0;
    if (n < rule.min) errors.push(`${field}: fichier obligatoire`);
    if (n > rule.max) errors.push(`${field}: trop de fichiers`);
  }

  if (errors.length) return json({ error: "Dossier incomplet ou invalide.", details: errors }, 422);

  const id = newId(), token = newToken();
  const dossier: Dossier = {
    id, status: "en_cours", createdAt: new Date().toISOString(),
    uploadTokenHash: sha256(token).toString("hex"), fields, files,
  };
  await records().setJSON(id, dossier, { onlyIfNew: true });
  await pendingStore().set(id, dossier.createdAt);
  return json({ id, token, chunkSize: CHUNK_BYTES }, 201);
};

export const config: Config = {
  path: "/api/dossiers",
  method: "POST",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
