/*
 * Envoi réel du dossier (chargé avant shared/form-engine.js).
 * 1. POST /api/dossiers : la fiche et la liste des fichiers → numéro de dossier + jeton ;
 * 2. chaque fichier part directement vers le stockage Cloudflare R2, à l'adresse signée reçue en 1 ;
 *    sans R2 : PUT /api/dossiers/:id/files/... en morceaux de 3 Mo (limite des fonctions Vercel : 4,5 Mo par requête) ;
 * 3. POST /api/dossiers/:id/finalize : le serveur vérifie que tout est arrivé et renvoie l'identifiant du candidat.
 * « Déjà inscrit ? » : POST /api/lookup avec l'identifiant renvoie la fiche, pour la retélécharger.
 *
 * Connexions instables : chaque requête a un délai d'attente et est réessayée (pause croissante, attente du retour
 * du réseau si le téléphone est hors ligne). Un envoi interrompu est gardé (dans la page et sur l'appareil) :
 * en appuyant de nouveau sur « Envoyer », même après un rechargement, seuls les fichiers qui ne sont pas encore
 * arrivés repartent, tant que la fiche et les fichiers n'ont pas changé.
 */
(function () {
  "use strict";
  window.ZTF_DEMO = false;

  var RESUME_KEY = "ztf-envoi:" + location.pathname;
  var RESUME_MAX_MS = 100 * 60 * 1000;      // les adresses d'envoi signées valent 2 heures
  var JSON_TIMEOUT_MS = 60 * 1000;          // délai d'attente d'une requête courte
  var STALL_MS = 45 * 1000;                 // envoi de fichier sans aucun progrès pendant 45 s : on relance
  var RETRIES = 6;                          // nouvelles tentatives, en plus de la première
  var OFFLINE_WAIT_MS = 5 * 60 * 1000;      // attente maximale du retour du réseau avant d'abandonner
  // Tests de bout en bout (tests/reseau.cjs) : délais raccourcis par window.ZTF_TEST_DELAIS = { facteur: 0.01 }.
  var SCALE = (window.ZTF_TEST_DELAIS && window.ZTF_TEST_DELAIS.facteur) || 1;
  JSON_TIMEOUT_MS *= SCALE; STALL_MS *= SCALE; OFFLINE_WAIT_MS *= SCALE;

  function t(key) { return window.ZTF ? window.ZTF.tr(key) : key; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function backoff(attempt) { return [2000, 4000, 8000, 15000, 30000, 30000][Math.min(attempt, 5)] * SCALE; }

  /** Attend le retour du réseau si le navigateur se sait hors ligne (au plus OFFLINE_WAIT_MS). */
  function whenOnline(status) {
    if (navigator.onLine !== false) return Promise.resolve();
    status("offline");
    return new Promise(function (resolve) {
      var done = function () { window.removeEventListener("online", done); clearTimeout(timer); resolve(); };
      var timer = setTimeout(done, OFFLINE_WAIT_MS);
      window.addEventListener("online", done);
    });
  }

  function ServerError(message, status, data) { var e = new Error(message); e.status = status; e.data = data; return e; }
  async function readError(res) {
    var data = {}; try { data = await res.json(); } catch (e) { /* réponse non JSON */ }
    var msg = data.error || (res.status + " " + res.statusText);
    if (data.details && data.details.length) msg += " " + data.details[0];
    if (res.status === 429) msg = t("err.tooMany");
    return ServerError(t("err.server") + " " + msg, res.status, data);
  }
  function networkError() { var e = new Error(t("toast.failed.d")); e.network = true; return e; }

  function fetchWithTimeout(url, opts, ms) {
    if (typeof AbortController !== "function") return fetch(url, opts);
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, ms);
    var o = {}; Object.keys(opts || {}).forEach(function (k) { o[k] = opts[k]; }); o.signal = ctl.signal;
    return fetch(url, o).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }

  /** Requête JSON, réessayée en cas de coupure, de délai dépassé ou d'erreur serveur (5xx). */
  async function send(url, opts, status) {
    for (var attempt = 0; ; attempt++) {
      await whenOnline(status);
      var res;
      try { res = await fetchWithTimeout(url, opts, JSON_TIMEOUT_MS); } catch (e) {
        if (attempt >= RETRIES) throw networkError();
        status("retry"); await wait(backoff(attempt)); continue;
      }
      if (res.status >= 500 && attempt < RETRIES) { status("retry"); await wait(backoff(attempt)); continue; }
      if (!res.ok) throw await readError(res);
      status("");
      return res.json();
    }
  }

  /** Envoi direct d'un fichier vers R2, avec suivi de progression ; relancé s'il n'avance plus. */
  function putOnce(url, file, type, onBytes) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest(), stall;
      var arm = function () { clearTimeout(stall); stall = setTimeout(function () { x.abort(); }, STALL_MS); };
      x.open("PUT", url);
      if (type) x.setRequestHeader("content-type", type);
      x.upload.onprogress = function (e) { arm(); onBytes(e.loaded); };
      x.onload = function () { clearTimeout(stall); x.status >= 200 && x.status < 300 ? resolve() : reject(ServerError(String(x.status), x.status)); };
      x.onerror = x.ontimeout = x.onabort = function () { clearTimeout(stall); reject(networkError()); };
      arm(); x.send(file);
    });
  }
  async function putDirect(url, file, type, onBytes, status) {
    for (var attempt = 0; ; attempt++) {
      await whenOnline(status);
      try { await putOnce(url, file, type, onBytes); status(""); return; } catch (e) {
        onBytes(0);
        // 403 : adresse signée expirée ; inutile d'insister, l'envoi repartira sur un nouveau dossier.
        if (e.status === 403 || attempt >= RETRIES) throw e.status === 403 ? e : networkError();
        status("retry"); await wait(backoff(attempt));
      }
    }
  }

  /* ---------- Envoi en cours, gardé pour une reprise ---------- */
  var current = null; // { sig, id, token, uploads, chunkSize, done: { "champ/rang": true }, at }
  function signature(fields, list) {
    var f = {}; Object.keys(fields).forEach(function (k) { if (k !== "lang") f[k] = fields[k]; }); // changer de langue ne change pas le dossier
    return JSON.stringify([f, list.map(function (m) { return [m.field, m.index, m.name, m.size, m.file.lastModified || 0]; })]);
  }
  function keep() {
    try { if (current) localStorage.setItem(RESUME_KEY, JSON.stringify(current)); else localStorage.removeItem(RESUME_KEY); } catch (e) { /* stockage indisponible */ }
  }
  function restore(sig) {
    if (!current) { try { current = JSON.parse(localStorage.getItem(RESUME_KEY) || "null"); } catch (e) { current = null; } }
    if (current && (current.sig !== sig || Date.now() - current.at > RESUME_MAX_MS)) current = null;
    return current;
  }

  /**
   * fields : la fiche ; files : { champ: [File, …] } ; onProgress(pourcentage, état) où état vaut
   * "" (normal), "retry" (nouvelle tentative après une coupure) ou "offline" (en attente du réseau).
   */
  window.ZTF_SUBMIT = async function (fields, files, onProgress) {
    var list = [];
    Object.keys(files).forEach(function (field) {
      files[field].forEach(function (f, i) { list.push({ field: field, index: i, name: f.name, size: f.size, file: f, key: field + "/" + i }); });
    });
    var total = list.reduce(function (s, m) { return s + m.size; }, 0) || 1, pct = 0, state = "";
    var show = function () { onProgress(pct, state); };
    var status = function (s) { if (s !== state) { state = s; show(); } };
    var progress = function (sent) { pct = Math.min(99, Math.round(sent / total * 100)); show(); };
    var sig = signature(fields, list);

    for (var round = 0; round < 3; round++) {
      if (!restore(sig)) {
        var created = await send("/api/dossiers", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ fields: fields, files: list.map(function (m) { return { field: m.field, index: m.index, name: m.name, size: m.size }; }) })
        }, status);
        current = { sig: sig, id: created.id, token: created.token, uploads: created.uploads || null, chunkSize: created.chunkSize, done: {}, at: Date.now() };
        keep();
      }
      var c = current, sent = list.reduce(function (s, m) { return s + (c.done[m.key] ? m.size : 0); }, 0);
      progress(sent);
      try {
        for (var u = 0; u < list.length; u++) {
          var item = list[u];
          if (c.done[item.key]) continue;
          if (c.uploads) {
            var dest = c.uploads.filter(function (x) { return x.field === item.field && x.index === item.index; })[0];
            await putDirect(dest.url, item.file, dest.contentType, function (b) { progress(sent + b); }, status);
          } else {
            var n = Math.max(1, Math.ceil(item.size / c.chunkSize));
            for (var k = 0; k < n; k++) {
              var part = item.file.slice(k * c.chunkSize, Math.min(item.size, (k + 1) * c.chunkSize));
              await send("/api/dossiers/" + c.id + "/files/" + item.field + "/" + item.index + "/" + k, {
                method: "PUT", headers: { "x-upload-token": c.token, "content-type": "application/octet-stream" }, body: part
              }, status);
              progress(sent + Math.min(item.size, (k + 1) * c.chunkSize));
            }
          }
          sent += item.size; c.done[item.key] = true; keep();
        }
        var done = await send("/api/dossiers/" + c.id + "/finalize", { method: "POST", headers: { "x-upload-token": c.token } }, status);
        current = null; keep();
        onProgress(100, "");
        return { id: c.id, code: done.code };
      } catch (e) {
        // Fichiers signalés manquants par le serveur : on les renvoie, eux seulement.
        if (e.status === 409 && e.data && e.data.missing) {
          e.data.missing.forEach(function (p) { var s = String(p).split("/"); delete c.done[s[2] + "/" + s[3]]; });
          keep(); continue;
        }
        // Dossier effacé par le nettoyage, adresse d'envoi expirée ou jeton refusé : on repart d'un nouveau dossier.
        if (e.status === 410 || e.status === 403) { current = null; keep(); continue; }
        throw e;
      }
    }
    throw new Error(t("toast.failed.d"));
  };

  /** « Déjà inscrit ? » : la fiche correspondant à l'identifiant, ou null s'il est inconnu. */
  window.ZTF_LOOKUP = async function (code) {
    var res;
    try {
      res = await fetchWithTimeout("/api/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code }) }, JSON_TIMEOUT_MS);
    } catch (e) { throw networkError(); }
    if (res.status === 404) return null;
    if (!res.ok) throw await readError(res);
    return res.json();
  };

  /* Cache hors ligne de la page (site/sw.js) : la page s'ouvre même si le réseau coupe au rechargement. */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () { /* sans effet sur le formulaire */ }); });
  }
})();
