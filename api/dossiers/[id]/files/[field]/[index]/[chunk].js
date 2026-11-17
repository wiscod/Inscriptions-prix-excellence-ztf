/*
 * PUT /api/dossiers/:id/files/:field/:index/:chunk : reçoit un morceau de fichier (3 Mo au plus).
 * En-tête X-Upload-Token : le jeton reçu à la création du dossier.
 */
import { CHUNK_BYTES, ID_RE, chunkPath, fail, json, readJSON, recordPath, segments, tokenHash, writeBytes } from "../../../../../../lib/common.js";

export default {
  async fetch(req) {
    if (req.method !== "PUT") return fail("Méthode non autorisée.", 405);
    const s = segments(req); // api dossiers :id files :field :index :chunk
    const id = s[2], field = s[4], index = Number(s[5]), chunk = Number(s[6]);
    if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 400);

    const dossier = await readJSON(recordPath(id));
    if (!dossier) return fail("Dossier introuvable.", 410);
    if (dossier.status !== "en_cours" || !dossier.uploadTokenHash) return fail("Ce dossier est déjà envoyé.", 409);
    if (tokenHash(req.headers.get("x-upload-token") || "") !== dossier.uploadTokenHash) return fail("Jeton d'envoi invalide.", 403);

    const entry = dossier.files.find((f) => f.field === field && f.index === index);
    if (!entry || !Number.isInteger(chunk) || chunk < 0 || chunk >= entry.chunks) return fail("Morceau de fichier inattendu.", 400);

    const data = await req.arrayBuffer();
    const expected = chunk < entry.chunks - 1 ? CHUNK_BYTES : entry.size - CHUNK_BYTES * (entry.chunks - 1);
    if (data.byteLength !== expected) return fail(`Taille du morceau incorrecte (${data.byteLength} au lieu de ${expected}).`, 400);

    await writeBytes(chunkPath(id, field, index, chunk), Buffer.from(data));
    return json({ ok: true });
  },
};
