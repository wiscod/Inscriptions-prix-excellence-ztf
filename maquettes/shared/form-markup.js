/*
 * Balisage des champs, commun à toutes les pages : chaque page ne change que la mise en page (CSS).
 * Les textes sont posés par le moteur via data-i18n (texte), data-i18n-html (HTML), data-i18n-ph (placeholder).
 * Emplacements : [data-ztf-slot="lang|lookup|cycle|identity|academic|attachments|consent|receipt"].
 * Le champ « cycle » (secondaire / supérieur) est facultatif : il ne sert qu'à filtrer les catégories d'établissement.
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
  function hint(key, html) { return '<p class="hint" ' + (html ? "data-i18n-html" : "data-i18n") + '="' + key + '"></p>'; }
  function drop(name, multiple, accept, req) {
    return '<div class="drop"><input id="f-' + name + '" name="' + name + '" type="file" accept="' + accept + '"' + (multiple ? " multiple" : "") + (req ? " required" : "") + ">" +
      '<span class="drop-ic" aria-hidden="true">⬆</span>' + T(multiple ? "drop.many" : "drop.one", "span", "drop-t") + T("drop.or", "span", "drop-s") + "</div>";
  }

  S.lang = '<div class="lang-switch" role="group" data-i18n-aria="lang.group"><button type="button" data-ztf-lang="fr" lang="fr">FR</button><button type="button" data-ztf-lang="en" lang="en">EN</button></div>';

  S.lookup =
    '<details class="lookup" data-ztf-lookup><summary data-i18n="lookup.title"></summary>' +
      '<div class="lookup-row"><label class="sr-only" for="ztf-lookup-code" data-i18n="lookup.label"></label>' +
      '<input id="ztf-lookup-code" autocomplete="off" autocapitalize="characters" spellcheck="false" data-i18n-ph="lookup.ph">' +
      '<button type="button" data-ztf-lookup-btn data-i18n="lookup.btn"></button></div>' +
      '<p class="lookup-msg" data-ztf-lookup-msg aria-live="polite"></p></details>';

  S.cycle = '<div class="field" data-field="cycle"><label>' + T("lbl.cycle") + ' <i>*</i></label><div class="choice" role="radiogroup">' +
    ["secondary", "higher"].map(function (o) {
      return '<label class="choice-opt"><input type="radio" name="cycle" value="' + o + '"><span class="choice-t">' + T("cycle." + o, "b") + T("cycle." + o + ".d", "small") + "</span></label>";
    }).join("") + "</div></div>";

  S.identity =
    '<div class="f-grid cols-3">' +
      field("gender", label("gender", "lbl.gender", 1) + select("gender")) +
      field("last_name", label("last_name", "lbl.last_name", 1) + input("last_name", ' autocomplete="family-name" data-i18n-ph="ph.last_name"')) +
      field("first_name", label("first_name", "lbl.first_name", 1) + input("first_name", ' autocomplete="given-name" data-i18n-ph="ph.first_name"')) +
    "</div>" +
    '<div class="f-grid cols-2">' +
      field("nationality", label("nationality", "lbl.nationality", 1) + select("nationality")) +
      field("birth_date", label("birth_date", "lbl.birth_date", 1) + input("birth_date", ' type="date"')) +
    "</div>" +
    '<div class="f-grid cols-2">' +
      field("phone", label("phone", "lbl.phone", 1) + '<div class="phone"><select name="phone_code" data-i18n-aria="lbl.phone"></select>' +
        input("phone", ' type="tel" inputmode="tel" autocomplete="tel-national" data-i18n-ph="ph.phone"') + "</div>" + hint("hint.phone")) +
      field("email", label("email", "lbl.email", 0, "optional") + input("email", ' type="email" autocomplete="email" data-i18n-ph="ph.email"')) +
    "</div>";

  S.academic =
    '<p class="notice" data-i18n-html="notice.academic"></p>' +
    '<div class="f-grid cols-2">' +
      field("institution_category", label("institution_category", "lbl.institution_category", 1) + select("institution_category")) +
      field("institution_name", label("institution_name", "lbl.institution_name", 1) + input("institution_name") +
        '<input type="hidden" name="school_id">' +
        '<button type="button" class="link-btn" data-ztf-add-school data-i18n="btn.addSchool"></button>' + hint("hint.school")) +
    "</div>" +
    '<div class="f-grid cols-3">' +
      field("level", label("level", "lbl.level", 1) + select("level")) +
      field("field_of_study", label("field_of_study", "lbl.fos", 1) + select("field_of_study")) +
      field("average", '<label for="f-average"><span data-i18n="lbl.average"></span> <i data-ztf-avg-star>*</i></label>' +
        input("average", ' data-i18n-ph="ph.average"') + hint("hint.avg") +
        '<span data-ztf-average-np hidden><label class="np"><input type="checkbox" name="average_not_provided"> ' + T("np.average") + "</label></span>") +
    "</div>";

  S.attachments =
    field("transcripts", label("transcripts", "lbl.transcripts", 1, "lbl.transcripts.m") + hint("hint.transcripts") +
      drop("transcripts", true, ".pdf,.png,.jpg,.jpeg", true) + hint("hint.compress", true) + '<div data-ztf-filelist="transcripts"></div>', "file-field is-key") +
    field("diplomas", label("diplomas", "lbl.diplomas", 0, "lbl.diplomas.m") +
      drop("diplomas", true, ".pdf,.png,.jpg,.jpeg") + '<div data-ztf-filelist="diplomas"></div>', "file-field") +
    field("otherfiles", label("otherfiles", "lbl.otherfiles", 0, "lbl.otherfiles.m") +
      drop("otherfiles", true, ".pdf,.png,.jpg,.jpeg") + '<div data-ztf-filelist="otherfiles"></div>', "file-field") +
    field("motivation", label("motivation", "lbl.motivation", 0, "optional") +
      '<textarea id="f-motivation" name="motivation" rows="5" maxlength="2000" data-i18n-ph="ph.motivation"></textarea>' +
      '<p class="hint counter" data-ztf-counter></p>');

  S.consent =
    '<div class="captcha" data-ztf-captcha></div>' +
    '<button type="submit" class="submit"><span data-i18n="btn.submit"></span></button>' +
    '<p class="foot-note" data-i18n="foot.required"></p>' +
    '<p class="foot-note" data-i18n-html="foot.support"></p>' +
    '<p class="foot-note" data-i18n="foot.secure"></p>';

  /* Bloc affiché après l'envoi : numéro, identifiant, fiche PDF à imprimer pour l'audition */
  S.receipt =
    '<div class="receipt">' +
      '<p><span data-i18n="success.id"></span> <strong data-ztf-success-id></strong></p>' +
      '<div class="receipt-code" data-ztf-code-box><p data-i18n="success.code"></p><p class="code" data-ztf-success-code></p><p class="hint" data-i18n="success.keep"></p></div>' +
      '<p class="receipt-warn" data-i18n="pdf.warning"></p>' +
      '<button type="button" class="receipt-pdf" data-ztf-pdf data-i18n="pdf.btn"></button>' +
    "</div>";

  function mount() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-ztf-slot]"), function (n) {
      var k = n.getAttribute("data-ztf-slot"); if (S[k]) n.innerHTML = S[k];
    });
  }
  window.ZTF_MARKUP = S;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
