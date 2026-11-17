/*
 * Envoi réel du dossier (chargé avant shared/form-engine.js).
 * 1. POST /api/dossiers : la fiche et la liste des fichiers → numéro de dossier + jeton ;
 * 2. PUT  /api/dossiers/:id/files/... : chaque fichier en morceaux de 3 Mo (limite des fonctions Netlify) ;
 * 3. POST /api/dossiers/:id/finalize : le serveur vérifie que tout est arrivé et envoie l'accusé de réception.
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
    await send("/api/dossiers/" + id + "/finalize", { method: "POST", headers: { "x-upload-token": token } });
    onProgress(100);
    return { id: id };
  };
})();
