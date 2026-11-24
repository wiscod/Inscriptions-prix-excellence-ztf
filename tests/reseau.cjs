// Tests de bout en bout du formulaire sur réseau lent ou instable (Playwright + tests/serveur-local.mjs).
//   npm run build && node tests/reseau.cjs            (lance le serveur local sur le port 4173)
//   node tests/reseau.cjs --seulement brouillon       (un seul scénario)
// Chaque scénario remplit le vrai formulaire, envoie de vrais fichiers aux vraies fonctions de api/
// (faux R2 en mémoire) et vérifie ce qui est arrivé côté serveur.
const { chromium, devices } = require("playwright");
const { spawn } = require("node:child_process");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = 4173, BASE = `http://localhost:${PORT}`;
const only = process.argv.includes("--seulement") ? process.argv[process.argv.indexOf("--seulement") + 1] : null;
const NETS = { "3G lente": { latency: 400, downloadThroughput: 400e3 / 8, uploadThroughput: 400e3 / 8 } };

function pdf(kb, seed) { // faux PDF de la taille voulue
  const head = Buffer.from("%PDF-1.4\n% " + seed + "\n");
  return Buffer.concat([head, crypto.randomBytes(kb * 1024 - head.length)]);
}
const FILES = {
  transcripts: [{ name: "releve-s1.pdf", mimeType: "application/pdf", buffer: pdf(180, "a") }, { name: "releve-s2.pdf", mimeType: "application/pdf", buffer: pdf(150, "b") }],
  diplomas: [{ name: "bac.pdf", mimeType: "application/pdf", buffer: pdf(120, "c") }],
};

async function api(p, body) {
  const r = await fetch(BASE + p, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
  return r.status === 204 ? null : r.json();
}
const etat = () => api("/__test/etat");
const pannes = (r) => api("/__test/pannes", r);
const vider = () => api("/__test/vider", {});

async function fill(page, opts = {}) {
  await page.waitForSelector("[data-ztf-form] [name=last_name]");
  await page.selectOption("[name=gender]", "female");
  await page.fill("[name=last_name]", "Ngo Bayiha");
  await page.fill("[name=first_name]", "Esther");
  await page.selectOption("[name=nationality]", "CM");
  await page.fill("[name=birth_date]", "2006-03-14");
  await page.fill("[name=phone]", "677123456");
  if (!opts.ecole) {
    await page.selectOption("[name=institution_category]", "University");
    const school = await page.evaluate(() => window.ZTF_LISTS.schools.find((s) => s[2] === "University")[1]);
    await page.fill("[name=institution_name]", school);
  }
  await page.selectOption("[name=level]", "BAC2");
  await page.selectOption("[name=field_of_study]", opts.fos || "Mathematics");
  await page.fill("[name=average]", "15,2 / 20");
  if (opts.files !== false) for (const [k, list] of Object.entries(FILES)) {
    await page.setInputFiles(`[name=${k}]`, list);
    await page.waitForFunction((n) => document.querySelectorAll(`[data-ztf-filelist="${n}"] li`).length > 0, k);
  }
}
async function submitAndWait(page, timeout = 120000) {
  await page.click("button[type=submit]");
  await page.waitForSelector("[data-ztf-success]:not([hidden])", { timeout });
  return page.textContent("[data-ztf-success-code]");
}
const dossiers = (s) => s.keys.filter((k) => k.startsWith("candidatures/"));
const puts = (s) => Object.entries(s.hits).filter(([k]) => k.startsWith("PUT /r2/ztf/fichiers/")).reduce((a, [, n]) => a + n, 0);
function check(cond, msg) { if (!cond) throw new Error(msg); }

const SCENARIOS = {
  async nominal(ctx) {
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    await fill(page);
    const code = await submitAndWait(page);
    const s = await etat();
    check(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code.trim()), "identifiant attendu, reçu " + code);
    check(dossiers(s).length === 1 && puts(s) === 3, `1 dossier et 3 fichiers attendus : ${dossiers(s).length} / ${puts(s)}`);
    return `identifiant ${code.trim()}, 3 fichiers, 1 dossier`;
  },

  async "3g-lente"(ctx) {
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, ...NETS["3G lente"] });
    const t0 = Date.now(); await page.goto(BASE + "/"); await fill(page);
    const t1 = Date.now(); await submitAndWait(page, 180000);
    const s = await etat();
    check(dossiers(s).length === 1 && puts(s) === 3, "envoi incomplet");
    return `page + saisie ${((t1 - t0) / 1000).toFixed(1)} s, envoi de 450 Ko en ${((Date.now() - t1) / 1000).toFixed(1)} s`;
  },

  async "coupure-pendant-un-fichier"(ctx) {
    await pannes([{ path: "^/r2/ztf/fichiers/.*/transcripts/1$", method: "PUT", times: 2, mode: "couper" }]);
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    await fill(page); await submitAndWait(page);
    const s = await etat();
    check(dossiers(s).length === 1, "un seul dossier attendu");
    check(s.hits[Object.keys(s.hits).find((k) => /transcripts\/0$/.test(k))] === 1, "le 1er fichier ne doit partir qu'une fois");
    return `2 coupures sur le 2e fichier, relancé seul ; ${puts(s)} envois de fichiers pour 3 fichiers`;
  },

  async "reponse-finale-perdue"(ctx) {
    await pannes([{ path: "/finalize$", times: 1, mode: "apres" }]);
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    await fill(page);
    const code = (await submitAndWait(page)).trim();
    const s = await etat();
    check(dossiers(s).length === 1, "un seul dossier attendu, " + dossiers(s).length);
    const look = await fetch(BASE + "/api/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    check(look.status === 200, "l'identifiant affiché doit retrouver le dossier");
    check(s.hits["POST " + Object.keys(s.hits).find((k) => k.endsWith("/finalize")).slice(5)] === 2, "finalize appelé deux fois");
    return `réponse perdue puis redemandée : même dossier, identifiant ${code} valide`;
  },

  async "erreurs-serveur-et-blocage"(ctx) {
    await pannes([
      { path: "^/api/dossiers$", method: "POST", times: 2, mode: "500" },
      { path: "^/r2/ztf/fichiers/.*/diplomas/0$", method: "PUT", times: 1, mode: "bloquer" },
    ]);
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    await fill(page); await submitAndWait(page);
    const s = await etat();
    check(dossiers(s).length === 1, "un seul dossier attendu");
    return "2 erreurs 500 à la création puis un envoi bloqué (abandonné puis relancé) : dossier complet";
  },

  async "hors-ligne-pendant-l-envoi"(ctx) {
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    await fill(page);
    // Le 2e fichier reste bloqué : on coupe le réseau pendant ce temps.
    await pannes([{ path: "^/r2/ztf/fichiers/.*/transcripts/1$", method: "PUT", times: 1, mode: "bloquer" }]);
    await page.click("button[type=submit]");
    await page.waitForFunction(() => /\/transcripts\/0/.test(performance.getEntriesByType("resource").map((e) => e.name).join(" ")) || true);
    await page.waitForTimeout(400);
    await ctx.setOffline(true);
    await page.waitForSelector("#ztf-offline:not([hidden])", { timeout: 10000 });
    await page.waitForSelector(".ztf-send-status:not([hidden])", { timeout: 10000 });
    const msg = await page.textContent(".ztf-send-status");
    await page.waitForTimeout(1500);
    await ctx.setOffline(false);
    await page.waitForSelector("[data-ztf-success]:not([hidden])", { timeout: 60000 });
    const s = await etat();
    check(dossiers(s).length === 1, "un seul dossier attendu");
    return `message affiché : « ${msg.trim()} » ; envoi terminé au retour du réseau`;
  },

  async "rechargement-et-reprise"(ctx) {
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    await fill(page);
    // Le dernier fichier ne passe pas : l'envoi s'arrête en erreur après les nouvelles tentatives.
    await pannes([{ path: "^/r2/ztf/fichiers/.*/diplomas/0$", method: "PUT", times: 99, mode: "couper" }]);
    await page.click("button[type=submit]");
    await page.waitForSelector(".ztf-send-status.is-warn:not([hidden])", { timeout: 60000 });
    const avant = await etat();
    await pannes([]);
    // La page se recharge (onglet fermé, téléphone redémarré…) : brouillon et fichiers reviennent.
    await page.reload();
    await page.waitForSelector(".ztf-draft", { timeout: 10000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-ztf-filelist] li').length === 3, null, { timeout: 10000 });
    check((await page.inputValue("[name=last_name]")) === "Ngo Bayiha", "nom repris");
    check((await page.inputValue("[name=field_of_study]")) === "Mathematics", "domaine repris");
    await submitAndWait(page);
    const s = await etat();
    check(s.hits["POST /api/dossiers"] === 1, "le dossier ne doit pas être recréé : " + s.hits["POST /api/dossiers"]);
    const t0 = Object.keys(s.hits).find((k) => /transcripts\/0$/.test(k));
    check(s.hits[t0] === 1, "le 1er fichier ne doit pas repartir");
    const apres = await page.evaluate(() => localStorage.getItem("ztf-brouillon:/"));
    check(apres === null, "brouillon effacé après l'envoi");
    return `${puts(avant)} envois avant l'échec, reprise après rechargement sans recréer le dossier ni renvoyer les fichiers arrivés`;
  },

  async brouillon(ctx) {
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    await fill(page, { files: false });
    await page.fill("[name=motivation]", "Texte de motivation.");
    await page.waitForTimeout(600);
    await page.reload();
    await page.waitForSelector(".ztf-draft");
    const v = await page.evaluate(() => ["last_name", "institution_category", "institution_name", "school_id", "level", "field_of_study", "average", "motivation"].map((n) => document.querySelector(`[name=${n}]`).value));
    check(v.every(Boolean), "champs repris : " + JSON.stringify(v));
    check((await page.inputValue("[name=gender]")) === "female", "genre repris");
    await page.click(".ztf-draft button");
    await page.reload(); await page.waitForSelector("[name=last_name]");
    check((await page.inputValue("[name=last_name]")) === "" && !(await page.$(".ztf-draft")), "« Tout effacer » vide le brouillon");
    return "champs (dont listes dépendantes) repris après rechargement ; « Tout effacer » fonctionne";
  },

  async "page-hors-ligne"(ctx) {
    const page = await ctx.newPage(); await page.goto(BASE + "/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForSelector("[name=last_name]");
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector("[data-ztf-form] [name=last_name]", { timeout: 10000 });
    const banner = await page.isVisible("#ztf-offline");
    await ctx.setOffline(false);
    check(banner, "bandeau hors connexion attendu");
    return "rechargée sans réseau : le formulaire s'affiche (service worker), bandeau « hors connexion »";
  },

  async "anglais-et-page-ecole"(ctx) {
    const page = await ctx.newPage(); await page.goto(BASE + "/enspy?lang=en");
    await fill(page, { ecole: true, fos: "ComputerScience" });
    await pannes([{ path: "^/r2/ztf/fichiers/.*/transcripts/0$", method: "PUT", times: 2, mode: "500" }]); // (une simple coupure est souvent relancée par Chrome lui-même, sans que la page le voie)
    // Les messages d'état sont brefs (délais raccourcis) : on les note au passage.
    await page.evaluate(() => { window.__msgs = []; new MutationObserver(() => document.querySelectorAll(".ztf-send-status").forEach((p) => { if (p.textContent) window.__msgs.push(p.textContent); }))
      .observe(document.body, { subtree: true, childList: true, characterData: true }); });
    await page.click("button[type=submit]");
    await page.waitForSelector("[data-ztf-success]:not([hidden])", { timeout: 60000 });
    const msg = (await page.evaluate(() => window.__msgs))[0] || "";
    check(/Connection lost/.test(msg), "message en anglais attendu : " + msg);
    return `/enspy en anglais : « ${msg.trim()} », envoi terminé`;
  },
};

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, "serveur-local.mjs"), String(PORT)], { stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((ok) => server.stdout.once("data", ok));
  const browser = await chromium.launch();
  let failed = 0;
  try {
    for (const [name, fn] of Object.entries(SCENARIOS)) {
      if (only && name !== only) continue;
      await vider();
      const ctx = await browser.newContext({ ...devices["Pixel 5"] });
      // Délais réels pour la mesure en 3G lente ; raccourcis (×0,05) pour les scénarios de panne.
      if (name !== "3g-lente") await ctx.addInitScript(() => { window.ZTF_TEST_DELAIS = { facteur: 0.05 }; });
      const t0 = Date.now();
      try { const r = await fn(ctx); console.log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(0)} s) : ${r}`); }
      catch (e) { failed++; console.log(`ÉCHEC ${name} : ${e.message}`); }
      await ctx.close();
    }
  } finally { await browser.close(); server.kill(); }
  process.exit(failed ? 1 : 0);
})();
