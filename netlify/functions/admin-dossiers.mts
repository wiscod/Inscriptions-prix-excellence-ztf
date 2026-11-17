/*
 * Administration (mot de passe ADMIN_PASSWORD) :
 *   GET /api/admin/dossiers?offset=0&limit=100  liste paginée, du plus récent au plus ancien ;
 *   GET /api/admin/dossiers/:id                 un dossier complet.
 */
import type { Config, Context } from "@netlify/functions";
import { ID_RE, checkAdmin, fail, json, records, type Dossier } from "../lib/common.mts";

const strip = (d: Dossier) => { const { uploadTokenHash, ...rest } = d; return rest; };

export default async (req: Request, context: Context) => {
  const denied = checkAdmin(req); if (denied) return denied;
  const store = records();
  const { id } = context.params;

  if (id) {
    if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 404);
    const d = (await store.get(id, { type: "json" })) as Dossier | null;
    return d ? json(strip(d)) : fail("Dossier introuvable.", 404);
  }

  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const { blobs } = await store.list();
  const keys = blobs.map((b) => b.key).sort().reverse(); // les numéros commencent par l'horodatage
  const page = keys.slice(offset, offset + limit);
  const items = (await Promise.all(page.map((k) => store.get(k, { type: "json" }) as Promise<Dossier | null>)))
    .filter((d): d is Dossier => !!d).map(strip);
  return json({ total: keys.length, offset, limit, items });
};

export const config: Config = { path: ["/api/admin/dossiers", "/api/admin/dossiers/:id"], method: "GET" };
