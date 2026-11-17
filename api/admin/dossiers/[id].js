/*
 * GET    /api/admin/dossiers/:id : un dossier complet ;
 * DELETE /api/admin/dossiers/:id : supprime le dossier et toutes ses pièces jointes (définitif).
 * Réservé à l'administration (mot de passe ADMIN_PASSWORD).
 */
import { ID_RE, checkAdmin, deletePaths, fail, json, listAll, pendingPath, readJSON, recordPath, segments } from "../../../lib/common.js";

const strip = ({ uploadTokenHash, ...rest }) => rest;

export default {
  async fetch(req) {
    const denied = checkAdmin(req); if (denied) return denied;
    const id = segments(req)[3];
    if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 400);
    const d = await readJSON(recordPath(id));
    if (!d) return fail("Dossier introuvable (supprimé ou inexistant).", 410);

    if (req.method === "DELETE") {
      const chunks = (await listAll(`fichiers/${id}/`)).map((b) => b.pathname);
      await deletePaths([...chunks, pendingPath(id), recordPath(id)]);
      console.log(`Dossier supprimé par l'administration : ${id} (${chunks.length} morceaux de fichiers)`);
      return json({ deleted: id, chunks: chunks.length });
    }
    if (req.method !== "GET") return fail("Méthode non autorisée.", 405);
    return json(strip(d));
  },
};
