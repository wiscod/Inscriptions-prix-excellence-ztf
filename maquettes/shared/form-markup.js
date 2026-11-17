/*
 * Balisage des champs, commun aux 5 maquettes : chaque maquette ne change que la mise en page (CSS).
 * Les textes sont posés par le moteur via data-i18n (texte), data-i18n-html (HTML), data-i18n-ph (placeholder).
 * Emplacements : [data-ztf-slot="lang|cycle|subsystem|identity|academic|attachments|consent"].
 * Le champ « cycle » (secondaire / supérieur) est facultatif : quand une maquette l'affiche,
 * il sert seulement à filtrer les catégories d'établissement.
 */
(function () {
  "use strict";
  var S = {};

  function T(key, tag, cls) { tag = tag || "span"; return "<" + tag + (cls ? ' class="' + cls + '"' : "") + ' data-i18n="' + key + '"></' + tag + ">"; }
  function label(name, key, req, extra) {
    return '<label for="f-' + name + '"><span data-ztf-lbl data-i18n="' + key + '"></span>' +
      (extra ? ' <span class="muted" data-i18n="' + extra + '"></span>' : "") + (req ? " <i>*</i>" : "") + "</label>";
  }
  function input(name, attrs) { return '<input id="f-' + name + '" name="' + name + '"' + (attrs || "") + ">"; }
  function select(name) { return '<select id="f-' + name + '" name="' + name + '"></select>'; }
  function field(name, inner, cls) { return '<div class="field' + (cls ? " " + cls : "") + '" data-field="' + name + '">' + inner + "</div>"; }
  function hint(key, attrs) { return '<p class="hint"' + (attrs || "") + ' data-i18n="' + key + '"></p>'; }
  function np(name, key) { return '<label class="np"><input type="checkbox" name="' + name + '"> ' + T(key) + "</label>"; }
  function phone(code, name, ph) {
    return '<div class="phone"><select name="' + code + '" data-i18n-aria="lbl.phone"></select>' +
      input(name, ' type="tel" inputmode="tel" autocomplete="tel-national" data-i18n-ph="' + ph + '"') + "</div>";
  }
  function choice(name, opts) {
    return '<div class="choice" role="radiogroup">' + opts.map(function (o) {
      return '<label class="choice-opt"><input type="radio" name="' + name + '" value="' + o + '"><span class="choice-t">' +
        T((name === "cycle" ? "cycle." : "sub.") + o, "b") + T((name === "cycle" ? "cycle." : "sub.") + o + ".d", "small") + "</span></label>";
    }).join("") + "</div>";
  }
  function drop(name, multiple, accept, req) {
    return '<div class="drop"><input id="f-' + name + '" name="' + name + '" type="file" accept="' + accept + '"' + (multiple ? " multiple" : "") + (req ? " required" : "") + ">" +
      '<span class="drop-ic" aria-hidden="true">⬆</span>' + T(multiple ? "drop.many" : "drop.one", "span", "drop-t") + T("drop.or", "span", "drop-s") + "</div>";
  }

  S.lang = '<div class="lang-switch" role="group" data-i18n-aria="lang.group"><button type="button" data-ztf-lang="fr" lang="fr">FR</button><button type="button" data-ztf-lang="en" lang="en">EN</button></div>';

  S.cycle = '<div class="field" data-field="cycle"><label>' + T("lbl.cycle") + " <i>*</i></label>" + choice("cycle", ["secondary", "higher"]) + "</div>";
  S.subsystem = '<div class="field" data-field="subsystem"><label>' + T("lbl.subsystem") + " <i>*</i></label>" + choice("subsystem", ["francophone", "anglophone"]) + "</div>";

  S.identity =
    '<div class="f-grid cols-3">' +
      field("civility", label("civility", "lbl.civility", 1) + select("civility")) +
      field("last_name", label("last_name", "lbl.last_name", 1) + input("last_name", ' autocomplete="family-name" data-i18n-ph="ph.last_name"')) +
      field("first_name", label("first_name", "lbl.first_name", 1) + input("first_name", ' autocomplete="given-name" data-i18n-ph="ph.first_name"')) +
    "</div>" +
    '<div class="f-grid cols-3">' +
      field("nationality", label("nationality", "lbl.nationality", 1) + select("nationality")) +
      field("birth_date", label("birth_date", "lbl.birth_date", 1) + input("birth_date", ' type="date"') + hint("hint.birth")) +
      field("city", label("city", "lbl.city", 1) + input("city", ' data-i18n-ph="ph.city"')) +
    "</div>" +
    '<div class="f-grid cols-2">' +
      field("phone", label("phone", "lbl.phone", 1) + phone("phone_code", "phone", "ph.phone")) +
      field("email", label("email", "lbl.email", 1) + input("email", ' type="email" autocomplete="email" data-i18n-ph="ph.email"') + hint("hint.email")) +
    "</div>" +
    '<div class="guardian" data-ztf-guardian hidden>' +
      '<div class="guardian-h">' + T("guardian.title", "strong") + T("guardian.note", "span") + "</div>" +
      '<div class="f-grid cols-2">' +
        field("guardian_relation", label("guardian_relation", "lbl.guardian_relation", 1) + select("guardian_relation")) +
        field("guardian_name", label("guardian_name", "lbl.guardian_name", 1) + input("guardian_name", ' data-i18n-ph="ph.guardian_name"')) +
      "</div>" +
      '<div class="f-grid cols-2">' +
        field("guardian_phone", label("guardian_phone", "lbl.guardian_phone", 1) + phone("guardian_phone_code", "guardian_phone", "ph.phone")) +
        field("guardian_email", label("guardian_email", "lbl.guardian_email", 0, "optional") + input("guardian_email", ' type="email" data-i18n-ph="ph.email"')) +
      "</div>" +
      field("guardian_consent", '<label class="np"><input type="checkbox" name="guardian_consent"> ' + T("lbl.guardian_consent") + "</label>", "consent") +
    "</div>";

  S.academic =
    '<p class="notice" data-i18n-html="notice.academic"></p>' +
    '<div class="f-grid cols-2">' +
      field("institution_category", label("institution_category", "lbl.institution_category", 1) + select("institution_category")) +
      field("institution_subcategory", label("institution_subcategory", "lbl.institution_subcategory", 1) + select("institution_subcategory")) +
    "</div>" +
    field("institution_name", label("institution_name", "lbl.institution_name", 1) + input("institution_name") +
      '<button type="button" class="link-btn" data-ztf-add-school data-i18n="btn.addSchool"></button>') +
    '<div class="f-grid cols-3">' +
      field("field_of_study", label("field_of_study", "lbl.fos", 1) + select("field_of_study")) +
      field("level", label("level", "lbl.level", 1) + select("level")) +
      field("average", '<label for="f-average"><span data-i18n="lbl.average"></span> <i data-ztf-avg-star>*</i></label>' +
        input("average", ' data-i18n-ph="ph.average"') + '<p class="hint" data-ztf-avg-hint data-i18n="hint.avg.higher"></p>' +
        '<span data-ztf-average-np hidden>' + np("average_not_provided", "np.average") + "</span>") +
    "</div>" +
    '<div class="f-grid cols-2">' +
      field("ranking", label("ranking", "lbl.rank.promo", 0, "np.hint") + input("ranking", ' data-i18n-ph="ph.ranking"') + np("ranking_not_provided", "np.ranking")) +
      field("cohort_size", label("cohort_size", "lbl.cohort.promo", 0, "np.hint") + input("cohort_size", ' inputmode="numeric" data-i18n-ph="ph.cohort"') + np("cohort_size_not_provided", "np.cohort")) +
    "</div>" +
    '<div class="gce" data-ztf-gce hidden>' +
      '<div class="gce-h">' + T("gce.title", "strong") + T("gce.note", "span") + "</div>" +
      '<div class="f-grid cols-2">' +
        field("gce_exam", label("gce_exam", "lbl.gce_exam", 1) + select("gce_exam")) +
        field("gce_results", label("gce_results", "lbl.gce_results", 1) + input("gce_results", ' data-i18n-ph="ph.gce_results"') + hint("hint.gce")) +
      "</div>" +
    "</div>";

  S.attachments =
    field("idfile", label("idfile", "lbl.idfile", 1) + drop("idfile", false, ".pdf,.png,.jpg,.jpeg", true) + hint("hint.idfile") + '<div data-ztf-filelist="idfile"></div>', "file-field") +
    field("transcripts", label("transcripts", "lbl.transcripts", 1, "lbl.transcripts.m") + hint("hint.transcripts") +
      drop("transcripts", true, ".pdf,.png,.jpg,.jpeg", true) + '<div data-ztf-filelist="transcripts"></div>', "file-field is-key") +
    field("diplomas", label("diplomas", "lbl.diplomas", 0, "lbl.diplomas.m") + hint("hint.diplomas") +
      drop("diplomas", true, ".pdf,.png,.jpg,.jpeg") + '<div data-ztf-filelist="diplomas"></div>', "file-field") +
    field("otherfiles", label("otherfiles", "lbl.otherfiles", 0, "lbl.otherfiles.m") +
      drop("otherfiles", true, ".pdf,.png,.jpg,.jpeg,.doc,.docx") + '<div data-ztf-filelist="otherfiles"></div>', "file-field") +
    field("additional_notes", label("additional_notes", "lbl.additional_notes") +
      '<textarea id="f-additional_notes" name="additional_notes" rows="4" data-i18n-ph="ph.additional_notes"></textarea>');

  S.consent =
    '<div class="field consent" data-field="cgu"><label class="np"><input type="checkbox" name="cgu"> <span data-i18n-html="cgu"></span></label></div>' +
    '<div class="captcha" data-ztf-captcha></div>' +
    '<button type="submit" class="submit" disabled><span data-i18n="btn.submit"></span></button>' +
    '<p class="foot-note" data-i18n="foot.required"></p>' +
    '<p class="foot-note" data-i18n-html="foot.problem"></p>' +
    '<p class="foot-note" data-i18n="foot.secure"></p>';

  function mount() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-ztf-slot]"), function (n) {
      var k = n.getAttribute("data-ztf-slot"); if (S[k]) n.innerHTML = S[k];
    });
  }
  window.ZTF_MARKUP = S;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
