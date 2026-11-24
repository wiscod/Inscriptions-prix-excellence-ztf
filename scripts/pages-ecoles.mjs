// Génère les pages de candidature par école (site/<école>/index.html, servies à /<école>/).
// Chaque page = site/index.html (affiche de gauche, formulaire, envoi réel) dont l'en-tête de droite
// est remplacé par celui de la maquette 2 « Bandeau photo » : logo de l'école et logo du prix,
// « CANDIDATURE <ÉCOLE> », date limite, audition, lieu, sur une photo de l'école.
// À relancer après toute modification de site/index.html :
//   node scripts/pages-ecoles.mjs
// Pour ajouter une école : une entrée dans SCHOOLS, ses images dans site/img/ecoles/
// (sources et licences dans maquettes/ecoles/img/SOURCES.md), ses noms dans site/js/ecole.js.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import "../maquettes/shared/ztf-lists.js";

const SCHOOLS = [
  {
    slug: "enspy", short: "ENSPY",
    // Identifiant dans la liste officielle (maquettes/shared/ztf-lists.js) : catégorie et école remplies d'office.
    schoolId: "ecole-nationale-superieure-polytechnique-de-yaounde-polytechnique",
    // Domaines d'études proposés : ceux de la liste officielle qui correspondent aux filières de l'école
    // (rubrique « Filières » de https://polytechnique.cm/, consultée le 24 novembre 2026) :
    // GC → génie civil ; GET → génie électrique, réseaux & télécom ; GI → informatique ; GIM → génie mécanique
    // (pas de « génie industriel » dans la liste officielle) ; MSP et MAI → mathématiques, physique ; MET → météorologie ;
    // programme Data Sciences et IA → intelligence artificielle ; Entreprenariat et management de l'innovation → entrepreneuriat.
    fields: ["CivilEngineering", "ElectricalEngineering", "NetworksAndTelecom", "ComputerScience", "MechanicalEngineering",
      "Mathematics", "Physics", "Meteorology", "ArtificialIntelligence", "Entrepreneurship"],
    title: "École nationale supérieure polytechnique de Yaoundé",
    logo: { src: "enspy-logo.jpg", alt: "Logo de l'ENSPY", i18n: "e.enspy.logo.alt" },
    photo: { src: "enspy-batiment.jpg", alt: "Bâtiment des salles de cours de l'ENSPY", credit: "Marcell NEMG, Wikimedia Commons, CC BY-SA 4.0" },
    names: ["e.enspy.name", "e.enspy.univ"],
  },
  {
    slug: "fmsb", short: "FMSB",
    schoolId: "faculte-de-medecine-et-des-sciences-biomedicales-de-luniversite-de-yaounde-i",
    // Filières : médecine générale, pharmacie, chirurgie dentaire (site officiel injoignable le 24/11/2026 ; sources
    // secondaires : infospratiques.cm, Cameroon Tribune). Pharmacie → « Pharmacologie », seul intitulé proche de la liste.
    fields: ["Medicine", "Pharmacology", "Dentistry", "BiomedicalSciences"],
    title: "Faculté de médecine et des sciences biomédicales de l'Université de Yaoundé I",
    logo: { src: "fmsb-logo.jpg", alt: "Blason de l'Université de Yaoundé I", i18n: "e.fmsb.logo.alt" },
    photo: { src: "fmsb-batiment.jpg", alt: "Cour intérieure de la Faculté de médecine et des sciences biomédicales", credit: "photo fournie par la Fondation (novembre 2026)", pos: "50% 45%" },
    names: ["e.fmsb.name", "e.fmsb.univ"],
  },
  {
    slug: "enset", short: "ENSET",
    schoolId: "enset-de-douala",
    // Filières : informatique industrielle, génie civil, génie électrique, génie mécanique, techniques administratives,
    // économiques et de gestion ; l'école forme des enseignants du technique (site officiel injoignable le 24/11/2026 ;
    // source secondaire : kamerpower.com, liste non datée).
    fields: ["PrimaryAndSecondaryEducation", "ComputerScience", "CivilEngineering", "ElectricalEngineering", "MechanicalEngineering",
      "Management", "Accounting", "Economics"],
    title: "École normale supérieure d'enseignement technique de l'Université de Douala",
    logo: { src: "enset-logo.jpg", alt: "Logo de l'Université de Douala", i18n: "e.enset.logo.alt" },
    photo: { src: "enset-batiment.jpg", alt: "Entrée du campus de l'Université de Douala", credit: "photo fournie par la Fondation (novembre 2026)", pos: "50% 30%" },
    names: ["e.enset.name", "e.enset.univ"],
  },
  {
    slug: "polytech-douala", short: "ENSPD",
    schoolId: "ecole-nationale-superieure-polytechnique-de-douala",
    // Départements (site officiel https://enspd-udo.cm/, consulté le 24/11/2026) : génie civil, physique, mécanique,
    // énergétique, des procédés, maritime et portuaire (→ logistique et transport), automobile et mécatronique
    // (→ électromécanique), QHSE industriel (→ science de l'environnement), électrique et systèmes intelligents
    // (→ génie électrique, contrôle et instrumentation), informatique et télécommunications.
    fields: ["CivilEngineering", "Physics", "MechanicalEngineering", "EnergyEngineering", "ProcessEngineering", "LogisticsAndTransport",
      "ElectromechanicalEngineering", "EnvironmentalScience", "ElectricalEngineering", "ControlAndInstrumentationEngineering",
      "ComputerScience", "NetworksAndTelecom"],
    title: "École nationale supérieure polytechnique de Douala",
    logo: { src: "polytech-douala-logo.jpg", alt: "Logo de l'ENSPD", i18n: "e.enspd.logo.alt" },
    photo: { src: "polytech-douala-batiment.jpg", alt: "Cour intérieure de l'ENSPD", credit: "site de l'ENSPD (enspd-udo.cm)", pos: "50% 45%" },
    names: ["e.enspd.name", "e.enspd.univ"],
  },
  {
    slug: "udm", short: "UdM",
    schoolId: "universite-des-montagnes-udm-bangante",
    // Facultés et filières (site officiel https://udm.aed-cm.org/, consulté le 24/11/2026) : médecine humaine, pharmacie,
    // médecine vétérinaire (absente de la liste → « Autre »), sciences médico-sanitaires et biomédicales, génie mécanique,
    // civil, électrique, biomédical, informatique-réseaux-télécommunications, génie logiciel.
    fields: ["Medicine", "Pharmacology", "BiomedicalSciences", "LaboratoryTechnician", "Nursing", "MechanicalEngineering",
      "CivilEngineering", "ElectricalEngineering", "BiomedicalEngineering", "NetworksAndTelecom", "ComputerScience"],
    title: "Université des Montagnes",
    logo: { src: "udm-logo.jpg", alt: "Logo de l'Université des Montagnes", i18n: "e.udm.logo.alt" },
    photo: { src: "udm-batiment.jpg", alt: "Bâtiment de cours de l'Université des Montagnes", credit: "photo fournie par la Fondation (novembre 2026)", pos: "50% 45%" },
    names: ["e.udm.name", "e.udm.city"],
  },
];

const root = new URL("../", import.meta.url);
const site = readFileSync(new URL("site/index.html", root), "utf8");
const pick = (re, what) => { const m = site.match(re); if (!m) throw new Error(what + " introuvable dans site/index.html"); return m[0]; };
const header = pick(/    <div class="head">[\s\S]*?<\/div>\n    <\/div>\n    <p class="dl"[^\n]*<\/p>\n/, "l'en-tête de droite");

for (const s of SCHOOLS) {
  if (!globalThis.ZTF_LISTS.schools.some((x) => x[0] === s.schoolId)) throw new Error(`${s.slug} : école ${s.schoolId} absente de la liste officielle`);
  const unknown = s.fields.filter((k) => !globalThis.ZTF_LISTS.fields.some((f) => f[0] === k));
  if (unknown.length) throw new Error(`${s.slug} : domaines absents de la liste officielle : ${unknown.join(", ")}`);
  const hero = `    <header class="hero">
      <div class="hero-bg"><!-- Photo : ${s.photo.credit} --><img src="/img/ecoles/${s.photo.src}" width="1600" height="1200"${s.photo.pos || s.photo.extraStyle ? ` style="${[s.photo.pos && `object-position:${s.photo.pos}`, s.photo.extraStyle].filter(Boolean).join(";")}"` : ""} alt="${s.photo.alt}"></div>
      <div class="hero-lang" data-ztf-slot="lang"></div>
      <div class="hero-in">
        <div class="medals">
          <figure class="medal school-logo"><img src="/img/ecoles/${s.logo.src}" width="480" height="480" alt="${s.logo.alt}" data-i18n-aria="${s.logo.i18n}"></figure>
          <figure class="medal prize"><img src="/img/ecoles/prix-provisoire.jpg" width="440" height="440" alt="Logo du prix (provisoire)" data-i18n-aria="e.prize.alt"></figure>
        </div>
        <h1 class="title"><span class="k" data-i18n="e.apply"></span> <span class="s" translate="no">${s.short}</span></h1>
        <p class="school-name">${s.names.map((k) => `<span data-i18n="${k}"></span>`).join(" · ")}</p>
        <div class="card"><ul class="facts">
          <li><span class="l" data-i18n="e.deadline"></span> <b class="v" data-i18n="e.deadline.v"></b></li>
          <li><span class="l" data-i18n="e.audition"></span> <span class="tbd" data-i18n="e.tbd"></span></li>
          <li><span class="l" data-i18n="e.venue"></span> <span class="tbd" data-i18n="e.tbd"></span></li>
        </ul></div>
      </div>
    </header>
`;
  let html = site
    // L'en-tête de l'école sort du formulaire (limité à 880 px) pour couvrir toute la largeur de la partie droite.
    .replace(header, "")
    .replace('  <main class="main">', '  <div class="right">\n' + hero + '  <main class="main">')
    .replace('  </main>\n', '  </main>\n  </div>\n')
    .replace(/<title>[^<]*<\/title>/, `<title>Candidature ${s.short} · Prix d'Excellence ZTF</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1Candidature au Prix d'Excellence académique Zacharias Tanee Fomum, 6e édition : page des candidats de ${/^[AEIOUÉÈ]/i.test(s.title) ? "l'" : "la "}${s.title} (${s.short}).`)
    .replace(/(href|src)="(css|js|img|shared)\//g, '$1="/$2/')
    .replace('<link rel="stylesheet" href="/css/affiche.css">', '<link rel="stylesheet" href="/css/affiche.css">\n<link rel="stylesheet" href="/css/ecole.css">')
    .replace('<script src="/js/affiche.js"></script>', '<script src="/js/affiche.js"></script>\n<script src="/js/ecole.js"></script>')
    .replace('<script src="/shared/form-data.js"></script>', `<script>window.ZTF_FIXED_SCHOOL = "${s.schoolId}"; window.ZTF_SCHOOL_FIELDS = ${JSON.stringify(s.fields)};</script>\n<script src="/shared/form-data.js"></script>`)
    .replace("<body>", `<body>\n<!-- Page ${s.short} : générée par scripts/pages-ecoles.mjs depuis site/index.html, ne pas modifier à la main. -->`);
  if (html.includes('class="head"') || !html.includes("/js/ecole.js") || !html.includes("/js/submit.js")) throw new Error("remplacement incomplet pour " + s.slug);
  mkdirSync(new URL(`site/${s.slug}/`, root), { recursive: true });
  writeFileSync(new URL(`site/${s.slug}/index.html`, root), html);
  console.log(`site/${s.slug}/index.html`);
}
