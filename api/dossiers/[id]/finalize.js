/*
 * POST /api/dossiers/:id/finalize : vérifie que tous les morceaux de fichiers sont arrivés,
 * passe le dossier à l'état « soumis » et envoie l'accusé de réception au candidat.
 */
import { sendConfirmation } from "../../../lib/email.js";
import {
  ID_RE, chunkPath, deletePaths, fail, json, listAll, pendingPath, readJSON, recordPath, segments, tokenHash, writeJSON,
} from "../../../lib/common.js";

export default {
  async fetch(req) {
    if (req.method !== "POST") return fail("Méthode non autorisée.", 405);
    const id = segments(req)[2];
    if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 400);
    const dossier = await readJSON(recordPath(id));
    if (!dossier) return fail("Dossier introuvable.", 410);
    if (dossier.status === "soumis") return json({ id });
    if (tokenHash(req.headers.get("x-upload-token") || "") !== dossier.uploadTokenHash) return fail("Jeton d'envoi invalide.", 403);

    const have = new Set((await listAll(`fichiers/${id}/`)).map((b) => b.pathname));
    const missing = dossier.files.flatMap((f) =>
      Array.from({ length: f.chunks }, (_, c) => chunkPath(id, f.field, f.index, c)).filter((p) => !have.has(p)));
    if (missing.length) return json({ error: "Des fichiers ne sont pas arrivés en entier.", missing }, 409);

    dossier.status = "soumis";
    dossier.submittedAt = new Date().toISOString();
    delete dossier.uploadTokenHash;
    dossier.email = await sendConfirmation(dossier);
    await writeJSON(recordPath(id), dossier);
    await deletePaths([pendingPath(id)]);
    return json({ id });
  },
};
