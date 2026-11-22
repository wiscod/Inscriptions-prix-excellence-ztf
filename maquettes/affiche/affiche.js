/*
 * Éléments communs à la série « affiche » : textes de l'événement (FR/EN) et compte à rebours
 * jusqu'à la date limite de l'affiche (25 novembre 2026, fin de journée à Yaoundé, UTC+1).
 * À charger avant shared/form-engine.js (il complète window.ZTF_PAGE_I18N).
 */
(function () {
  "use strict";
  var DEADLINE = new Date("2026-11-25T23:59:59+01:00").getTime();
  var T = {
    "a.edition": ["6e édition", "6th edition"],
    "a.seminar": ["Séminaire sur l'excellence académique · Acte IX", "Seminar on academic excellence · Act IX"],
    "a.apply": ["Candidature", "Application"],
    "a.until": ["Postuler jusqu'au", "Apply by"],
    "a.until.date": ["25 Nov 2026", "25 Nov 2026"],
    "a.date": ["12 déc.", "12 Dec"], "a.year": ["2026", "2026"],
    "a.time": ["08h00", "8:00 am"], "a.city": ["Yaoundé", "Yaoundé"],
    "a.venue": ["Palais des Sports", "Palais des Sports"],
    "a.cd.days": ["jours", "days"], "a.cd.hours": ["heures", "hours"], "a.cd.min": ["min", "min"], "a.cd.sec": ["s", "s"],
    "a.cd.left": ["avant la clôture des candidatures", "until applications close"],
    "a.cd.closed": ["Candidatures closes", "Applications closed"],
    "a.note.title": ["Note importante à tout élève et étudiant", "Important note to every pupil and student"],
    "a.note.1": ["Aucune porte n'est fermée à un étudiant véritablement excellent !", "No door is closed to a truly excellent student!"],
    "a.note.2": ["Qu'il s'agisse d'une bourse d'études, d'un emploi ou de toute autre opportunité, un étudiant véritablement excellent est toujours recherché.", "Whether it is a scholarship, a job or any other opportunity, a truly excellent student is always in demand."],
    "a.note.3": ["Ton véritable besoin, c'est d'être excellent. Exceptionnellement excellent !", "What you truly need is to be excellent. Exceptionally excellent!"],
    "a.note.4": ["Tu n'es pas condamné à rester un étudiant ordinaire : tu peux devenir extraordinairement excellent.", "You are not condemned to remain an ordinary student: you can become extraordinarily excellent."],
    "a.prog": ["Au programme", "On the programme"],
    "a.prog.1": ["Présentations détaillées de modèles d'excellence", "Detailed presentations of role models of excellence"],
    "a.prog.2": ["Parcours d'étudiants passés de la médiocrité à une excellence exceptionnelle", "Journeys of students who went from mediocrity to exceptional excellence"],
    "a.prog.3": ["Partage d'expériences d'étudiants exceptionnellement excellents", "Experiences shared by exceptionally excellent students"],
    "a.prog.4": ["Remise de nombreux Prix d'Excellence", "Many Excellence Awards presented"],
    "a.speakers": ["Par des profils issus de grandes universités : Cameroun, Zimbabwe, France, Canada, Italie, Afrique du Sud, Suisse, Allemagne et d'ailleurs.", "With speakers from major universities: Cameroon, Zimbabwe, France, Canada, Italy, South Africa, Switzerland, Germany and beyond."],
    "a.cta": ["Tu veux passer de la médiocrité à l'excellence ? Réserve ta place maintenant.", "Want to go from mediocrity to excellence? Book your place now."],
    "a.cat.title": ["Catégories des prix et conditions d'accès", "Award categories and eligibility"],
    "a.cat.col1": ["Catégories", "Categories"], "a.cat.col2": ["Conditions d'accès", "Eligibility"],
    "a.cat.this": ["ce formulaire", "this form"],
    "a.cat.1": ["Prix d'Excellence académique", "Academic Excellence Award"], "a.cat.1c": ["Avoir eu un résultat excellent au cours de l'année académique précédente", "An excellent result in the previous academic year"],
    "a.cat.2": ["Prix d'Excellence pour chercheurs", "Excellence Award for researchers"], "a.cat.2c": ["Productions scientifiques", "Scientific output"],
    "a.cat.3": ["Prix d'Excellence d'innovation", "Innovation Excellence Award"], "a.cat.3c": ["Invention d'envergure nationale et internationale", "An invention of national and international scope"],
    "a.cat.4": ["Prix d'Excellence entrepreneurial", "Entrepreneurship Excellence Award"], "a.cat.4c": ["Start-up, micro ou macro entreprise", "Start-up, micro or macro business"],
    "a.cat.5": ["Prix d'Excellence des meilleurs établissements ou institutions", "Excellence Award for the best schools or institutions"], "a.cat.5c": ["Productions d'excellence", "Outstanding output"],
    "a.cat.6": ["Prix d'encouragement", "Encouragement Award"], "a.cat.6c": ["Bonne moyenne académique", "A good academic average"],
    "a.cat.7": ["Prix d'Excellence pour personnes handicapées", "Excellence Award for people with disabilities"], "a.cat.7c": ["", ""],
    "a.founder": ["Pr Zacharias Tanee Fomum", "Prof. Zacharias Tanee Fomum"],
    "a.founder.q": ["Exceller dans le faire et dans l'être.", "Excellence in doing and in being."],
    "a.phones": ["+237 641 25 24 81 / 651 27 62 63", "+237 641 25 24 81 / 651 27 62 63"],
    "a.social": ["Prix d'excellence ZTF sur Facebook, Instagram, X, YouTube, WhatsApp et TikTok", "ZTF Excellence Award on Facebook, Instagram, X, YouTube, WhatsApp and TikTok"],
    "a.mock": ["Maquette inspirée des affiches officielles", "Mock-up based on the official posters"]
  };
  window.ZTF_PAGE_I18N = window.ZTF_PAGE_I18N || {};
  Object.keys(T).forEach(function (k) { if (!window.ZTF_PAGE_I18N[k]) window.ZTF_PAGE_I18N[k] = T[k]; });

  function tick() {
    var left = Math.max(0, DEADLINE - Date.now()), s = Math.floor(left / 1000);
    var parts = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
    Array.prototype.forEach.call(document.querySelectorAll("[data-cd]"), function (n) {
      var v = parts[n.getAttribute("data-cd")]; n.textContent = v < 10 ? "0" + v : String(v);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-cd-open]"), function (n) { n.hidden = !left; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-cd-closed]"), function (n) { n.hidden = !!left; });
  }
  document.addEventListener("DOMContentLoaded", function () { tick(); setInterval(tick, 1000); });
})();
