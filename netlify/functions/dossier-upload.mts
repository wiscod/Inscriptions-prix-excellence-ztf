/*
 * PUT /api/dossiers/:id/files/:field/:index/:chunk : reçoit un morceau de fichier (3 Mo au plus).
 * En-tête X-Upload-Token : le jeton reçu à la création du dossier.
 */
import type { Config, Context } from "@netlify/functions";
import { CHUNK_BYTES, ID_RE, fail, fileStore, json, records, sha256, type Dossier } from "../lib/common.mts";

export default async (req: Request, context: Context) => {
  const { id, field } = context.params;
  const index = Number(context.params.index), chunk = Number(context.params.chunk);
  if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 404);

  const dossier = (await records().get(id, { type: "json" })) as Dossier | null;
  if (!dossier) return fail("Dossier introuvable.", 404);
  if (dossier.status !== "en_cours" || !dossier.uploadTokenHash) return fail("Ce dossier est déjà envoyé.", 409);
  const token = req.headers.get("x-upload-token") || "";
  if (sha256(token).toString("hex") !== dossier.uploadTokenHash) return fail("Jeton d'envoi invalide.", 403);

  const entry = dossier.files.find((f) => f.field === field && f.index === index);
  if (!entry || !Number.isInteger(chunk) || chunk < 0 || chunk >= entry.chunks) return fail("Morceau de fichier inattendu.", 400);

  const data = await req.arrayBuffer();
  const expected = chunk < entry.chunks - 1 ? CHUNK_BYTES : entry.size - CHUNK_BYTES * (entry.chunks - 1);
  if (data.byteLength !== expected) return fail(`Taille du morceau incorrecte (${data.byteLength} au lieu de ${expected}).`, 400);

  await fileStore().set(`${id}/${field}/${index}/${chunk}`, data);
  return json({ ok: true });
};

export const config: Config = {
  path: "/api/dossiers/:id/files/:field/:index/:chunk",
  method: "PUT",
  rateLimit: { windowLimit: 200, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
