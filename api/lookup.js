/*
 * POST /api/lookup : « Déjà inscrit ? » — retrouve un dossier envoyé à partir de l'identifiant
 * remis au candidat, pour qu'il retélécharge sa fiche. Corps : { code }.
 * Renvoie la fiche (sans les fichiers eux-mêmes), ou 404 si l'identifiant est inconnu.
 */
import { codeHash, fail, json, lookupPath, normalizeCode, publicRecord, readJSON, recordPath } from "../lib/common.js";

export default {
  async fetch(req) {
    if (req.method !== "POST") return fail("Méthode non autorisée.", 405);
    let body;
    try { body = await req.json(); } catch { return fail("Requête illisible."); }
    if (normalizeCode(body.code).length !== 10) return fail("Identifiant introuvable.", 404);

    const link = await readJSON(lookupPath(codeHash(body.code)));
    const d = link && (await readJSON(recordPath(link.id)));
    if (!d || d.status !== "soumis") return fail("Identifiant introuvable.", 404);
    return json(publicRecord(d));
  },
};
