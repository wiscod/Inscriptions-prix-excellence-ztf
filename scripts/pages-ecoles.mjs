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
    photo: { src: "enspy-batiment.jpg", alt: "Bâtiment des salles de cours de l'ENSPY", author: "Marcell NEMG", file: "Batiment-polytech-cmr.jpg" },
    names: ["e.enspy.name", "e.enspy.univ"],
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
      <div class="hero-bg"><!-- Photo : ${s.photo.author}, Wikimedia Commons (File:${s.photo.file}), CC BY-SA 4.0 --><img src="/img/ecoles/${s.photo.src}" width="1600" height="1200" alt="${s.photo.alt}"></div>
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
    .replace(/(<meta name="description" content=")[^"]*/, `$1Candidature au Prix d'Excellence académique Zacharias Tanee Fomum, 6e édition : page des candidats de l'${s.title} (${s.short}).`)
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
