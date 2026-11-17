/*
 * Administration (mot de passe ADMIN_PASSWORD) :
 *   GET    /api/admin/dossiers?offset=0&limit=100  liste paginée, du plus récent au plus ancien ;
 *   GET    /api/admin/dossiers/:id                 un dossier complet ;
 *   DELETE /api/admin/dossiers/:id                 supprime le dossier et toutes ses pièces jointes (définitif).
 */
import type { Config, Context } from "@netlify/functions";
import { ID_RE, checkAdmin, fail, fileStore, json, pendingStore, records, type Dossier } from "../lib/common.mts";

const strip = (d: Dossier) => { const { uploadTokenHash, ...rest } = d; return rest; };

export default async (req: Request, context: Context) => {
  const denied = checkAdmin(req); if (denied) return denied;
  const store = records();
  const { id } = context.params;

  if (id) {
    if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 400);
    const d = (await store.get(id, { type: "json" })) as Dossier | null;
    // 410 plutôt que 404 : un 404 de fonction fait chercher d'autres adresses au serveur local de Netlify.
    if (!d) return fail("Dossier introuvable (supprimé ou inexistant).", 410);
    if (req.method === "DELETE") {
      const files = fileStore();
      const { blobs } = await files.list({ prefix: `${id}/` });
      for (const b of blobs) await files.delete(b.key);
      await pendingStore().delete(id);
      await store.delete(id);
      console.log(`Dossier supprimé par l'administration : ${id} (${blobs.length} morceaux de fichiers)`);
      return json({ deleted: id, chunks: blobs.length });
    }
    return json(strip(d));
  }

  const url = new URL(req.url);
  if (req.method !== "GET" || url.pathname.replace(/\/$/, "") !== "/api/admin/dossiers") return fail("Requête non reconnue.", 400);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const { blobs } = await store.list();
  const keys = blobs.map((b) => b.key).sort().reverse(); // les numéros commencent par l'horodatage
  const page = keys.slice(offset, offset + limit);
  const items = (await Promise.all(page.map((k) => store.get(k, { type: "json" }) as Promise<Dossier | null>)))
    .filter((d): d is Dossier => !!d).map(strip);
  return json({ total: keys.length, offset, limit, items });
};

export const config: Config = { path: ["/api/admin/dossiers", "/api/admin/dossiers/:id"], method: ["GET", "DELETE"] };
