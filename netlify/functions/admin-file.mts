/*
 * GET /api/admin/files/:id/:field/:index : renvoie une pièce jointe reconstituée à partir de ses morceaux.
 * Réservé à l'administration (mot de passe ADMIN_PASSWORD).
 */
import type { Config, Context } from "@netlify/functions";
import { ID_RE, MIME, checkAdmin, fail, fileStore, records, type Dossier } from "../lib/common.mts";

export default async (req: Request, context: Context) => {
  const denied = checkAdmin(req); if (denied) return denied;
  const { id, field } = context.params;
  const index = Number(context.params.index);
  if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 400);

  const d = (await records().get(id, { type: "json" })) as Dossier | null;
  const entry = d?.files.find((f) => f.field === field && f.index === index);
  if (!d || !entry) return fail("Fichier introuvable.", 410);

  const store = fileStore();
  let c = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      if (c >= entry.chunks) { ctrl.close(); return; }
      const part = await store.get(`${id}/${field}/${index}/${c++}`, { type: "arrayBuffer" });
      if (!part) { ctrl.error(new Error("Morceau manquant")); return; }
      ctrl.enqueue(new Uint8Array(part));
    },
  });
  return new Response(body, {
    headers: {
      "content-type": MIME[entry.ext] || "application/octet-stream",
      "content-length": String(entry.size),
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(entry.name)}`,
      "cache-control": "no-store",
    },
  });
};

export const config: Config = { path: "/api/admin/files/:id/:field/:index", method: "GET" };
