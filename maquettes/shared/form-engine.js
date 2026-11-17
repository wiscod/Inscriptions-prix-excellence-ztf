/*
 * Moteur commun aux 5 maquettes du formulaire de candidature — Prix d'Excellence ZTF.
 * Chaque maquette ne fait que la mise en page : les champs, listes, règles de validation
 * et comportements (champs dépendants, cases « Non communiqué », pièces jointes…) sont ici,
 * ce qui garantit des informations demandées strictement identiques d'une maquette à l'autre.
 *
 * Contrat HTML : <form data-ztf-form> contenant des champs avec les attributs `name` ci-dessous,
 * chacun enveloppé dans un conteneur [data-field="<name>"] où s'affichent les erreurs.
 */
(function () {
  "use strict";
  var D = window.ZTF_DATA;

  var LABELS = {
    civility: "Civilité", last_name: "Nom", first_name: "Prénom", nationality: "Nationalité",
    birth_date: "Date de naissance", city: "Ville de résidence", phone: "Téléphone",
    email: "Adresse électronique", institution_category: "Établissement (catégorie)",
    institution_subcategory: "Établissement (sous-catégorie)", institution_name: "Établissement (nom)",
    field_of_study: "Domaine d'études", level: "Niveau", average: "Moyenne",
    ranking: "Classement dans la promotion", cohort_size: "Taille de la promotion",
    idfile: "Pièce d'identité (Passeport ou CNI)", transcripts: "Diplômes et relevés de notes (" + D.schoolYear + ")",
    otherfiles: "Tout document utile complémentaire", additional_notes: "Informations complémentaires"
  };
  var REQUIRED = ["civility", "last_name", "first_name", "nationality", "birth_date", "city", "phone", "email",
    "institution_category", "institution_subcategory", "institution_name", "field_of_study", "level",
    "average", "ranking", "cohort_size", "idfile", "transcripts"];
  var NP = { average: "average_not_provided", ranking: "ranking_not_provided", cohort_size: "cohort_size_not_provided" };

  var form, fileStore = { idfile: [], transcripts: [], otherfiles: [] };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(name) { return form.elements[name]; }
  function opt(value, text, sel) { var o = document.createElement("option"); o.value = value; o.textContent = text == null ? value : text; if (sel) o.selected = true; return o; }
  function fillSelect(s, values, placeholder) {
    if (!s) return;
    s.innerHTML = "";
    var p = opt("", placeholder || "Sélectionnez"); p.disabled = true; p.selected = true; s.appendChild(p);
    values.forEach(function (v) { s.appendChild(typeof v === "string" ? opt(v) : opt(v.value, v.text)); });
  }
  function flag(cc) { return cc.replace(/./g, function (c) { return String.fromCodePoint(127397 + c.charCodeAt(0)); }); }

  /* ---------- Remplissage des listes ---------- */
  function populate() {
    fillSelect(el("civility"), D.civilities, "Sélectionnez");
    fillSelect(el("level"), D.levels, "Sélectionnez");
    fillSelect(el("field_of_study"), D.fieldsOfStudy, "Sélectionnez");
    fillSelect(el("institution_category"), D.institutionCategories.map(function (c) { return c.category; }), "Sélectionnez une catégorie");
    fillSelect(el("institution_subcategory"), [], "Choisissez d'abord une catégorie");
    if (el("institution_subcategory")) el("institution_subcategory").disabled = true;

    var names;
    try { names = new Intl.DisplayNames(["fr"], { type: "region" }); } catch (e) { names = null; }
    var countries = D.countryCodes.map(function (cc) { var n = names ? names.of(cc) : cc; return { value: n, text: flag(cc) + " " + n, cc: cc }; })
      .sort(function (a, b) { return a.value.localeCompare(b.value, "fr"); });
    var cm = countries.filter(function (c) { return c.cc === "CM"; });
    fillSelect(el("nationality"), cm.concat(countries.filter(function (c) { return c.cc !== "CM"; })), "Sélectionnez un pays");

    if (el("phone_code")) { el("phone_code").innerHTML = ""; D.phoneCodes.forEach(function (p, i) { el("phone_code").appendChild(opt(p.code, p.label, i === 0)); }); }

    addDatalist("ztf-cities", D.cities, el("city"));
    addDatalist("ztf-schools", D.schools, el("institution_name"));
    if (el("institution_name")) el("institution_name").disabled = true;

    var bd = el("birth_date");
    if (bd) { var max = new Date(); max.setFullYear(max.getFullYear() - 15); bd.max = max.toISOString().slice(0, 10); bd.min = "1960-01-01"; }

    $$("[data-ztf-deadline]").forEach(function (n) { n.textContent = D.deadline; });
    $$("[data-ztf-year]").forEach(function (n) { n.textContent = D.schoolYear; });
    $$("[data-ztf-contact]").forEach(function (n) { n.textContent = D.contactEmail; if (n.tagName === "A") n.href = "mailto:" + D.contactEmail; });
  }
  function addDatalist(id, values, input) {
    if (!input) return;
    var dl = document.getElementById(id) || document.createElement("datalist");
    dl.id = id; dl.innerHTML = "";
    values.forEach(function (v) { dl.appendChild(opt(v)); });
    document.body.appendChild(dl);
    input.setAttribute("list", id); input.setAttribute("autocomplete", "off");
  }

  /* ---------- Comportements ---------- */
  function onCategory() {
    var cat = el("institution_category").value;
    var found = D.institutionCategories.filter(function (c) { return c.category === cat; })[0];
    var sub = el("institution_subcategory");
    fillSelect(sub, found ? found.sub : [], found ? "Sélectionnez une sous-catégorie" : "Choisissez d'abord une catégorie");
    sub.disabled = !found;
    var n = el("institution_name");
    n.value = ""; n.disabled = !found;
    n.placeholder = found ? "Rechercher un établissement..." : "Choisissez d'abord une catégorie";
    $$("[data-ztf-add-school]").forEach(function (b) { b.disabled = !found; });
  }
  function onLevel() {
    var post = el("level").value === "Post-BAC+5";
    $$("[data-ztf-average-np]").forEach(function (n) { n.hidden = !post; });
    if (!post && el("average_not_provided").checked) { el("average_not_provided").checked = false; onNP("average"); }
  }
  function onNP(field) {
    var cb = el(NP[field]), input = el(field);
    if (cb.checked) { input.value = ""; clearError(field); }
    input.disabled = cb.checked;
    if (field === "average") $$("[data-ztf-avg-star]").forEach(function (s) { s.hidden = cb.checked; });
  }

  /* ---------- Pièces jointes ---------- */
  function syncInput(name) {
    var input = el(name);
    try { var dt = new DataTransfer(); fileStore[name].forEach(function (f) { dt.items.add(f); }); input.files = dt.files; } catch (e) { /* navigateur ancien */ }
  }
  function onFiles(name) {
    var input = el(name), picked = Array.prototype.slice.call(input.files || []);
    if (input.multiple) {
      picked.forEach(function (f) { if (!fileStore[name].some(function (g) { return g.name === f.name && g.size === f.size; })) fileStore[name].push(f); });
    } else { fileStore[name] = picked.slice(0, 1); }
    syncInput(name); renderFiles(name);
  }
  function renderFiles(name) {
    $$('[data-ztf-filelist="' + name + '"]').forEach(function (box) {
      box.innerHTML = "";
      var files = fileStore[name];
      if (!files.length) return;
      if (name === "idfile") {
        var p = document.createElement("p"); p.className = "ztf-file-single";
        p.innerHTML = "Fichier sélectionné : <strong></strong>"; p.querySelector("strong").textContent = files[0].name;
        box.appendChild(p); return;
      }
      var count = document.createElement("p"); count.className = "ztf-file-count"; count.textContent = files.length + " fichier(s) sélectionné(s)"; box.appendChild(count);
      var ul = document.createElement("ul"); ul.className = "ztf-file-list";
      files.forEach(function (f, i) {
        var li = document.createElement("li");
        var span = document.createElement("span"); span.textContent = f.name;
        var b = document.createElement("button"); b.type = "button"; b.textContent = "Retirer";
        b.addEventListener("click", function () { fileStore[name].splice(i, 1); syncInput(name); renderFiles(name); refresh(); });
        li.appendChild(span); li.appendChild(b); ul.appendChild(li);
      });
      box.appendChild(ul);
    });
  }

  /* ---------- Ajout d'établissement ---------- */
  function openAddSchool() {
    var dlg = document.getElementById("ztf-add-school");
    if (!dlg) {
      dlg = document.createElement("dialog"); dlg.id = "ztf-add-school"; dlg.className = "ztf-dialog";
      dlg.innerHTML = '<form method="dialog"><h3>Ajouter un établissement</h3>' +
        '<p>Renseignez le nom de votre établissement. Il sera soumis à vérification par notre équipe.</p>' +
        '<label>Catégorie<input name="cat" disabled></label>' +
        '<label>Nom de l\'établissement *<input name="school" placeholder="Ex: Université de Yaoundé I" required></label>' +
        '<div class="ztf-dialog-actions"><button value="cancel" formnovalidate class="ztf-btn-ghost">Annuler</button><button value="ok" class="ztf-btn-primary">Ajouter</button></div></form>';
      document.body.appendChild(dlg);
      dlg.addEventListener("close", function () {
        var v = dlg.querySelector("[name=school]").value.trim();
        if (dlg.returnValue === "ok" && v) {
          el("institution_name").value = v; clearError("institution_name");
          toast("Établissement ajouté", "“" + v + "” a été enregistré. Il sera vérifié par notre équipe.");
          refresh();
        }
      });
    }
    dlg.querySelector("[name=cat]").value = el("institution_category").value;
    dlg.querySelector("[name=school]").value = "";
    dlg.showModal();
  }

  /* ---------- Validation ---------- */
  function fieldValue(name) {
    if (fileStore[name]) return fileStore[name].length ? fileStore[name] : "";
    var e = el(name); return e ? (e.value || "").trim() : "";
  }
  function check(name) {
    if (NP[name] && el(NP[name]).checked) return null;
    var v = fieldValue(name);
    if (!v || (Array.isArray(v) && !v.length)) {
      if (NP[name] && name !== "average") return "Renseignez ce champ ou cochez « Non communiqué ».";
      return "Ce champ est obligatoire.";
    }
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Veuillez saisir une adresse électronique valide.";
    if (name === "phone") {
      var full = (el("phone_code") ? el("phone_code").value : "") + v.replace(/\D/g, "");
      if (!/^\+\d{8,15}$/.test(full)) return "Veuillez saisir un numéro de téléphone valide avec indicatif.";
    }
    return null;
  }
  function container(name) { return form.querySelector('[data-field="' + name + '"]'); }
  function showError(name, msg) {
    var c = container(name); if (!c) return;
    c.classList.add("is-invalid");
    var p = c.querySelector(".ztf-error"); if (!p) { p = document.createElement("p"); p.className = "ztf-error"; c.appendChild(p); }
    p.textContent = msg;
  }
  function clearError(name) { var c = container(name); if (!c) return; c.classList.remove("is-invalid"); var p = c.querySelector(".ztf-error"); if (p) p.remove(); }

  /** Valide les champs obligatoires contenus dans `scope` (toute la page par défaut). */
  function validate(scope) {
    var first = null, ok = true;
    REQUIRED.forEach(function (n) {
      var c = container(n); if (!c || (scope && !scope.contains(c))) return;
      var msg = check(n);
      if (msg) { ok = false; showError(n, msg); if (!first) first = c; } else clearError(n);
    });
    var cgu = el("cgu");
    if (cgu && (!scope || scope.contains(cgu)) && !cgu.checked) {
      ok = false; showError("cgu", "Veuillez accepter les Conditions Générales d’Utilisation."); if (!first) first = container("cgu");
    }
    if (!ok) {
      toast("Formulaire incomplet", "Merci de compléter les champs signalés en rouge.", true);
      if (first) { first.scrollIntoView({ behavior: "smooth", block: "center" }); var f = first.querySelector("input,select,textarea"); if (f && !f.disabled) setTimeout(function () { f.focus({ preventScroll: true }); }, 350); }
    }
    return ok;
  }

  /* ---------- Progression ---------- */
  function refresh() {
    var done = REQUIRED.filter(function (n) { return container(n) && !check(n); }).length;
    var total = REQUIRED.filter(function (n) { return container(n); }).length;
    var pct = total ? Math.round(done / total * 100) : 0;
    $$("[data-ztf-progress]").forEach(function (b) { b.style.width = pct + "%"; b.setAttribute("aria-valuenow", pct); });
    $$("[data-ztf-progress-text]").forEach(function (t) { t.textContent = pct + " %"; });
    $$("[data-ztf-section]").forEach(function (s) {
      var req = REQUIRED.filter(function (n) { var c = container(n); return c && s.contains(c); });
      var complete = req.length > 0 && req.every(function (n) { return !check(n); });
      s.classList.toggle("is-complete", complete);
      $$('[data-ztf-nav="' + s.id + '"]').forEach(function (a) { a.classList.toggle("is-complete", complete); });
    });
    var cgu = el("cgu"); if (cgu) $$('button[type="submit"]', form).forEach(function (b) { b.disabled = !cgu.checked; });
    document.dispatchEvent(new CustomEvent("ztf:progress", { detail: { percent: pct } }));
  }

  /* ---------- Récapitulatif ---------- */
  function fmtDate(iso) { if (!iso) return ""; var d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  function summary() {
    function v(n) { return fieldValue(n); }
    function np(n, txt) { return el(NP[n]).checked ? txt : v(n); }
    function files(n) { return fileStore[n].map(function (f) { return f.name; }).join(", "); }
    return [
      { group: "1. Informations générales du candidat", items: [
        ["Civilité", v("civility")], ["Nom", v("last_name")], ["Prénom", v("first_name")], ["Nationalité", v("nationality")],
        ["Date de naissance", fmtDate(v("birth_date"))], ["Ville de résidence", v("city")],
        ["Téléphone", v("phone") ? (el("phone_code") ? el("phone_code").value + " " : "") + v("phone") : ""], ["Adresse électronique", v("email")]] },
      { group: "2. Parcours académique", items: [
        ["Établissement (catégorie)", v("institution_category")], ["Établissement (sous-catégorie)", v("institution_subcategory")],
        ["Établissement (nom)", v("institution_name")], ["Domaine d'études", v("field_of_study")], ["Niveau", v("level")],
        ["Moyenne", np("average", "Non communiquée")], ["Classement dans la promotion", np("ranking", "Non communiqué")],
        ["Taille de la promotion", np("cohort_size", "Non communiqué")]] },
      { group: "3. Pièces jointes (PJs)", items: [
        ["Pièce d'identité", files("idfile")], ["Diplômes et relevés de notes", files("transcripts")],
        ["Documents complémentaires", files("otherfiles")], ["Informations complémentaires", v("additional_notes")]] }
    ];
  }
  function renderRecap(target) {
    target = target || $("[data-ztf-recap]"); if (!target) return;
    target.innerHTML = "";
    summary().forEach(function (g) {
      var sec = document.createElement("section"); sec.className = "ztf-recap-group";
      var h = document.createElement("h4"); h.textContent = g.group; sec.appendChild(h);
      var dl = document.createElement("dl");
      g.items.forEach(function (it) {
        var dt = document.createElement("dt"); dt.textContent = it[0];
        var dd = document.createElement("dd"); dd.textContent = it[1] || "—"; if (!it[1]) dd.className = "is-empty";
        dl.appendChild(dt); dl.appendChild(dd);
      });
      sec.appendChild(dl); target.appendChild(sec);
    });
  }

  /* ---------- Envoi (simulé dans la maquette) ---------- */
  function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    var btns = $$('button[type="submit"]', form);
    btns.forEach(function (b) { b.dataset.label = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="ztf-spin"></span>Envoi en cours...'; });
    setTimeout(function () {
      btns.forEach(function (b) { b.innerHTML = b.dataset.label; });
      $$("[data-ztf-success-email]").forEach(function (n) { n.textContent = fieldValue("email"); });
      $$("[data-ztf-hide-on-success]").forEach(function (n) { n.hidden = true; });
      $$("[data-ztf-success]").forEach(function (n) { n.hidden = false; n.scrollIntoView({ behavior: "smooth", block: "start" }); });
      toast("Candidature envoyée !", "Votre dossier a été transmis avec succès. Vous recevrez un e-mail de confirmation.");
    }, 1100);
  }
  function reset() {
    form.reset(); Object.keys(fileStore).forEach(function (k) { fileStore[k] = []; renderFiles(k); });
    onCategory(); onLevel(); Object.keys(NP).forEach(onNP);
    REQUIRED.concat(["cgu"]).forEach(clearError);
    $$("[data-ztf-hide-on-success]").forEach(function (n) { n.hidden = false; });
    $$("[data-ztf-success]").forEach(function (n) { n.hidden = true; });
    refresh(); document.dispatchEvent(new CustomEvent("ztf:reset"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Démo : pré-remplissage ---------- */
  function fakeFile(name) { try { return new File(["maquette"], name, { type: "application/pdf" }); } catch (e) { return { name: name, size: 8 }; } }
  function fillDemo() {
    el("civility").value = "Mlle"; el("last_name").value = "Ngo Bayiha"; el("first_name").value = "Esther";
    el("nationality").selectedIndex = 1; el("birth_date").value = "2006-03-14"; el("city").value = "Yaoundé";
    el("phone").value = "6 77 12 34 56"; el("email").value = "esther.ngobayiha@exemple.com";
    el("institution_category").value = "Universités (Facultés)"; onCategory();
    el("institution_subcategory").value = "Sciences et technologies (maths, informatique, physique, etc.)";
    el("institution_name").value = "Université de Yaoundé I"; el("field_of_study").value = "Mathématiques";
    el("level").value = "BAC+2"; onLevel(); el("average").value = "17.4 / 20"; el("ranking").value = "2 / 214"; el("cohort_size").value = "214";
    fileStore.idfile = [fakeFile("CNI_Ngo_Bayiha.pdf")]; fileStore.transcripts = [fakeFile("Releve_L1_2025-2026.pdf"), fakeFile("Releve_L2_S1.pdf")];
    fileStore.otherfiles = [fakeFile("CV_Esther.pdf")];
    ["idfile", "transcripts", "otherfiles"].forEach(function (n) { syncInput(n); renderFiles(n); });
    el("additional_notes").value = "Major de promotion en L1, lauréate des Olympiades nationales de mathématiques 2024.";
    if (el("cgu")) el("cgu").checked = true;
    REQUIRED.concat(["cgu"]).forEach(clearError);
    refresh(); document.dispatchEvent(new CustomEvent("ztf:demo"));
  }

  /* ---------- Notifications ---------- */
  function toast(title, desc, danger) {
    var host = document.getElementById("ztf-toasts");
    if (!host) { host = document.createElement("div"); host.id = "ztf-toasts"; host.setAttribute("aria-live", "polite"); document.body.appendChild(host); }
    var t = document.createElement("div"); t.className = "ztf-toast" + (danger ? " is-danger" : "");
    var b = document.createElement("strong"); b.textContent = title; var p = document.createElement("span"); p.textContent = desc;
    t.appendChild(b); t.appendChild(p); host.appendChild(t);
    setTimeout(function () { t.classList.add("is-out"); setTimeout(function () { t.remove(); }, 300); }, 4200);
  }

  /* ---------- Captcha (emplacement Cloudflare Turnstile) ---------- */
  function renderCaptcha() {
    $$("[data-ztf-captcha]").forEach(function (box) {
      box.innerHTML = '<label class="ztf-captcha"><input type="checkbox" checked disabled> <span>Vérification anti-robot réussie</span><small>Turnstile</small></label>';
    });
  }

  function injectBaseStyles() {
    var css = "" +
      ".ztf-error{color:var(--ztf-danger,#c0392b);font-size:.8rem;margin:.35rem 0 0}" +
      ".is-invalid input:not([type=checkbox]),.is-invalid select{border-color:var(--ztf-danger,#c0392b)!important}" +
      ".ztf-file-list{list-style:none;margin:.5rem 0 0;padding:0;display:grid;gap:.35rem}" +
      ".ztf-file-list li{display:flex;justify-content:space-between;gap:.75rem;align-items:center;padding:.4rem .65rem;border-radius:8px;background:rgba(127,127,127,.09);font-size:.85rem}" +
      ".ztf-file-list li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ztf-file-list button{background:none;border:0;color:inherit;opacity:.7;cursor:pointer;font:inherit;text-decoration:underline}" +
      ".ztf-file-count,.ztf-file-single{font-size:.8rem;opacity:.8;margin:.4rem 0 0}" +
      "#ztf-toasts{position:fixed;right:16px;bottom:16px;z-index:9999;display:grid;gap:8px;max-width:min(380px,calc(100vw - 32px))}" +
      ".ztf-toast{background:#fff;color:#111827;border-radius:12px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.18);display:grid;gap:2px;font:14px/1.4 system-ui,sans-serif;border-left:4px solid #33a15a;transition:opacity .3s,transform .3s}" +
      ".ztf-toast.is-danger{border-left-color:#c0392b}.ztf-toast.is-out{opacity:0;transform:translateY(8px)}.ztf-toast span{opacity:.75}" +
      ".ztf-dialog{border:0;border-radius:16px;padding:0;max-width:440px;width:calc(100vw - 32px);box-shadow:0 20px 60px rgba(0,0,0,.3)}" +
      ".ztf-dialog::backdrop{background:rgba(3,8,66,.45)}.ztf-dialog form{padding:22px;display:grid;gap:12px;font:14px/1.5 system-ui,sans-serif;color:#111827}" +
      ".ztf-dialog h3{margin:0;font-size:1.1rem}.ztf-dialog p{margin:0;color:#6b7280}.ztf-dialog label{display:grid;gap:6px;font-weight:600}" +
      ".ztf-dialog input{font:inherit;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;font-weight:400}" +
      ".ztf-dialog-actions{display:flex;justify-content:flex-end;gap:8px}.ztf-btn-ghost,.ztf-btn-primary{font:inherit;font-weight:600;padding:9px 16px;border-radius:10px;cursor:pointer}" +
      ".ztf-btn-ghost{background:#fff;border:1px solid #d1d5db}.ztf-btn-primary{background:#33a15a;color:#fff;border:0}" +
      ".ztf-captcha{display:inline-flex;align-items:center;gap:10px;padding:12px 16px;border:1px solid rgba(127,127,127,.35);border-radius:6px;font-size:.85rem;background:rgba(127,127,127,.06)}" +
      ".ztf-captcha small{opacity:.55;margin-left:18px}.ztf-captcha input{width:auto!important}" +
      ".drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:18px 14px;border:1.5px dashed rgba(127,127,127,.45);border-radius:12px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s}" +
      ".drop:hover,.drop:focus-within{border-color:var(--ztf-accent,#33a15a);background:rgba(51,161,90,.05)}" +
      ".drop input[type=file]{position:absolute!important;inset:0;width:100%!important;height:100%!important;opacity:0;cursor:pointer;padding:0!important;border:0!important}" +
      ".drop-ic{font-size:1.1rem;opacity:.6}.drop-t{font-weight:600;font-size:.9rem}.drop-s{font-size:.78rem;opacity:.6}" +
      ".is-invalid .drop{border-color:var(--ztf-danger,#c0392b)}" +
      ".phone select{flex:none;width:auto!important;min-width:98px}.phone input{flex:1}" +
      ".ztf-spin{display:inline-block;width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:8px;vertical-align:-3px;animation:ztfspin .7s linear infinite}" +
      "@keyframes ztfspin{to{transform:rotate(360deg)}}" +
      ".ztf-demo{position:fixed;left:16px;bottom:16px;z-index:9998;font:600 12px/1 system-ui,sans-serif;padding:10px 14px;border-radius:999px;border:1px dashed rgba(127,127,127,.6);background:rgba(255,255,255,.92);color:#030842;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.12)}" +
      ".ztf-demo:hover{background:#fff}[hidden]{display:none!important}";
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  }

  function init() {
    form = $("[data-ztf-form]"); if (!form) return;
    injectBaseStyles(); populate(); renderCaptcha();
    form.setAttribute("novalidate", "");
    el("institution_category").addEventListener("change", onCategory);
    el("level").addEventListener("change", onLevel);
    Object.keys(NP).forEach(function (f) { el(NP[f]).addEventListener("change", function () { onNP(f); refresh(); }); });
    ["idfile", "transcripts", "otherfiles"].forEach(function (n) { el(n).addEventListener("change", function () { onFiles(n); clearError(n); refresh(); }); });
    $$("[data-ztf-add-school]").forEach(function (b) { b.addEventListener("click", openAddSchool); b.disabled = true; });
    form.addEventListener("input", function (e) { if (e.target.name) clearError(e.target.name); refresh(); });
    form.addEventListener("change", function (e) { if (e.target.name) clearError(e.target.name === "cgu" ? "cgu" : e.target.name); refresh(); });
    form.addEventListener("submit", onSubmit);
    $$("[data-ztf-reset]").forEach(function (b) { b.addEventListener("click", reset); });
    onLevel(); refresh();

    var demo = document.createElement("button"); demo.type = "button"; demo.className = "ztf-demo";
    demo.textContent = "Maquette · pré-remplir un exemple"; demo.addEventListener("click", fillDemo);
    document.body.appendChild(demo);
  }

  window.ZTF = { validate: validate, refresh: refresh, summary: summary, renderRecap: renderRecap, fillDemo: fillDemo, toast: toast, labels: LABELS };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
