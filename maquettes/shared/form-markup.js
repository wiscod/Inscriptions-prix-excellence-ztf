/*
 * Balisage des champs (identique dans les 5 maquettes).
 * Libellés, ordre, champs obligatoires, aides et formats repris du formulaire de référence
 * https://africaexcellenceawards.org/candidature — chaque maquette ne change que la mise en page (CSS).
 * Insère le HTML dans les éléments [data-ztf-slot="identity|academic|attachments|consent"].
 */
(function () {
  "use strict";
  var S = {};

  S.identity =
    '<div class="f-grid cols-3">' +
      '<div class="field" data-field="civility"><label for="f-civility">Civilité <i>*</i></label><select id="f-civility" name="civility" required></select></div>' +
      '<div class="field" data-field="last_name"><label for="f-last_name">Nom <i>*</i></label><input id="f-last_name" name="last_name" placeholder="Ex : Mbarga" autocomplete="family-name" required></div>' +
      '<div class="field" data-field="first_name"><label for="f-first_name">Prénom <i>*</i></label><input id="f-first_name" name="first_name" placeholder="Ex : Jean" autocomplete="given-name" required></div>' +
    '</div>' +
    '<div class="f-grid cols-3">' +
      '<div class="field" data-field="nationality"><label for="f-nationality">Nationalité <i>*</i></label><select id="f-nationality" name="nationality" required></select></div>' +
      '<div class="field" data-field="birth_date"><label for="f-birth_date">Date de naissance <i>*</i></label><input id="f-birth_date" name="birth_date" type="date" required></div>' +
      '<div class="field" data-field="city"><label for="f-city">Ville de résidence <i>*</i></label><input id="f-city" name="city" placeholder="Rechercher une ville..." required></div>' +
    '</div>' +
    '<div class="f-grid cols-2">' +
      '<div class="field" data-field="phone"><label for="f-phone">Téléphone <i>*</i></label><div class="phone"><select name="phone_code" aria-label="Indicatif"></select><input id="f-phone" name="phone" type="tel" inputmode="numeric" placeholder="Ex : 6 70 00 00 00" autocomplete="tel-national" required></div></div>' +
      '<div class="field" data-field="email"><label for="f-email">Adresse électronique <i>*</i></label><input id="f-email" name="email" type="email" placeholder="votre.email@exemple.com" autocomplete="email" required></div>' +
    '</div>';

  S.academic =
    '<p class="notice">Les résultats demandés sont ceux de l\'année scolaire <strong data-ztf-year></strong>. Seuls les relevés de notes issus d\'établissements du <strong>système éducatif camerounais</strong> sont acceptés.</p>' +
    '<div class="f-grid cols-2">' +
      '<div class="field" data-field="institution_category"><label for="f-icat">Établissement (catégorie) <i>*</i></label><select id="f-icat" name="institution_category" required></select></div>' +
      '<div class="field" data-field="institution_subcategory"><label for="f-isub">Établissement (sous-catégorie) <i>*</i></label><select id="f-isub" name="institution_subcategory" required></select></div>' +
    '</div>' +
    '<div class="field" data-field="institution_name"><label for="f-iname">Établissement (nom) <i>*</i></label><input id="f-iname" name="institution_name" placeholder="Choisissez d\'abord une catégorie" required>' +
      '<button type="button" class="link-btn" data-ztf-add-school>+ Mon établissement n\'est pas dans la liste</button></div>' +
    '<div class="f-grid cols-3">' +
      '<div class="field" data-field="field_of_study"><label for="f-fos">Domaine d\'études <i>*</i></label><select id="f-fos" name="field_of_study" required></select></div>' +
      '<div class="field" data-field="level"><label for="f-level">Niveau <i>*</i></label><select id="f-level" name="level" required></select></div>' +
      '<div class="field" data-field="average"><label for="f-average">Moyenne <i data-ztf-avg-star>*</i></label><input id="f-average" name="average" placeholder="Ex : 16.2 / 20" required>' +
        '<label class="np" data-ztf-average-np hidden><input type="checkbox" name="average_not_provided"> Je n\'ai pas de notes / moyenne</label></div>' +
    '</div>' +
    '<div class="f-grid cols-2">' +
      '<div class="field" data-field="ranking"><label for="f-ranking">Classement dans la promotion <span class="muted">(ou cochez « Non communiqué »)</span></label><input id="f-ranking" name="ranking" placeholder="Ex : 3 / 120">' +
        '<label class="np"><input type="checkbox" name="ranking_not_provided"> Non communiqué sur le relevé de notes</label></div>' +
      '<div class="field" data-field="cohort_size"><label for="f-cohort">Taille de la promotion <span class="muted">(ou cochez « Non communiqué »)</span></label><input id="f-cohort" name="cohort_size" inputmode="numeric" placeholder="Ex : 120">' +
        '<label class="np"><input type="checkbox" name="cohort_size_not_provided"> Non communiqué</label></div>' +
    '</div>';

  S.attachments =
    '<div class="field file-field" data-field="idfile"><label for="f-idfile">Pièce d\'identité (Passeport ou CNI) <i>*</i></label>' +
      '<div class="drop"><input id="f-idfile" name="idfile" type="file" accept=".pdf,.png,.jpg,.jpeg" required><span class="drop-ic" aria-hidden="true">⬆</span><span class="drop-t">Choisir un fichier</span><span class="drop-s">ou glissez-déposez ici</span></div>' +
      '<p class="hint">Formats acceptés : PDF, PNG, JPG.</p><div data-ztf-filelist="idfile"></div></div>' +
    '<div class="field file-field" data-field="transcripts"><label for="f-transcripts">Diplômes et relevés de notes (<span data-ztf-year></span>) <i>*</i> <span class="muted">(avec classement si possible)</span></label>' +
      '<p class="hint">Seuls les bulletins / relevés de notes du système éducatif camerounais sont acceptés.</p>' +
      '<div class="drop"><input id="f-transcripts" name="transcripts" type="file" accept=".pdf,.png,.jpg,.jpeg" multiple required><span class="drop-ic" aria-hidden="true">⬆</span><span class="drop-t">Choisir un ou plusieurs fichiers</span><span class="drop-s">ou glissez-déposez ici</span></div>' +
      '<div data-ztf-filelist="transcripts"></div></div>' +
    '<div class="field file-field" data-field="otherfiles"><label for="f-otherfiles">Tout document utile complémentaire <span class="muted">(optionnel : CV, Lettre de motivation, etc.)</span></label>' +
      '<div class="drop"><input id="f-otherfiles" name="otherfiles" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" multiple><span class="drop-ic" aria-hidden="true">⬆</span><span class="drop-t">Choisir un ou plusieurs fichiers</span><span class="drop-s">ou glissez-déposez ici</span></div>' +
      '<div data-ztf-filelist="otherfiles"></div></div>' +
    '<div class="field" data-field="additional_notes"><label for="f-notes">Informations complémentaires (optionnel)</label>' +
      '<textarea id="f-notes" name="additional_notes" rows="4" placeholder="Ajoutez ici toute précision utile."></textarea></div>';

  S.consent =
    '<div class="field consent" data-field="cgu"><label class="np"><input type="checkbox" name="cgu"> <span>J\'accepte les <a href="#cgu">Conditions Générales d’Utilisation</a> et la <a href="#confidentialite">Politique de Confidentialité</a>.</span></label></div>' +
    '<div class="captcha" data-ztf-captcha></div>' +
    '<button type="submit" class="submit" disabled>Envoyer ma candidature</button>' +
    '<p class="foot-note">* Champs obligatoires. Les pièces jointes sont requises selon le formulaire du Prix ZTF.</p>' +
    '<p class="foot-note">En cas de problème avec le formulaire, vous pouvez envoyer votre dossier complet à <a data-ztf-contact></a>.</p>' +
    '<p class="foot-note">Les fichiers sont transmis de manière sécurisée via notre serveur.</p>';

  function mount() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-ztf-slot]"), function (n) {
      var k = n.getAttribute("data-ztf-slot"); if (S[k]) n.innerHTML = S[k];
    });
  }
  window.ZTF_MARKUP = S;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
