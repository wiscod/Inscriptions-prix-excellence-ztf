/*
 * Moteur commun du formulaire de candidature — Prix d'Excellence ZTF.
 * Les pages ne font que la mise en page : champs, listes, langue, règles de validation,
 * comportements dépendants, fiche PDF et « Déjà inscrit ? » sont ici.
 *
 * Listes officielles : window.ZTF_LISTS (shared/ztf-lists.js, reprises de apply.excellenceawardsztf.com).
 *  - la catégorie d'établissement indique le cycle (secondaire / supérieur) et filtre la liste des écoles ;
 *  - le niveau indique la liste suivante : « Non applicable » (6ème-3ème, Form 1-4), série (second cycle)
 *    ou domaine d'études (supérieur).
 * Envoi : si la page définit window.ZTF_SUBMIT (site réel), le dossier part au serveur ; sinon il est simulé.
 * Événements émis sur document : ztf:progress, ztf:lang, ztf:invalid, ztf:reset, ztf:demo, ztf:success.
 */
(function () {
  "use strict";
  var D = window.ZTF_DATA, L = window.ZTF_LISTS, I = {};
  [window.ZTF_I18N, window.ZTF_PAGE_I18N].forEach(function (src) { if (src) Object.keys(src).forEach(function (k) { I[k] = src[k]; }); });

  var both = document.documentElement.getAttribute("data-ztf-mode") === "both";
  var lang = both ? "both" : initialLang();
  var form, fileStore = { transcripts: [], diplomas: [], otherfiles: [] }, lastRecord = null;
  var JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

  function initialLang() {
    var q = (location.search.match(/[?&]lang=(fr|en)\b/) || [])[1]; if (q) return q;
    try { var s = localStorage.getItem("ztf-lang"); if (s === "fr" || s === "en") return s; } catch (e) { /* stockage indisponible */ }
    return "fr";
  }

  /* ---------- Traduction ---------- */
  // Logo WhatsApp (Simple Icons, CC0), affiché à côté du numéro d'assistance.
  var WA_ICON = '<svg class="ztf-wa-icon" viewBox="0 0 24 24" width="18" height="18" aria-label="WhatsApp" role="img"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
  function interp(s, l, vars) {
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      if (vars && vars[k] != null) return vars[k];
      if (k === "year") return D.schoolYear;
      if (k === "contact") return D.contactEmail;
      if (k === "whatsapp") return D.whatsapp;
      if (k === "walink") return '<a class="ztf-wa" href="https://wa.me/' + D.whatsapp + '" target="_blank" rel="noopener">' + WA_ICON + D.whatsappDisplay + "</a>";
      if (k === "deadline") return l === "en" ? D.deadline[1] : D.deadline[0];
      if (k === "min") return D.minAge;
      if (k === "max") return D.maxFileMB;
      if (k === "mmax") return D.motivationMax;
      return m;
    });
  }
  function pair(key) { return I[key] || [key, key]; }
  function tr(key, vars) {
    var p = pair(key), fr = interp(p[0], "fr", vars), en = interp(p[1], "en", vars);
    if (lang === "both") return fr === en ? fr : fr + " / " + en;
    return lang === "en" ? en : fr;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function paint(node, key, html, vars) {
    var p = pair(key), fr = interp(p[0], "fr", vars), en = interp(p[1], "en", vars);
    if (!html) { fr = esc(fr); en = esc(en); }
    if (lang === "both") node.innerHTML = fr === en ? fr : fr + '<span class="i18n-en">' + en + "</span>";
    else node.innerHTML = lang === "en" ? en : fr;
  }
  function setKey(node, key, attr) {
    if (!node) return;
    attr = attr || "data-i18n";
    node.setAttribute(attr, key);
    if (attr === "data-i18n-ph") node.placeholder = tr(key); else paint(node, key, attr === "data-i18n-html");
  }
  /** Éléments de liste : [clé, libellé] (listes officielles, libellé unique) ou [valeur, français, anglais]. */
  function items(arr) { return arr.map(function (a) { return a.length === 3 ? { v: a[0], fr: a[1], en: a[2] } : { v: a[0], fr: a[1], en: a[1] }; }); }
  function itemText(it) {
    if (lang === "both") return it.both || (it.fr === it.en ? it.fr : it.fr + " / " + it.en);
    return lang === "en" ? it.en : it.fr;
  }
  function labelOf(list, key) { for (var i = 0; i < list.length; i++) if (list[i][0] === key) return list[i][1]; return key || ""; }

  /* ---------- Utilitaires DOM ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(name) { return form.elements[name]; }
  function container(name) { return form.querySelector('[data-field="' + name + '"]'); }
  function opt(value, text) { var o = document.createElement("option"); o.value = value; o.textContent = text; return o; }
  function fillSelect(s, list, phKey) {
    if (!s) return;
    var keep = s.value, found = false;
    s.innerHTML = "";
    var p = opt("", tr(phKey)); p.disabled = true; s.appendChild(p);
    function add(parent, it) { var o = opt(it.v, itemText(it)); if (it.v === keep) { o.selected = true; found = true; } parent.appendChild(o); }
    list.forEach(function (x) {
      if (x.items) { var g = document.createElement("optgroup"); g.label = tr(x.groupKey); x.items.forEach(function (it) { add(g, it); }); s.appendChild(g); }
      else add(s, x);
    });
    if (!found) { p.selected = true; s.value = ""; }
  }
  function setDatalist(id, values, input) {
    if (!input) return;
    var dl = document.getElementById(id) || document.createElement("datalist");
    var sig = values.length + ":" + (values[0] || "");
    if (dl.getAttribute("data-set") !== sig) {
      dl.id = id; dl.innerHTML = ""; dl.setAttribute("data-set", sig);
      values.forEach(function (v) { dl.appendChild(opt(v, v)); });
      document.body.appendChild(dl);
    }
    input.setAttribute("list", id); input.setAttribute("autocomplete", "off");
  }
  function flag(cc) { return cc.replace(/./g, function (c) { return String.fromCodePoint(127397 + c.charCodeAt(0)); }); }

  /* ---------- État dérivé ---------- */
  function radioVal(n) { var e = el(n); return e && e.value ? e.value : ""; }
  function cycleOfCategory(cat) { return !cat ? null : L.secondaryCategories.indexOf(cat) >= 0 ? "secondary" : "higher"; }
  function cycle() { return cycleOfCategory(el("institution_category").value) || radioVal("cycle") || null; }
  function age() {
    var v = el("birth_date").value; if (!v) return null;
    var b = new Date(v + "T00:00:00"), n = new Date(), a = n.getFullYear() - b.getFullYear(), m = n.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
    return a;
  }
  function schoolsFor(cat) { return L.schools.filter(function (s) { return s[2] === cat; }); }

  function required() {
    var r = ["gender", "last_name", "first_name", "nationality", "birth_date", "phone"];
    if (el("email").value.trim()) r.push("email");
    if (el("cycle")) r.push("cycle");
    r.push("institution_category", "institution_name", "level", "field_of_study", "average", "transcripts");
    return r;
  }

  /* ---------- Listes ---------- */
  function countries() {
    function names(l) { try { return new Intl.DisplayNames([l], { type: "region" }); } catch (e) { return null; } }
    var nf = names("fr"), ne = names("en");
    var list = D.countryCodes.map(function (cc) {
      var f = nf ? nf.of(cc) : cc, e = ne ? ne.of(cc) : cc, fl = flag(cc) + " ";
      return { v: cc, fr: fl + f, en: fl + e, both: fl + (f === e ? f : f + " / " + e) };
    });
    var key = lang === "en" ? "en" : "fr";
    list.sort(function (a, b) { return a[key].slice(5).localeCompare(b[key].slice(5), key); });
    return list.filter(function (c) { return c.v === "CM"; }).concat(list.filter(function (c) { return c.v !== "CM"; }));
  }
  function populateStatic() {
    fillSelect(el("gender"), items(D.genders), "ph.gender");
    fillSelect(el("nationality"), countries(), "ph.country");
    var pc = el("phone_code");
    if (pc && !pc.options.length) D.phoneCodes.forEach(function (p) { pc.appendChild(opt(p.code, p.label)); });
  }
  function updateCategories() {
    var cyc = el("cycle") ? radioVal("cycle") : "";
    var groups = ["secondary", "higher"].filter(function (g) { return !cyc || cyc === g; }).map(function (g) {
      return { groupKey: "grp." + g, items: items(L.categories.filter(function (c) { return cycleOfCategory(c[0]) === g; })) };
    });
    fillSelect(el("institution_category"), groups.length === 1 ? groups[0].items : groups, "ph.category");
  }
  function levelOptions(cyc) {
    var byKey = {}; L.levels.forEach(function (l) { byKey[l[0]] = l; });
    var pick = function (keys) { return items(keys.map(function (k) { return byKey[k]; })); };
    if (cyc === "secondary") return [{ groupKey: "grp.secondary_fr", items: pick(L.levelGroups.secondary_fr) }, { groupKey: "grp.secondary_en", items: pick(L.levelGroups.secondary_en) }];
    if (cyc === "higher") return pick(L.levelGroups.higher);
    return [];
  }
  function fieldOptions(level) {
    if (!level) return null;
    if (L.noFieldLevels.indexOf(level) >= 0) return items([L.notApplicable]);
    if (L.levelGroups.higher.indexOf(level) >= 0) return items(L.fields);
    return items(L.series);
  }
  function setLabel(name, key) { var c = container(name); if (c) setKey(c.querySelector("[data-ztf-lbl]"), key); }

  function updateDependent() {
    var cat = el("institution_category").value, cyc = cycle(), sec = cyc === "secondary";
    var n = el("institution_name");
    n.disabled = !cat; setKey(n, cat ? "ph.school" : "ph.needCategory", "data-i18n-ph");
    setDatalist("ztf-schools-" + (cat || "none"), cat ? schoolsFor(cat).map(function (s) { return s[1]; }) : [], n);
    $$("[data-ztf-add-school]").forEach(function (b) { b.disabled = !cat; });

    var lv = levelOptions(cyc);
    fillSelect(el("level"), lv, lv.length ? "ph.select" : "ph.needCategory"); el("level").disabled = !lv.length;
    var fo = fieldOptions(el("level").value);
    fillSelect(el("field_of_study"), fo || [], fo ? "ph.select" : "ph.needLevel"); el("field_of_study").disabled = !fo;
    if (fo && fo.length === 1) el("field_of_study").value = fo[0].v;

    setLabel("level", sec ? "lbl.class" : "lbl.level");
    setLabel("field_of_study", sec ? "lbl.series" : "lbl.fos");
    onLevel();
  }
  function onCategory() { el("institution_name").value = ""; el("school_id").value = ""; updateDependent(); }
  function onSchoolInput() {
    var v = el("institution_name").value.trim().toLowerCase(), cat = el("institution_category").value;
    var hit = schoolsFor(cat).filter(function (s) { return s[1].toLowerCase() === v; })[0];
    el("school_id").value = hit ? hit[0] : "";
  }
  function onLevel() {
    var phd = el("level").value === "PhD", cb = el("average_not_provided");
    $$("[data-ztf-average-np]").forEach(function (x) { x.hidden = !phd; });
    if (!phd && cb.checked) { cb.checked = false; onNP(); }
  }
  function onNP() {
    var cb = el("average_not_provided"), input = el("average");
    if (cb.checked) { input.value = ""; clearError("average"); }
    input.disabled = cb.checked;
    $$("[data-ztf-avg-star]").forEach(function (s) { s.hidden = cb.checked; });
  }
  function updateCounter() {
    var t = el("motivation"); if (!t) return;
    $$("[data-ztf-counter]").forEach(function (c) { c.textContent = tr("count.chars", { n: t.value.length, max: D.motivationMax }); });
  }

  /* ---------- Langue ---------- */
  function applyLang(l) {
    if (!both && l) { lang = l; try { localStorage.setItem("ztf-lang", l); } catch (e) { /* stockage indisponible */ } }
    document.documentElement.lang = lang === "en" ? "en" : "fr";
    $$("[data-i18n]").forEach(function (n) { paint(n, n.getAttribute("data-i18n"), false); });
    $$("[data-i18n-html]").forEach(function (n) { paint(n, n.getAttribute("data-i18n-html"), true); });
    $$("[data-i18n-ph]").forEach(function (n) { n.placeholder = tr(n.getAttribute("data-i18n-ph")); });
    $$("[data-i18n-aria]").forEach(function (n) { n.setAttribute("aria-label", tr(n.getAttribute("data-i18n-aria"))); });
    $$("[data-ztf-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-ztf-lang") === lang)); });
    populateStatic(); updateCategories(); updateDependent(); updateCounter();
    Object.keys(fileStore).forEach(renderFiles);
    refresh();
    document.dispatchEvent(new CustomEvent("ztf:lang", { detail: { lang: lang } }));
  }

  /* ---------- Pièces jointes ---------- */
  function syncInput(name) {
    try { var dt = new DataTransfer(); fileStore[name].forEach(function (f) { dt.items.add(f); }); el(name).files = dt.files; } catch (e) { /* navigateur ancien */ }
  }
  function fileOk(f, input) {
    var ext = (f.name.split(".").pop() || "").toLowerCase(), allowed = (input.getAttribute("accept") || "").replace(/\./g, "").split(",");
    if (allowed[0] && allowed.indexOf(ext) < 0) { toast(tr("toast.file"), tr("err.fileType", { name: f.name }), true); return false; }
    if (!f.size) { toast(tr("toast.file"), tr("err.fileEmpty", { name: f.name }), true); return false; }
    return true;
  }
  /**
   * Allège une photo avant l'envoi : 2000 pixels au plus sur le grand côté, JPEG d'environ 500 Ko.
   * Le texte d'un bulletin photographié reste lisible ; les PDF ne sont pas modifiés.
   */
  var SHRINK_OVER = 600 * 1024, SHRINK_TARGET = 550 * 1024, SHRINK_SIDE = 2000;
  function shrink(f) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png)$/.test(f.type) || f.size <= SHRINK_OVER || !window.URL || !document.createElement("canvas").toBlob) return resolve(f);
      var url = URL.createObjectURL(f), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); resolve(f); };
      img.onload = function () {
        var k = Math.min(1, SHRINK_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var q = 0.82;
        (function encode() {
          c.toBlob(function (b) {
            if (!b) return resolve(f);
            if (b.size > SHRINK_TARGET && q > 0.55) { q -= 0.09; return encode(); }
            if (b.size >= f.size) return resolve(f);
            resolve(new File([b], f.name.replace(/\.(png|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() }));
          }, "image/jpeg", q);
        })();
      };
      img.src = url;
    });
  }
  function onFiles(name) {
    var input = el(name), picked = Array.prototype.slice.call(input.files || []).filter(function (f) { return fileOk(f, input); });
    if (!picked.length) { syncInput(name); renderFiles(name); return; }
    Promise.all(picked.map(shrink)).then(function (files) {
      files.forEach(function (f) {
        if (f.size > D.maxFileMB * 1048576) { toast(tr("toast.file"), tr("err.fileSize", { name: f.name, max: D.maxFileMB }), true); return; }
        if (fileStore[name].length < D.maxFilesPerField && !fileStore[name].some(function (g) { return g.name === f.name && g.size === f.size; })) fileStore[name].push(f);
      });
      syncInput(name); renderFiles(name); clearError(name); refresh();
    });
  }
  function renderFiles(name) {
    $$('[data-ztf-filelist="' + name + '"]').forEach(function (box) {
      box.innerHTML = "";
      var files = fileStore[name]; if (!files.length) return;
      var count = document.createElement("p"); count.className = "ztf-file-count"; count.textContent = tr("files.count", { n: files.length }); box.appendChild(count);
      var ul = document.createElement("ul"); ul.className = "ztf-file-list";
      files.forEach(function (f, i) {
        var li = document.createElement("li"), span = document.createElement("span"), b = document.createElement("button");
        span.textContent = f.name; b.type = "button"; b.textContent = tr("files.remove");
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
      dlg.innerHTML = '<form method="dialog"><h3 data-i18n="dlg.title"></h3><p data-i18n="dlg.text"></p>' +
        '<label><span data-i18n="dlg.cat"></span><input name="cat" disabled></label>' +
        '<label><span data-i18n="dlg.name"></span><input name="school" required></label>' +
        '<div class="ztf-dialog-actions"><button value="cancel" formnovalidate class="ztf-btn-ghost" data-i18n="dlg.cancel"></button><button value="ok" class="ztf-btn-primary" data-i18n="dlg.ok"></button></div></form>';
      document.body.appendChild(dlg);
      dlg.addEventListener("close", function () {
        var v = dlg.querySelector("[name=school]").value.trim();
        if (dlg.returnValue === "ok" && v) {
          el("institution_name").value = v; el("school_id").value = ""; clearError("institution_name");
          toast(tr("toast.school"), tr("toast.school.d", { name: v })); refresh();
        }
      });
    }
    $$("[data-i18n]", dlg).forEach(function (n) { paint(n, n.getAttribute("data-i18n")); });
    var s = el("institution_category");
    dlg.querySelector("[name=cat]").value = s.selectedIndex > 0 ? s.options[s.selectedIndex].textContent : "";
    dlg.querySelector("[name=school]").value = "";
    dlg.returnValue = "";
    dlg.showModal();
  }

  /* ---------- Validation ---------- */
  function fieldValue(name) {
    if (fileStore[name]) return fileStore[name].length ? "1" : "";
    var e = el(name); if (!e) return "";
    if (e.type === "checkbox") return e.checked ? "1" : "";
    return (e.value || "").trim();
  }
  function phoneError(v) {
    var d = v.replace(/\D/g, ""), code = el("phone_code") ? el("phone_code").value : "+237";
    if (code === "+237") return /^[62]\d{8}$/.test(d) ? null : "err.phone";
    return /^\d{6,14}$/.test(d) ? null : "err.phoneIntl";
  }
  function check(name) {
    if (name === "average" && el("average_not_provided").checked) return null;
    var v = fieldValue(name);
    if (!v) return name === "cycle" ? "err.choice" : "err.required";
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "err.email";
    if (name === "phone") return phoneError(v);
    if (name === "birth_date") { var a = age(); if (a !== null && a < D.minAge) return "err.age"; }
    return null;
  }
  function showError(name, key) {
    var c = container(name); if (!c) return;
    c.classList.add("is-invalid");
    var p = c.querySelector(".ztf-error"); if (!p) { p = document.createElement("p"); p.className = "ztf-error"; c.appendChild(p); }
    setKey(p, key);
  }
  function clearError(name) { var c = container(name); if (!c) return; c.classList.remove("is-invalid"); var p = c.querySelector(".ztf-error"); if (p) p.remove(); }
  var ALL = ["gender", "last_name", "first_name", "nationality", "birth_date", "phone", "email", "cycle",
    "institution_category", "institution_name", "level", "field_of_study", "average", "transcripts"];

  /** Valide les champs obligatoires contenus dans `scope` (tout le formulaire par défaut). */
  function validate(scope) {
    var bad = [], req = required();
    ALL.forEach(function (n) { if (req.indexOf(n) < 0) clearError(n); });
    req.forEach(function (n) {
      var c = container(n); if (!c || (scope && !scope.contains(c))) return;
      var k = check(n);
      if (k) { showError(n, k); bad.push(c); } else clearError(n);
    });
    if (bad.length) {
      bad.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      var first = bad[0];
      document.dispatchEvent(new CustomEvent("ztf:invalid", { detail: { first: first } }));
      toast(tr("toast.incomplete"), tr("toast.incomplete.d"), true);
      setTimeout(function () {
        first.scrollIntoView({ behavior: "smooth", block: "center" });
        var f = first.querySelector("input:not([type=hidden]),select,textarea"); if (f && !f.disabled) setTimeout(function () { f.focus({ preventScroll: true }); }, 350);
      }, 30);
    }
    return !bad.length;
  }

  /* ---------- Progression ---------- */
  function refresh() {
    var req = required().filter(function (n) { return container(n); });
    var done = req.filter(function (n) { return !check(n); }).length;
    var pct = req.length ? Math.round(done / req.length * 100) : 0;
    $$("[data-ztf-progress]").forEach(function (b) { b.style.width = pct + "%"; b.setAttribute("aria-valuenow", pct); });
    $$("[data-ztf-progress-text]").forEach(function (t) { t.textContent = pct + " %"; });
    $$("[data-ztf-section]").forEach(function (s) {
      var mine = req.filter(function (n) { return s.contains(container(n)); });
      var complete = mine.length > 0 && mine.every(function (n) { return !check(n); });
      s.classList.toggle("is-complete", complete);
      $$('[data-ztf-nav="' + s.id + '"]').forEach(function (a) { a.classList.toggle("is-complete", complete); });
    });
    document.dispatchEvent(new CustomEvent("ztf:progress", { detail: { percent: pct } }));
  }

  /* ---------- Valeurs envoyées et libellés ---------- */
  function payload() {
    var p = { lang: lang === "en" ? "en" : "fr" };
    ["gender", "last_name", "first_name", "nationality", "birth_date", "phone_code", "phone", "email",
      "institution_category", "institution_name", "school_id", "level", "field_of_study", "average", "motivation"].forEach(function (n) { p[n] = fieldValue(n); });
    p.cycle = cycle() || "";
    p.average_not_provided = el("average_not_provided").checked;
    var names; try { names = new Intl.DisplayNames(["fr"], { type: "region" }); } catch (e) { names = null; }
    p.nationality_name = names && p.nationality ? names.of(p.nationality) : p.nationality;
    return p;
  }
  /** Lignes lisibles d'une fiche (pour le récapitulatif et la fiche PDF), à partir des valeurs enregistrées. */
  function describe(f) {
    var sec = cycleOfCategory(f.institution_category) === "secondary";
    var g = D.genders.filter(function (x) { return x[0] === f.gender; })[0];
    var fos = f.field_of_study === "NA" ? L.notApplicable[1] : labelOf(L.series.concat(L.fields), f.field_of_study);
    return [
      { group: tr("sec.identity"), items: [
        [tr("lbl.gender"), g ? (lang === "en" ? g[2] : g[1]) : ""], [tr("lbl.last_name"), f.last_name], [tr("lbl.first_name"), f.first_name],
        [tr("lbl.nationality"), countryName(f.nationality) || f.nationality_name || ""], [tr("lbl.birth_date"), fmtDate(f.birth_date)]].concat(f.city ? [[tr("lbl.city"), f.city]] : []).concat([
        [tr("lbl.phone"), f.phone ? f.phone_code + " " + f.phone : ""], [tr("lbl.email"), f.email]]) },
      { group: tr("sec.academic"), items: [
        [tr("lbl.institution_category"), labelOf(L.categories, f.institution_category)], [tr("lbl.institution_name"), f.institution_name],
        [tr(sec ? "lbl.class" : "lbl.level"), labelOf(L.levels, f.level)], [tr(sec ? "lbl.series" : "lbl.fos"), fos],
        [tr("lbl.average"), f.average_not_provided ? tr("np.average") : f.average]] }
    ];
  }
  function countryName(cc) {
    if (!cc) return "";
    try { return new Intl.DisplayNames([lang === "en" ? "en" : "fr"], { type: "region" }).of(cc); } catch (e) { return cc; }
  }
  function fmtDate(iso) { if (!iso) return ""; return new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  function summary() {
    var groups = describe(payload());
    var files = function (n) { return fileStore[n].map(function (f) { return f.name; }).join(", "); };
    groups.push({ group: tr("sec.attachments"), items: [[tr("lbl.transcripts"), files("transcripts")], [tr("lbl.diplomas"), files("diplomas")],
      [tr("lbl.otherfiles"), files("otherfiles")], [tr("lbl.motivation"), fieldValue("motivation")]] });
    return groups.map(function (g, i) { return { group: (i + 1) + ". " + g.group, items: g.items }; });
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

  /* ---------- Fiche PDF à imprimer pour l'audition ---------- */
  function loadJsPDF() {
    if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise(function (ok, ko) {
      var s = document.createElement("script"); s.src = JSPDF_URL;
      s.onload = function () { window.jspdf ? ok(window.jspdf.jsPDF) : ko(new Error("jsPDF")); };
      s.onerror = function () { ko(new Error("jsPDF")); };
      document.head.appendChild(s);
    });
  }
  // Les polices standard du PDF ne couvrent que l'alphabet latin courant : on remplace les autres caractères.
  function pdfText(s) { return String(s == null ? "" : s).replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\x20-\xFF\n]/g, "?"); }
  function makePdf(rec) {
    var keep = lang; if (lang === "both") lang = "fr";
    return loadJsPDF().then(function (JsPDF) {
      var doc = new JsPDF({ unit: "mm", format: "a4" }), W = 210, M = 16, y = 0;
      // En-tête clair : fond crème, filets dorés, titre bleu nuit
      doc.setFillColor(255, 251, 240); doc.rect(0, 0, W, 32, "F");
      doc.setFillColor(232, 185, 60); doc.rect(0, 0, W, 2.2, "F"); doc.rect(M, 31, W - 2 * M, 0.6, "F");
      doc.setTextColor(168, 118, 28); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(pdfText(tr("brand.org").toUpperCase()), M, 12);
      doc.setTextColor(6, 16, 74); doc.setFont("times", "bold"); doc.setFontSize(19); doc.text(pdfText(tr("brand.name") + " · " + tr("pdf.title")), M, 23);
      y = 42;
      doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(pdfText(tr("success.id") + " " + rec.id), M, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      if (rec.submittedAt) doc.text(pdfText(tr("pdf.date") + " " + fmtDate(rec.submittedAt)), W - M, y, { align: "right" });
      y += 8;
      doc.setFillColor(255, 246, 244); doc.setDrawColor(214, 31, 38);
      var warn = doc.splitTextToSize(pdfText(tr("pdf.warning")), W - 2 * M - 8);
      doc.rect(M, y, W - 2 * M, warn.length * 5 + 6, "FD");
      doc.setTextColor(150, 30, 20); doc.setFont("helvetica", "bold"); doc.text(warn, M + 4, y + 6.5);
      y += warn.length * 5 + 12;
      var groups = describe(rec.fields);
      var byField = function (k) { return (rec.files || []).filter(function (f) { return f.field === k; }).map(function (f) { return f.name; }).join(", "); };
      groups.push({ group: tr("pdf.files"), items: [[tr("lbl.transcripts"), byField("transcripts") || "—"]]
        .concat(["diplomas", "otherfiles"].filter(byField).map(function (k) { return [tr("lbl." + k), byField(k)]; })) });
      if (rec.fields.motivation) groups.push({ group: tr("lbl.motivation"), items: [["", rec.fields.motivation]] });
      groups.forEach(function (g) {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.setTextColor(6, 16, 74); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text(pdfText(g.group.toUpperCase()), M, y); y += 2;
        doc.setDrawColor(232, 185, 60); doc.setLineWidth(0.5); doc.line(M, y, W - M, y); doc.setLineWidth(0.2); y += 6;
        doc.setFontSize(10);
        g.items.forEach(function (it) {
          var lw = it[0] ? 58 : 0;
          var val = doc.splitTextToSize(pdfText(it[1] || "—"), W - 2 * M - lw);
          var lab = it[0] ? doc.splitTextToSize(pdfText(it[0]), lw - 4) : [];
          var lines = Math.max(val.length, lab.length, 1);
          if (y + lines * 5 > 282) { doc.addPage(); y = 20; }
          if (lab.length) { doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal"); doc.text(lab, M, y); }
          doc.setTextColor(15, 23, 42); doc.setFont("helvetica", it[0] ? "bold" : "normal"); doc.text(val, M + lw, y);
          y += lines * 5 + 2;
        });
        y += 4;
      });
      doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
      doc.text(pdfText(tr("brand.org") + " · " + D.contactEmail + " · WhatsApp " + D.whatsappDisplay), M, 290);
      doc.save("fiche-candidature-" + rec.id + ".pdf");
    }).catch(function () { toast(tr("toast.failed"), tr("pdf.error"), true); })
      .then(function () { lang = keep; });
  }

  /* ---------- « Déjà inscrit ? » ---------- */
  function lookup() {
    var code = ($("#ztf-lookup-code") || {}).value || "", msg = $("[data-ztf-lookup-msg]");
    code = code.trim().toUpperCase();
    var say = function (k) { if (msg) msg.textContent = k ? tr(k) : ""; };
    if (!code) return;
    if (typeof window.ZTF_LOOKUP !== "function") { say("lookup.mock"); return; }
    say(""); var btn = $("[data-ztf-lookup-btn]"); if (btn) btn.disabled = true;
    window.ZTF_LOOKUP(code)
      .then(function (rec) { if (!rec) { say("lookup.notFound"); return; } return makePdf(rec); })
      .catch(function () { say("toast.failed.d"); })
      .then(function () { if (btn) btn.disabled = false; });
  }

  /* ---------- Envoi ---------- */
  function busy(on, pct) {
    $$('button[type="submit"]').forEach(function (b) {
      if (on) {
        if (!b.dataset.busy) { b.dataset.busy = "1"; b.dataset.label = b.innerHTML; }
        b.disabled = true; b.innerHTML = '<span class="ztf-spin"></span>' + esc(tr("btn.sending")) + (pct != null ? " " + pct + " %" : "");
      } else if (b.dataset.busy) { b.innerHTML = b.dataset.label; delete b.dataset.busy; b.disabled = false; }
    });
  }
  function success(res, fields) {
    lastRecord = { id: res.id || "", code: res.code || "", submittedAt: new Date().toISOString(), fields: fields,
      files: Object.keys(fileStore).reduce(function (a, k) { return a.concat(fileStore[k].map(function (f) { return { field: k, name: f.name }; })); }, []) };
    $$("[data-ztf-success-id]").forEach(function (n) { n.textContent = lastRecord.id || "—"; });
    $$("[data-ztf-success-code]").forEach(function (n) { n.textContent = lastRecord.code; });
    $$("[data-ztf-code-box]").forEach(function (n) { n.hidden = !lastRecord.code; });
    $$("[data-ztf-hide-on-success]").forEach(function (n) { n.hidden = true; });
    $$("[data-ztf-success]").forEach(function (n) { n.hidden = false; n.scrollIntoView({ behavior: "smooth", block: "start" }); });
    toast(tr("toast.sent"), tr("toast.sent.d"));
    document.dispatchEvent(new CustomEvent("ztf:success", { detail: lastRecord }));
  }
  function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    busy(true);
    var fields = payload();
    if (typeof window.ZTF_SUBMIT === "function") {
      var files = {}; Object.keys(fileStore).forEach(function (k) { files[k] = fileStore[k].slice(); });
      window.ZTF_SUBMIT(fields, files, function (pct) { busy(true, pct); })
        .then(function (res) { busy(false); success(res || {}, fields); })
        .catch(function (err) { busy(false); toast(tr("toast.failed"), (err && err.message) || tr("toast.failed.d"), true); });
      return;
    }
    setTimeout(function () { busy(false); success({ id: "ZTF-MAQUETTE-0000" }, fields); }, 1100); // maquette : envoi simulé
  }
  function reset() {
    form.reset(); Object.keys(fileStore).forEach(function (k) { fileStore[k] = []; renderFiles(k); });
    onNP(); updateCategories(); updateDependent(); updateCounter();
    ALL.forEach(clearError);
    lastRecord = null;
    $$("[data-ztf-hide-on-success]").forEach(function (n) { n.hidden = false; });
    $$("[data-ztf-success]").forEach(function (n) { n.hidden = true; });
    refresh(); document.dispatchEvent(new CustomEvent("ztf:reset"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Démo : deux dossiers fictifs ---------- */
  function fakeFile(name) { try { return new File(["maquette"], name, { type: "application/pdf" }); } catch (e) { return { name: name, size: 8 }; } }
  function firstSchool(cat, hint) {
    var list = schoolsFor(cat), re = hint ? new RegExp(hint, "i") : null;
    return (re && list.filter(function (s) { return re.test(s[1]); })[0]) || list[0];
  }
  function fillDemo(kind) {
    form.reset(); onNP();
    var pupil = kind !== "student";
    var p = pupil ? {
      gender: "male", last_name: "Nfor", first_name: "Divine Kum", birth: "2009-05-02", phone: "6 75 22 11 00", email: "",
      cycle: "secondary", cat: "GeneralHighSchool", schoolHint: "Bamenda|Mankon", level: "UpperSixth", fos: "C", avg: "17.1 / 20",
      files: [["Report_card_term1_2025-2026.pdf", "Report_card_term2_2025-2026.pdf", "Report_card_term3_2025-2026.pdf"], ["GCE_O_Level_result_slip.pdf"], ["Olympiades_maths_2025.pdf"]],
      motivation: "Je veux devenir ingénieur en énergies renouvelables. Major de ma classe depuis la Form 3, lauréat des Olympiades nationales de mathématiques 2025."
    } : {
      gender: "female", last_name: "Ngo Bayiha", first_name: "Esther", birth: "2006-03-14", phone: "6 77 12 34 56", email: "esther.ngobayiha@exemple.com",
      cycle: "higher", cat: "University", schoolHint: "Yaound", level: "BAC2", fos: "Mathematics", avg: "17.4 / 20",
      files: [["Releve_L2_S1_2025-2026.pdf", "Releve_L2_S2_2025-2026.pdf"], ["Baccalaureat_C_2024.pdf"], []],
      motivation: "Major de promotion en L1, je souhaite poursuivre en recherche en mathématiques appliquées."
    };
    el("gender").value = p.gender; el("last_name").value = p.last_name; el("first_name").value = p.first_name;
    el("nationality").value = "CM"; el("birth_date").value = p.birth;
    el("phone").value = p.phone; el("email").value = p.email;
    if (el("cycle")) el("cycle").value = p.cycle;
    updateCategories(); el("institution_category").value = p.cat; updateDependent();
    var sc = firstSchool(p.cat, p.schoolHint);
    el("institution_name").value = sc ? sc[1] : ""; el("school_id").value = sc ? sc[0] : "";
    el("level").value = p.level; updateDependent(); el("field_of_study").value = p.fos;
    el("average").value = p.avg; el("motivation").value = p.motivation; updateCounter();
    ["transcripts", "diplomas", "otherfiles"].forEach(function (n, i) { fileStore[n] = p.files[i].map(fakeFile); syncInput(n); renderFiles(n); });
    ALL.forEach(clearError);
    refresh(); document.dispatchEvent(new CustomEvent("ztf:demo", { detail: { kind: pupil ? "pupil" : "student" } }));
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
      box.innerHTML = '<label class="ztf-captcha"><input type="checkbox" checked disabled> <span data-i18n="captcha"></span><small>Turnstile</small></label>';
    });
  }

  function injectBaseStyles() {
    var css = "" +
      ".ztf-error{color:var(--ztf-danger,#c0392b);font-size:.8rem;margin:.35rem 0 0}" +
      ".is-invalid input:not([type=checkbox]):not([type=radio]),.is-invalid select,.is-invalid textarea{border-color:var(--ztf-danger,#c0392b)!important}" +
      ".is-invalid .choice-opt{border-color:var(--ztf-danger,#c0392b)!important}" +
      ".ztf-file-list{list-style:none;margin:.5rem 0 0;padding:0;display:grid;gap:.35rem}" +
      ".ztf-file-list li{display:flex;justify-content:space-between;gap:.75rem;align-items:center;padding:.4rem .65rem;border-radius:8px;background:rgba(127,127,127,.09);font-size:.85rem}" +
      ".ztf-file-list li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ztf-file-list button{background:none;border:0;color:inherit;opacity:.7;cursor:pointer;font:inherit;text-decoration:underline}" +
      ".ztf-file-count{font-size:.8rem;opacity:.8;margin:.4rem 0 0}" +
      ".ztf-wa{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-weight:600}.ztf-wa-icon{flex:none}" +
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
      ".ztf-captcha small{opacity:.55;margin-left:18px}.ztf-captcha input{width:auto!important;min-height:0!important}" +
      ".drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:18px 14px;border:1.5px dashed rgba(127,127,127,.45);border-radius:12px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s}" +
      ".drop:hover,.drop:focus-within{border-color:var(--ztf-accent,#33a15a);background:rgba(51,161,90,.05)}" +
      ".drop input[type=file]{position:absolute!important;inset:0;width:100%!important;height:100%!important;opacity:0;cursor:pointer;padding:0!important;border:0!important}" +
      ".drop-ic{font-size:1.1rem;opacity:.6}.drop-t{font-weight:600;font-size:.9rem}.drop-s{font-size:.78rem;opacity:.6}" +
      ".is-invalid .drop{border-color:var(--ztf-danger,#c0392b)}" +
      ".phone{display:flex}.phone select{flex:none;width:auto!important;min-width:98px}.phone input{flex:1}" +
      ".choice{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}" +
      ".choice-opt{position:relative;display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border:1.5px solid rgba(127,127,127,.3);border-radius:12px;cursor:pointer;font-weight:400;transition:border-color .15s,background .15s}" +
      ".choice-opt input{width:18px!important;height:18px;min-height:0!important;margin:2px 0 0;flex:none;accent-color:var(--ztf-accent,#33a15a)}" +
      ".choice-opt:has(input:checked){border-color:var(--ztf-accent,#33a15a);background:rgba(51,161,90,.07)}" +
      ".choice-t{display:grid;gap:2px}.choice-t small{opacity:.7;font-size:.8rem}" +
      ".counter{text-align:right}" +
      ".lookup{border:1px solid rgba(127,127,127,.3);border-radius:12px;padding:10px 14px;margin:0 0 18px;background:rgba(127,127,127,.04)}" +
      ".lookup summary{cursor:pointer;font-weight:600;font-size:.9rem}.lookup-row{display:flex;gap:8px;margin-top:10px}" +
      ".lookup-row input{flex:1;min-width:0;font:inherit;padding:9px 12px;border:1px solid rgba(127,127,127,.4);border-radius:10px;text-transform:uppercase;letter-spacing:.06em}" +
      ".lookup-row button{font:inherit;font-weight:600;padding:9px 14px;border-radius:10px;border:0;background:var(--ztf-accent,#33a15a);color:#fff;cursor:pointer}" +
      ".lookup-msg{margin:6px 0 0;font-size:.82rem;color:var(--ztf-danger,#c0392b);min-height:0}" +
      ".sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}" +
      ".receipt{display:grid;gap:10px;justify-items:center;margin:14px auto 0;max-width:520px}" +
      ".receipt p{margin:0}.receipt-code{border:1.5px dashed var(--ztf-accent,#33a15a);border-radius:12px;padding:12px 16px;display:grid;gap:4px;width:100%}" +
      ".receipt .code{font:700 1.5rem/1.2 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em}" +
      ".receipt-warn{background:#fdecea;color:#8a1c12;border-radius:10px;padding:10px 14px;font-weight:600;font-size:.9rem}" +
      ".receipt-pdf{font:inherit;font-weight:700;padding:13px 20px;border-radius:12px;border:0;background:var(--ztf-accent,#33a15a);color:#fff;cursor:pointer}" +
      ".lang-switch{display:inline-flex;border:1px solid rgba(127,127,127,.35);border-radius:999px;padding:3px;gap:2px}" +
      ".lang-switch button{font:600 .78rem/1 system-ui,sans-serif;letter-spacing:.04em;padding:7px 11px;border:0;border-radius:999px;background:transparent;color:inherit;cursor:pointer;opacity:.7}" +
      ".lang-switch button[aria-pressed=true]{background:var(--ztf-accent,#33a15a);color:#fff;opacity:1}" +
      ".ztf-spin{display:inline-block;width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:8px;vertical-align:-3px;animation:ztfspin .7s linear infinite}" +
      "@keyframes ztfspin{to{transform:rotate(360deg)}}" +
      ".ztf-demo{position:fixed;left:16px;bottom:16px;z-index:9998;display:flex;flex-wrap:wrap;align-items:center;gap:6px;max-width:calc(100vw - 32px);font:600 12px/1.2 system-ui,sans-serif;padding:8px 10px;border-radius:14px;border:1px dashed rgba(127,127,127,.6);background:rgba(255,255,255,.95);color:#030842;box-shadow:0 4px 14px rgba(0,0,0,.12)}" +
      ".ztf-demo button{font:inherit;padding:6px 10px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;color:#030842;cursor:pointer}.ztf-demo button:hover{background:#f1f5f9}" +
      "[hidden]{display:none!important}";
    var s = document.createElement("style"); s.textContent = css; document.head.insertBefore(s, document.head.firstChild);
  }

  function init() {
    form = $("[data-ztf-form]"); if (!form) return;
    injectBaseStyles(); renderCaptcha();
    form.setAttribute("novalidate", "");

    var bd = el("birth_date"), max = new Date();
    max.setFullYear(max.getFullYear() - D.minAge); bd.max = max.toISOString().slice(0, 10); bd.min = "1960-01-01";
    el("motivation").setAttribute("maxlength", D.motivationMax);

    form.addEventListener("change", function (e) {
      var n = e.target.name; if (!n) return;
      if (n === "institution_category") onCategory();
      else if (n === "cycle") { updateCategories(); onCategory(); }
      else if (n === "level") updateDependent();
      else if (n === "institution_name") onSchoolInput();
      else if (n === "average_not_provided") onNP();
      else if (fileStore[n]) onFiles(n);
      clearError(n); refresh();
    });
    form.addEventListener("input", function (e) {
      var n = e.target.name; if (!n) return;
      if (n === "institution_name") onSchoolInput();
      if (n === "motivation") updateCounter();
      clearError(n); refresh();
    });
    form.addEventListener("submit", onSubmit);
    $$("[data-ztf-add-school]").forEach(function (b) { b.addEventListener("click", openAddSchool); });
    $$("[data-ztf-reset]").forEach(function (b) { b.addEventListener("click", reset); });
    $$("[data-ztf-lang]").forEach(function (b) { b.addEventListener("click", function () { applyLang(b.getAttribute("data-ztf-lang")); }); });
    $$("[data-ztf-pdf]").forEach(function (b) { b.addEventListener("click", function () { if (lastRecord) makePdf(lastRecord); }); });
    $$("[data-ztf-lookup-btn]").forEach(function (b) { b.addEventListener("click", lookup); });
    var lc = $("#ztf-lookup-code"); if (lc) lc.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); lookup(); } });

    if (window.ZTF_DEMO !== false) {
      var demo = document.createElement("div"); demo.className = "ztf-demo";
      demo.innerHTML = '<span data-i18n="demo.title"></span><button type="button" data-kind="pupil" data-i18n="demo.pupil"></button><button type="button" data-kind="student" data-i18n="demo.student"></button>';
      $$("button", demo).forEach(function (b) { b.addEventListener("click", function () { fillDemo(b.getAttribute("data-kind")); }); });
      document.body.appendChild(demo);
    }
    applyLang(lang);
  }

  window.ZTF = { validate: validate, refresh: refresh, summary: summary, renderRecap: renderRecap, fillDemo: fillDemo, toast: toast,
    tr: tr, lang: function () { return lang; }, setLang: applyLang, makePdf: makePdf, describe: describe };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
