/*
 * Pages par école (/enspy, …) : textes de l'en-tête de droite (FR/EN).
 * À charger après js/affiche.js et avant shared/form-engine.js.
 * Audition et lieu ne sont pas encore connus : la page affiche « À préciser » (clé e.tbd)
 * tant que la Fondation ne les a pas communiqués.
 */
(function () {
  "use strict";
  var T = {
    "e.apply": ["Candidature", "Application"],
    "e.deadline": ["Date limite de candidature", "Application deadline"],
    "e.deadline.v": ["28 novembre 2026", "28 November 2026"],
    "e.audition": ["Audition", "Interview"],
    "e.venue": ["Lieu", "Venue"],
    "e.tbd": ["À préciser", "To be announced"],
    "e.prize.alt": ["Logo du prix (provisoire : trophée ZTF Excellence Awards)", "Award logo (provisional: ZTF Excellence Awards trophy)"],
    "e.enspy.name": ["École nationale supérieure polytechnique de Yaoundé", "National Advanced School of Engineering of Yaoundé"],
    "e.enspy.univ": ["Université de Yaoundé I", "The University of Yaoundé I"],
    "e.enspy.logo.alt": ["Logo de l'ENSPY", "ENSPY logo"],
    "e.fmsb.name": ["Faculté de médecine et des sciences biomédicales", "Faculty of Medicine and Biomedical Sciences"],
    "e.fmsb.univ": ["Université de Yaoundé I", "The University of Yaoundé I"],
    "e.fmsb.logo.alt": ["Blason de l'Université de Yaoundé I", "Coat of arms of the University of Yaoundé I"],
    "e.enset.name": ["École normale supérieure d'enseignement technique", "Advanced Teachers' Training College for Technical Education"],
    "e.enset.univ": ["Université de Douala", "The University of Douala"],
    "e.enset.logo.alt": ["Logo de l'Université de Douala", "University of Douala logo"],
    "e.enspd.name": ["École nationale supérieure polytechnique de Douala", "National Higher Polytechnic School of Douala"],
    "e.enspd.univ": ["Université de Douala", "The University of Douala"],
    "e.enspd.logo.alt": ["Logo de l'ENSPD", "ENSPD logo"],
    "e.udm.name": ["Université des Montagnes", "Université des Montagnes"],
    "e.udm.city": ["Bangangté", "Bangangté"],
    "e.udm.logo.alt": ["Logo de l'Université des Montagnes", "Université des Montagnes logo"]
  };
  window.ZTF_PAGE_I18N = window.ZTF_PAGE_I18N || {};
  Object.keys(T).forEach(function (k) { window.ZTF_PAGE_I18N[k] = T[k]; });
})();
