/*
 * Tâche planifiée, chaque jour à 03 h 17 UTC (04 h 17 à Yaoundé, UTC+1) :
 * supprime les dossiers dont l'envoi est resté inachevé plus de 48 heures, avec leurs morceaux de fichiers.
 */
import type { Config } from "@netlify/functions";
import { fileStore, pendingStore, records } from "../lib/common.mts";

export default async () => {
  const pending = pendingStore(), files = fileStore(), store = records();
  const limit = Date.now() - 48 * 3600 * 1000;
  const { blobs } = await pending.list();
  let removed = 0;
  for (const { key } of blobs) {
    const createdAt = await pending.get(key);
    if (createdAt && new Date(createdAt).getTime() > limit) continue;
    const parts = await files.list({ prefix: `${key}/` });
    for (const p of parts.blobs) await files.delete(p.key);
    await store.delete(key);
    await pending.delete(key);
    removed++;
  }
  console.log(`Dossiers inachevés supprimés : ${removed}`);
};

export const config: Config = { schedule: "17 3 * * *" };
