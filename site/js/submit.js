/*
 * Envoi réel du dossier (chargé avant shared/form-engine.js).
 * 1. POST /api/dossiers : la fiche et la liste des fichiers → numéro de dossier + jeton ;
 * 2. chaque fichier part directement vers le stockage Cloudflare R2, à l'adresse signée reçue en 1 ;
 *    sans R2 : PUT /api/dossiers/:id/files/... en morceaux de 3 Mo (limite des fonctions Vercel : 4,5 Mo par requête) ;
 * 3. POST /api/dossiers/:id/finalize : le serveur vérifie que tout est arrivé et renvoie l'identifiant du candidat.
 * « Déjà inscrit ? » : POST /api/lookup avec l'identifiant renvoie la fiche, pour la retélécharger.
 */
(function () {
  "use strict";
  window.ZTF_DEMO = false;

  function t(key) { return window.ZTF ? window.ZTF.tr(key) : key; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function readError(res) {
    var data = {}; try { data = await res.json(); } catch (e) { /* réponse non JSON */ }
    var msg = data.error || (res.status + " " + res.statusText);
    if (data.details && data.details.length) msg += " " + data.details[0];
    if (res.status === 429) msg = t("err.tooMany");
    return new Error(t("err.server") + " " + msg);
  }

  /** Requête avec 3 nouvelles tentatives en cas de coupure réseau ou d'erreur serveur (5xx). */
  async function send(url, opts) {
    for (var attempt = 0; ; attempt++) {
      var res;
      try { res = await fetch(url, opts); } catch (e) {
        if (attempt >= 3) throw new Error(t("toast.failed.d"));
        await wait(1000 * Math.pow(2, attempt)); continue;
      }
      if (res.status >= 500 && attempt < 3) { await wait(1000 * Math.pow(2, attempt)); continue; }
      if (!res.ok) throw await readError(res);
      return res.json();
    }
  }

  /** Envoi direct d'un fichier vers R2, avec suivi de progression et 3 nouvelles tentatives. */
  function putOnce(url, file, type, onBytes) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open("PUT", url);
      if (type) x.setRequestHeader("content-type", type);
      x.upload.onprogress = function (e) { onBytes(e.loaded); };
      x.onload = function () { x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(String(x.status))); };
      x.onerror = x.ontimeout = function () { reject(new Error("network")); };
      x.send(file);
    });
  }
  async function putDirect(url, file, type, onBytes) {
    for (var attempt = 0; ; attempt++) {
      try { return await putOnce(url, file, type, onBytes); } catch (e) {
        onBytes(0);
        if (attempt >= 3) throw new Error(t("toast.failed.d"));
        await wait(1000 * Math.pow(2, attempt));
      }
    }
  }

  window.ZTF_SUBMIT = async function (fields, files, onProgress) {
    var list = [];
    Object.keys(files).forEach(function (field) {
      files[field].forEach(function (f, i) { list.push({ field: field, index: i, name: f.name, size: f.size, file: f }); });
    });
    var created = await send("/api/dossiers", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields: fields, files: list.map(function (m) { return { field: m.field, index: m.index, name: m.name, size: m.size }; }) })
    });
    var id = created.id, token = created.token, size = created.chunkSize;
    var total = list.reduce(function (s, m) { return s + m.size; }, 0) || 1, sent = 0;
    onProgress(0);
    if (created.uploads) {
      for (var u = 0; u < list.length; u++) {
        var item = list[u], dest = created.uploads.filter(function (x) { return x.field === item.field && x.index === item.index; })[0];
        await putDirect(dest.url, item.file, dest.contentType, function (b) { onProgress(Math.min(99, Math.round((sent + b) / total * 100))); });
        sent += item.size;
      }
      list = [];
    }
    for (var k = 0; k < list.length; k++) {
      var m = list[k], n = Math.max(1, Math.ceil(m.size / size));
      for (var c = 0; c < n; c++) {
        var part = m.file.slice(c * size, Math.min(m.size, (c + 1) * size));
        await send("/api/dossiers/" + id + "/files/" + m.field + "/" + m.index + "/" + c, {
          method: "PUT", headers: { "x-upload-token": token, "content-type": "application/octet-stream" }, body: part
        });
        sent += part.size;
        onProgress(Math.min(99, Math.round(sent / total * 100)));
      }
    }
    var done = await send("/api/dossiers/" + id + "/finalize", { method: "POST", headers: { "x-upload-token": token } });
    onProgress(100);
    return { id: id, code: done.code };
  };

  /** « Déjà inscrit ? » : la fiche correspondant à l'identifiant, ou null s'il est inconnu. */
  window.ZTF_LOOKUP = async function (code) {
    var res = await fetch("/api/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code }) });
    if (res.status === 404) return null;
    if (!res.ok) throw await readError(res);
    return res.json();
  };
})();
