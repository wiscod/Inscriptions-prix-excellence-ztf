/*
 * POST /api/dossiers/:id/finalize : vérifie que tous les morceaux de fichiers sont arrivés,
 * passe le dossier à l'état « soumis » et envoie l'accusé de réception au candidat.
 */
import type { Config, Context } from "@netlify/functions";
import { ID_RE, fail, fileStore, json, pendingStore, records, sha256, type Dossier } from "../lib/common.mts";
import { sendConfirmation } from "../lib/email.mts";

export default async (req: Request, context: Context) => {
  const { id } = context.params;
  if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 404);
  const store = records();
  const dossier = (await store.get(id, { type: "json" })) as Dossier | null;
  if (!dossier) return fail("Dossier introuvable.", 404);
  if (dossier.status === "soumis") return json({ id });
  const token = req.headers.get("x-upload-token") || "";
  if (sha256(token).toString("hex") !== dossier.uploadTokenHash) return fail("Jeton d'envoi invalide.", 403);

  const { blobs } = await fileStore().list({ prefix: `${id}/` });
  const have = new Set(blobs.map((b) => b.key));
  const missing = dossier.files.flatMap((f) =>
    Array.from({ length: f.chunks }, (_, c) => `${id}/${f.field}/${f.index}/${c}`).filter((k) => !have.has(k)));
  if (missing.length) return json({ error: "Des fichiers ne sont pas arrivés en entier.", missing }, 409);

  dossier.status = "soumis";
  dossier.submittedAt = new Date().toISOString();
  delete dossier.uploadTokenHash;
  dossier.email = await sendConfirmation(dossier);
  await store.setJSON(id, dossier);
  await pendingStore().delete(id);
  return json({ id });
};

export const config: Config = {
  path: "/api/dossiers/:id/finalize",
  method: "POST",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
