/*
 * GET /api/admin/dossiers?offset=0&limit=100 : liste paginée des dossiers, du plus récent au plus ancien.
 * Réservé à l'administration (mot de passe ADMIN_PASSWORD).
 */
import { checkAdmin, fail, json, listAll, readJSON } from "../../../lib/common.js";

const strip = ({ uploadTokenHash, lookupHash, ...rest }) => rest;

export default {
  async fetch(req) {
    const denied = checkAdmin(req); if (denied) return denied;
    if (req.method !== "GET") return fail("Méthode non autorisée.", 405);
    const url = new URL(req.url);
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    // Les numéros commencent par l'horodatage : l'ordre alphabétique inverse donne les plus récents d'abord.
    const paths = (await listAll("candidatures/")).map((b) => b.pathname).sort().reverse();
    const page = paths.slice(offset, offset + limit);
    const items = (await Promise.all(page.map((p) => readJSON(p)))).filter(Boolean).map(strip);
    return json({ total: paths.length, offset, limit, items });
  },
};
