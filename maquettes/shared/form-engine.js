/*
 * Moteur commun aux 5 maquettes du formulaire de candidature — Prix d'Excellence ZTF.
 * Les maquettes ne font que la mise en page : champs, listes, langue, règles de validation
 * et comportements dépendants sont ici, pour que les informations demandées soient identiques partout.
 *
 * Comportements :
 *  - langue FR / EN (boutons [data-ztf-lang]) ou affichage bilingue simultané (<html data-ztf-mode="both">) ;
 *  - catégorie d'établissement → secondaire ou supérieur → listes « Classe » / « Niveau », « Série » / « Domaine d'études » ;
 *  - sous-système anglophone + secondaire → bloc « Résultats GCE » ;
 *  - moins de 18 ans → bloc « Parent ou tuteur légal » obligatoire.
 * Événements émis sur document : ztf:progress, ztf:lang, ztf:invalid, ztf:reset, ztf:demo.
 */
(function () {
  "use strict";
  var D = window.ZTF_DATA, I = {};
  [window.ZTF_I18N, window.ZTF_PAGE_I18N].forEach(function (src) { if (src) Object.keys(src).forEach(function (k) { I[k] = src[k]; }); });

  var both = document.documentElement.getAttribute("data-ztf-mode") === "both";
  var lang = both ? "both" : initialLang();
  var NP = { average: "average_not_provided", ranking: "ranking_not_provided", cohort_size: "cohort_size_not_provided" };
  var form, fileStore = { idfile: [], transcripts: [], otherfiles: [] };

  function initialLang() {
    var q = (location.search.match(/[?&]lang=(fr|en)\b/) || [])[1]; if (q) return q;
    try { var s = localStorage.getItem("ztf-lang"); if (s === "fr" || s === "en") return s; } catch (e) { /* stockage indisponible */ }
    return "fr";
  }

  /* ---------- Traduction ---------- */
  function interp(s, l, vars) {
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      if (vars && vars[k] != null) return vars[k];
      if (k === "year") return D.schoolYear;
      if (k === "contact") return D.contactEmail;
      if (k === "deadline") return l === "en" ? D.deadline[1] : D.deadline[0];
      if (k === "min") return D.minAge;
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
  function items(arr) { return arr.map(function (a) { return Array.isArray(a) ? { v: a[0], fr: a[0], en: a[1] } : a; }); }
  function itemText(it) {
    if (lang === "both") return it.both || (it.fr === it.en ? it.fr : it.fr + " / " + it.en);
    return lang === "en" ? it.en : it.fr;
  }

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
    if (dl.getAttribute("data-set") !== values.join("|")) {
      dl.id = id; dl.innerHTML = ""; dl.setAttribute("data-set", values.join("|"));
      values.forEach(function (v) { dl.appendChild(opt(v, v)); });
      document.body.appendChild(dl);
    }
    input.setAttribute("list", id); input.setAttribute("autocomplete", "off");
  }
  function flag(cc) { return cc.replace(/./g, function (c) { return String.fromCodePoint(127397 + c.charCodeAt(0)); }); }

  /* ---------- État dérivé ---------- */
  function radioVal(n) { var e = el(n); return e && e.value ? e.value : ""; }
  function category() { var v = el("institution_category").value; return D.categories.filter(function (c) { return c.fr === v; })[0] || null; }
  function cycle() { var c = category(); return c ? c.cycle : radioVal("cycle") || null; }
  function subsystem() { return radioVal("subsystem"); }
  function age() {
    var v = el("birth_date").value; if (!v) return null;
    var b = new Date(v + "T00:00:00"), n = new Date(), a = n.getFullYear() - b.getFullYear(), m = n.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
    return a;
  }
  function isMinor() { var a = age(); return a !== null && a >= 0 && a < D.adultAge; }
  function gceVisible() { return cycle() === "secondary" && subsystem() === "anglophone"; }
  function gceTaken() { var v = el("gce_exam") ? el("gce_exam").value : ""; return gceVisible() && !!v && v !== D.gceExams[0][0]; }

  function required() {
    var r = ["civility", "last_name", "first_name", "nationality", "birth_date", "city", "phone", "email"];
    if (isMinor()) {
      r.push("guardian_relation", "guardian_name", "guardian_phone", "guardian_consent");
      if (el("guardian_email").value.trim()) r.push("guardian_email");
    }
    if (el("cycle")) r.push("cycle");
    r.push("subsystem", "institution_category", "institution_subcategory", "institution_name", "field_of_study", "level", "average", "ranking", "cohort_size");
    if (gceVisible()) { r.push("gce_exam"); if (gceTaken()) r.push("gce_results"); }
    r.push("idfile", "transcripts");
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
  function fields() {
    var key = lang === "en" ? "en" : "fr", list = items(D.fieldsOfStudy), first = list.shift();
    list.sort(function (a, b) { return a[key].localeCompare(b[key], key); });
    return [first].concat(list);
  }
  function populateStatic() {
    fillSelect(el("civility"), items(D.civilities), "ph.select");
    fillSelect(el("nationality"), countries(), "ph.country");
    fillSelect(el("guardian_relation"), items(D.guardianRelations), "ph.select");
    fillSelect(el("gce_exam"), items(D.gceExams), "ph.select");
    ["phone_code", "guardian_phone_code"].forEach(function (n) {
      var s = el(n); if (!s || s.options.length) return;
      D.phoneCodes.forEach(function (p) { s.appendChild(opt(p.code, p.label)); });
    });
    setDatalist("ztf-cities", D.cities, el("city"));
  }
  function updateCategories() {
    var cyc = el("cycle") ? radioVal("cycle") : "";
    var groups = ["secondary", "higher"].filter(function (g) { return !cyc || cyc === g; }).map(function (g) {
      return { groupKey: "grp." + g, items: D.categories.filter(function (c) { return c.cycle === g; }).map(function (c) { return { v: c.fr, fr: c.fr, en: c.en }; }) };
    });
    fillSelect(el("institution_category"), groups.length === 1 ? groups[0].items : groups, "ph.category");
  }
  function setLabel(name, key) { var c = container(name); if (c) setKey(c.querySelector("[data-ztf-lbl]"), key); }

  function updateDependent() {
    var c = category(), cyc = cycle(), sub = subsystem(), sec = cyc === "secondary";

    var s = el("institution_subcategory");
    fillSelect(s, c ? items(c.sub) : [], c ? "ph.subcategory" : "ph.needCategory"); s.disabled = !c;
    var n = el("institution_name"); n.disabled = !c; setKey(n, c ? "ph.school" : "ph.needCategory", "data-i18n-ph");
    setDatalist("ztf-schools-" + (sec ? "s" : "h"), sec ? D.schools.secondary : D.schools.higher, n);
    $$("[data-ztf-add-school]").forEach(function (b) { b.disabled = !c; });

    var lv = [], fos = [], ph = "ph.needCategory";
    if (cyc === "higher") { lv = items(D.levels.higher); fos = fields(); }
    else if (sec && sub) { lv = items(D.levels[sub]); fos = items(D.series[sub]); }
    else if (sec) ph = "ph.needSubsystem";
    fillSelect(el("level"), lv, lv.length ? "ph.select" : ph); el("level").disabled = !lv.length;
    fillSelect(el("field_of_study"), fos, fos.length ? "ph.select" : ph); el("field_of_study").disabled = !fos.length;

    setLabel("field_of_study", sec ? "lbl.series" : "lbl.fos");
    setLabel("level", sec ? "lbl.class" : "lbl.level");
    setLabel("ranking", sec ? "lbl.rank.class" : "lbl.rank.promo");
    setLabel("cohort_size", sec ? "lbl.cohort.class" : "lbl.cohort.promo");
    $$("[data-ztf-avg-hint]").forEach(function (h) { setKey(h, sec ? "hint.avg." + (sub || "francophone") : "hint.avg.higher"); });

    onLevel();
    var gv = gceVisible(), gt = gceTaken();
    $$("[data-ztf-gce]").forEach(function (b) { b.hidden = !gv; });
    container("gce_results").hidden = !gt; el("gce_results").disabled = !gt;
  }
  function updateGuardian() { $$("[data-ztf-guardian]").forEach(function (b) { b.hidden = !isMinor(); }); }
  function onCategory() { el("institution_name").value = ""; updateDependent(); }
  function onLevel() {
    var post = el("level").value === "Post-BAC+5";
    $$("[data-ztf-average-np]").forEach(function (n) { n.hidden = !post; });
    if (!post && el("average_not_provided").checked) { el("average_not_provided").checked = false; onNP("average"); }
  }
  function onNP(f) {
    var cb = el(NP[f]), input = el(f);
    if (cb.checked) { input.value = ""; clearError(f); }
    input.disabled = cb.checked;
    if (f === "average") $$("[data-ztf-avg-star]").forEach(function (s) { s.hidden = cb.checked; });
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
    $$("[data-ztf-success-email]").forEach(function (n) { n.textContent = el("email").value; });
    populateStatic(); updateCategories(); updateDependent();
    Object.keys(fileStore).forEach(renderFiles);
    refresh();
    document.dispatchEvent(new CustomEvent("ztf:lang", { detail: { lang: lang } }));
  }

  /* ---------- Pièces jointes ---------- */
  function syncInput(name) {
    try { var dt = new DataTransfer(); fileStore[name].forEach(function (f) { dt.items.add(f); }); el(name).files = dt.files; } catch (e) { /* navigateur ancien */ }
  }
  function onFiles(name) {
    var input = el(name), picked = Array.prototype.slice.call(input.files || []);
    if (input.multiple) picked.forEach(function (f) { if (!fileStore[name].some(function (g) { return g.name === f.name && g.size === f.size; })) fileStore[name].push(f); });
    else fileStore[name] = picked.slice(0, 1);
    syncInput(name); renderFiles(name);
  }
  function renderFiles(name) {
    $$('[data-ztf-filelist="' + name + '"]').forEach(function (box) {
      box.innerHTML = "";
      var files = fileStore[name]; if (!files.length) return;
      if (name === "idfile") {
        var p = document.createElement("p"); p.className = "ztf-file-single";
        p.textContent = tr("files.single") + " "; var b0 = document.createElement("strong"); b0.textContent = files[0].name; p.appendChild(b0);
        box.appendChild(p); return;
      }
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
        if (dlg.returnValue === "ok" && v) { el("institution_name").value = v; clearError("institution_name"); toast(tr("toast.school"), tr("toast.school.d", { name: v })); refresh(); }
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
  function phoneError(codeName, v) {
    var d = v.replace(/\D/g, ""), code = el(codeName) ? el(codeName).value : "+237";
    if (code === "+237") return /^[62]\d{8}$/.test(d) ? null : "err.phone";
    return /^\d{6,14}$/.test(d) ? null : "err.phoneIntl";
  }
  function check(name) {
    if (NP[name] && el(NP[name]).checked) return null;
    var v = fieldValue(name);
    if (!v) {
      if (name === "cycle" || name === "subsystem") return "err.choice";
      if (name === "guardian_consent") return "err.guardian_consent";
      if (NP[name] && name !== "average") return "err.np";
      return "err.required";
    }
    if ((name === "email" || name === "guardian_email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "err.email";
    if (name === "phone") return phoneError("phone_code", v);
    if (name === "guardian_phone") return phoneError("guardian_phone_code", v);
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
  function allNames() { return required().concat(["guardian_relation", "guardian_name", "guardian_phone", "guardian_email", "guardian_consent", "gce_exam", "gce_results", "cgu"]); }

  /** Valide les champs obligatoires contenus dans `scope` (tout le formulaire par défaut). */
  function validate(scope) {
    var bad = [], req = required();
    allNames().forEach(function (n) { if (req.indexOf(n) < 0 && n !== "cgu") clearError(n); });
    req.forEach(function (n) {
      var c = container(n); if (!c || (scope && !scope.contains(c))) return;
      var k = check(n);
      if (k) { showError(n, k); bad.push(c); } else clearError(n);
    });
    var cgu = el("cgu");
    if (cgu && (!scope || scope.contains(cgu)) && !cgu.checked) { showError("cgu", "err.cgu"); bad.push(container("cgu")); }
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
    var cgu = el("cgu"); if (cgu) $$('button[type="submit"]').forEach(function (b) { if (!b.dataset.busy) b.disabled = !cgu.checked; });
    document.dispatchEvent(new CustomEvent("ztf:progress", { detail: { percent: pct } }));
  }

  /* ---------- Récapitulatif ---------- */
  function fmtDate(iso) { if (!iso) return ""; return new Date(iso + "T00:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  function selText(name) { var s = el(name); return s && s.value && s.selectedIndex >= 0 ? s.options[s.selectedIndex].textContent : ""; }
  function lblOf(name) { var c = container(name), n = c && c.querySelector("[data-ztf-lbl]"); return n ? tr(n.getAttribute("data-i18n")) : ""; }
  function summary() {
    function v(n) { return fieldValue(n); }
    function np(n) { return el(NP[n]).checked ? tr("recap.np") : v(n); }
    function files(n) { return fileStore[n].map(function (f) { return f.name; }).join(", "); }
    function tel(code, n) { return v(n) ? el(code).value + " " + v(n) : ""; }
    var radio = function (n, prefix) { var r = radioVal(n); return r ? tr(prefix + r) : ""; };
    var g1 = [[tr("lbl.civility"), selText("civility")], [tr("lbl.last_name"), v("last_name")], [tr("lbl.first_name"), v("first_name")],
      [tr("lbl.nationality"), selText("nationality")], [tr("lbl.birth_date"), fmtDate(v("birth_date"))], [tr("lbl.city"), v("city")],
      [tr("lbl.phone"), tel("phone_code", "phone")], [tr("lbl.email"), v("email")]];
    if (isMinor()) g1.push([tr("lbl.guardian_relation"), selText("guardian_relation")], [tr("lbl.guardian_name"), v("guardian_name")],
      [tr("lbl.guardian_phone"), tel("guardian_phone_code", "guardian_phone")], [tr("lbl.guardian_email"), v("guardian_email")],
      [tr("guardian.title"), el("guardian_consent").checked ? tr("recap.yes") : ""]);
    var g2 = [];
    if (el("cycle")) g2.push([tr("lbl.cycle"), radio("cycle", "cycle.")]);
    g2.push([tr("lbl.subsystem"), radio("subsystem", "sub.")], [tr("lbl.institution_category"), selText("institution_category")],
      [tr("lbl.institution_subcategory"), selText("institution_subcategory")], [tr("lbl.institution_name"), v("institution_name")],
      [lblOf("field_of_study"), selText("field_of_study")], [lblOf("level"), selText("level")], [tr("lbl.average"), np("average")],
      [lblOf("ranking"), np("ranking")], [lblOf("cohort_size"), np("cohort_size")]);
    if (gceVisible()) { g2.push([tr("lbl.gce_exam"), selText("gce_exam")]); if (gceTaken()) g2.push([tr("lbl.gce_results"), v("gce_results")]); }
    return [
      { group: "1. " + tr("sec.identity"), items: g1 },
      { group: "2. " + tr("sec.academic"), items: g2 },
      { group: "3. " + tr("sec.attachments"), items: [[tr("lbl.idfile"), files("idfile")], [tr("lbl.transcripts"), files("transcripts")],
        [tr("lbl.otherfiles"), files("otherfiles")], [tr("lbl.additional_notes"), v("additional_notes")]] }
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
    var btns = $$('button[type="submit"]');
    btns.forEach(function (b) { b.dataset.busy = "1"; b.disabled = true; b.dataset.label = b.innerHTML; b.innerHTML = '<span class="ztf-spin"></span>' + esc(tr("btn.sending")); });
    setTimeout(function () {
      btns.forEach(function (b) { b.innerHTML = b.dataset.label; delete b.dataset.busy; });
      $$("[data-ztf-success-email]").forEach(function (n) { n.textContent = fieldValue("email"); });
      $$("[data-ztf-hide-on-success]").forEach(function (n) { n.hidden = true; });
      $$("[data-ztf-success]").forEach(function (n) { n.hidden = false; n.scrollIntoView({ behavior: "smooth", block: "start" }); });
      toast(tr("toast.sent"), tr("toast.sent.d"));
    }, 1100);
  }
  function reset() {
    form.reset(); Object.keys(fileStore).forEach(function (k) { fileStore[k] = []; renderFiles(k); });
    Object.keys(NP).forEach(onNP);
    updateCategories(); updateDependent(); updateGuardian();
    allNames().concat(["cycle", "subsystem"]).forEach(clearError);
    $$("[data-ztf-hide-on-success]").forEach(function (n) { n.hidden = false; });
    $$("[data-ztf-success]").forEach(function (n) { n.hidden = true; });
    refresh(); document.dispatchEvent(new CustomEvent("ztf:reset"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Démo : deux dossiers fictifs ---------- */
  function fakeFile(name) { try { return new File(["maquette"], name, { type: "application/pdf" }); } catch (e) { return { name: name, size: 8 }; } }
  function setRadio(n, v) { var e = el(n); if (e) e.value = v; }
  function fillDemo(kind) {
    form.reset(); Object.keys(NP).forEach(onNP);
    var pupil = kind !== "student";
    var p = pupil ? {
      civility: "M.", last_name: "Nfor", first_name: "Divine Kum", birth: "2009-05-02", city: "Bamenda", phone: "6 75 22 11 00", email: "grace.nfor@exemple.com",
      cycle: "secondary", sub: "anglophone", cat: "Enseignement secondaire général", subcat: "Établissement privé protestant (presbytérien, baptiste, EEC…)",
      school: "Presbyterian Secondary School Mankon (Bamenda)", fos: "Sciences", level: "Upper Sixth", avg: "17.1 / 20", rank: "1 / 64", cohort: "64",
      files: [["CNI_Nfor_Divine.pdf"], ["Report_card_Lower_Sixth_2025-2026.pdf", "GCE_O_Level_result_slip.pdf"], ["Olympiades_maths_2025.pdf"]],
      notes: "Lauréat des Olympiades nationales de mathématiques 2025 (catégorie lycée)."
    } : {
      civility: "Mlle", last_name: "Ngo Bayiha", first_name: "Esther", birth: "2006-03-14", city: "Yaoundé", phone: "6 77 12 34 56", email: "esther.ngobayiha@exemple.com",
      cycle: "higher", sub: "francophone", cat: "Universités d'État (facultés)", subcat: "Sciences", school: "Université de Yaoundé I",
      fos: "Mathématiques", level: "BAC+2", avg: "17.4 / 20", rank: "2 / 214", cohort: "214",
      files: [["CNI_Ngo_Bayiha.pdf"], ["Releve_L1_2025-2026.pdf", "Releve_L2_S1.pdf"], ["CV_Esther.pdf"]],
      notes: "Major de promotion en L1, lauréate des Olympiades nationales de mathématiques 2024."
    };
    el("civility").value = p.civility; el("last_name").value = p.last_name; el("first_name").value = p.first_name;
    el("nationality").value = "CM"; el("birth_date").value = p.birth; el("city").value = p.city;
    el("phone").value = p.phone; el("email").value = p.email;
    updateGuardian();
    if (pupil) {
      el("guardian_relation").value = "Mère"; el("guardian_name").value = "Nfor Grace Lum";
      el("guardian_phone").value = "6 75 22 11 00"; el("guardian_email").value = "grace.nfor@exemple.com"; el("guardian_consent").checked = true;
    }
    setRadio("cycle", p.cycle); setRadio("subsystem", p.sub); updateCategories();
    el("institution_category").value = p.cat; updateDependent();
    el("institution_subcategory").value = p.subcat; el("institution_name").value = p.school;
    el("level").value = p.level; el("field_of_study").value = p.fos; onLevel();
    el("average").value = p.avg; el("ranking").value = p.rank; el("cohort_size").value = p.cohort;
    if (pupil) { el("gce_exam").value = "GCE O Level"; updateDependent(); el("gce_results").value = "11 papers — 9 A (Maths, Add. Maths, Physics, Chemistry…), 2 B"; }
    ["idfile", "transcripts", "otherfiles"].forEach(function (n, i) { fileStore[n] = p.files[i].map(fakeFile); syncInput(n); renderFiles(n); });
    el("additional_notes").value = p.notes;
    el("cgu").checked = true;
    allNames().concat(["cycle", "subsystem"]).forEach(clearError);
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
      ".is-invalid input:not([type=checkbox]):not([type=radio]),.is-invalid select{border-color:var(--ztf-danger,#c0392b)!important}" +
      ".is-invalid .choice-opt{border-color:var(--ztf-danger,#c0392b)!important}" +
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

    form.addEventListener("change", function (e) {
      var n = e.target.name; if (!n) return;
      if (n === "institution_category") onCategory();
      else if (n === "cycle") { updateCategories(); onCategory(); }
      else if (n === "subsystem" || n === "gce_exam") updateDependent();
      else if (n === "level") onLevel();
      else if (n === "birth_date") updateGuardian();
      else if (n === "average_not_provided" || n === "ranking_not_provided" || n === "cohort_size_not_provided") onNP(n.replace("_not_provided", ""));
      else if (fileStore[n]) onFiles(n);
      clearError(n); refresh();
    });
    form.addEventListener("input", function (e) { var n = e.target.name; if (!n) return; if (n === "birth_date") updateGuardian(); clearError(n); refresh(); });
    form.addEventListener("submit", onSubmit);
    $$("[data-ztf-add-school]").forEach(function (b) { b.addEventListener("click", openAddSchool); });
    $$("[data-ztf-reset]").forEach(function (b) { b.addEventListener("click", reset); });
    $$("[data-ztf-lang]").forEach(function (b) { b.addEventListener("click", function () { applyLang(b.getAttribute("data-ztf-lang")); }); });

    var demo = document.createElement("div"); demo.className = "ztf-demo";
    demo.innerHTML = '<span data-i18n="demo.title"></span><button type="button" data-kind="pupil" data-i18n="demo.pupil"></button><button type="button" data-kind="student" data-i18n="demo.student"></button>';
    $$("button", demo).forEach(function (b) { b.addEventListener("click", function () { fillDemo(b.getAttribute("data-kind")); }); });
    document.body.appendChild(demo);

    applyLang(lang);
    updateGuardian();
  }

  window.ZTF = { validate: validate, refresh: refresh, summary: summary, renderRecap: renderRecap, fillDemo: fillDemo, toast: toast, tr: tr, lang: function () { return lang; }, setLang: applyLang };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
