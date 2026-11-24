/*
 * POST /api/dossiers/:id/finalize : vérifie que tous les fichiers sont arrivés (en entier et à la taille annoncée),
 * passe le dossier à l'état « soumis », crée l'identifiant remis au candidat (« Déjà inscrit ? »)
 * et envoie l'accusé de réception si le candidat a donné un e-mail.
 */
import { sendConfirmation } from "../../../lib/email.js";
import {
  ID_RE, MAX_FILE_BYTES, chunkPath, codeHash, filePath, deletePaths, fail, json, listAll, lookupPath, newCode, pendingPath, readJSON, recordPath,
  openCode, sealCode, segments, tokenHash, writeJSON,
} from "../../../lib/common.js";

export default {
  async fetch(req) {
    if (req.method !== "POST") return fail("Méthode non autorisée.", 405);
    const id = segments(req)[2];
    if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 400);
    const dossier = await readJSON(recordPath(id));
    if (!dossier) return fail("Dossier introuvable.", 410);
    const token = req.headers.get("x-upload-token") || "";
    if (dossier.status === "soumis") {
      // Nouvelle demande après une réponse perdue : même jeton → même identifiant.
      const code = dossier.finalTokenHash && dossier.codeSealed && tokenHash(token) === dossier.finalTokenHash ? openCode(dossier.codeSealed, token) : null;
      return code ? json({ id, code }) : fail("Ce dossier est déjà envoyé.", 409);
    }
    if (tokenHash(token) !== dossier.uploadTokenHash) return fail("Jeton d'envoi invalide.", 403);

    const stored = await listAll(`fichiers/${id}/`);
    const have = new Map(stored.map((b) => [b.pathname, b.size]));
    const missing = dossier.files.flatMap((f) => f.direct
      ? (have.get(filePath(id, f.field, f.index)) === f.size && f.size <= MAX_FILE_BYTES ? [] : [filePath(id, f.field, f.index)])
      : Array.from({ length: f.chunks }, (_, c) => chunkPath(id, f.field, f.index, c)).filter((p) => !have.has(p)));
    if (missing.length) return json({ error: "Des fichiers ne sont pas arrivés en entier.", missing }, 409);

    const code = newCode();
    dossier.lookupHash = codeHash(code);
    dossier.codeSealed = sealCode(code, token);
    await writeJSON(lookupPath(dossier.lookupHash), { id });

    dossier.status = "soumis";
    dossier.submittedAt = new Date().toISOString();
    dossier.finalTokenHash = dossier.uploadTokenHash; // ne sert plus qu'à rejouer cette réponse
    delete dossier.uploadTokenHash;
    dossier.email = await sendConfirmation(dossier, code);
    await writeJSON(recordPath(id), dossier);
    await deletePaths([pendingPath(id)]);
    return json({ id, code });
  },
};
