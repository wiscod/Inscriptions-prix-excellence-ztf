/*
 * GET /api/admin/files/:id/:field/:index : renvoie une pièce jointe reconstituée à partir de ses morceaux.
 * Réservé à l'administration (mot de passe ADMIN_PASSWORD).
 */
import { ID_RE, MIME, checkAdmin, chunkPath, fail, readJSON, readStream, recordPath, segments } from "../../../../../lib/common.js";

export default {
  async fetch(req) {
    const denied = checkAdmin(req); if (denied) return denied;
    if (req.method !== "GET") return fail("Méthode non autorisée.", 405);
    const s = segments(req); // api admin files :id :field :index
    const id = s[3], field = s[4], index = Number(s[5]);
    if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 400);

    const d = await readJSON(recordPath(id));
    const entry = d && d.files.find((f) => f.field === field && f.index === index);
    if (!entry) return fail("Fichier introuvable.", 410);

    let c = 0, reader = null;
    const body = new ReadableStream({
      async pull(ctrl) {
        for (;;) {
          if (!reader) {
            if (c >= entry.chunks) { ctrl.close(); return; }
            const stream = await readStream(chunkPath(id, field, index, c++));
            if (!stream) { ctrl.error(new Error("Morceau manquant")); return; }
            reader = stream.getReader();
          }
          const { value, done } = await reader.read();
          if (done) { reader = null; continue; }
          ctrl.enqueue(value); return;
        }
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
  },
};
