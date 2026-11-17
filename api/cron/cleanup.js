/*
 * Tâche planifiée (vercel.json), chaque jour à 03 h 17 UTC, soit 04 h 17 à Yaoundé (UTC+1) :
 * supprime les dossiers dont l'envoi est resté inachevé plus de 48 heures, avec leurs morceaux de fichiers.
 * Vercel appelle cette adresse avec l'en-tête Authorization: Bearer $CRON_SECRET.
 */
import { deletePaths, fail, json, listAll, recordPath, safeEqual } from "../../lib/common.js";

export default {
  async fetch(req) {
    const secret = process.env.CRON_SECRET;
    const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!secret || !given || !safeEqual(given, secret)) return fail("Accès refusé.", 401);

    const limit = Date.now() - 48 * 3600 * 1000;
    const pending = await listAll("en-cours/");
    let removed = 0;
    for (const p of pending) {
      if (new Date(p.uploadedAt).getTime() > limit) continue;
      const id = p.pathname.slice("en-cours/".length);
      const chunks = (await listAll(`fichiers/${id}/`)).map((b) => b.pathname);
      await deletePaths([...chunks, recordPath(id), p.pathname]);
      removed++;
    }
    console.log(`Dossiers inachevés supprimés : ${removed}`);
    return json({ removed });
  },
};
