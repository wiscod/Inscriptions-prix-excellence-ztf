// Génère les pages de candidature par école (site/<école>/index.html, servies à /<école>/).
// Chaque page = site/index.html (affiche de gauche, formulaire, envoi réel) dont l'en-tête de droite
// est remplacé par celui de la maquette 2 « Bandeau photo » : logo de l'école et logo du prix,
// « CANDIDATURE <ÉCOLE> », date limite, audition, lieu, sur une photo de l'école.
// À relancer après toute modification de site/index.html :
//   node scripts/pages-ecoles.mjs
// Pour ajouter une école : une entrée dans SCHOOLS, ses images dans site/img/ecoles/
// (sources et licences dans maquettes/ecoles/img/SOURCES.md), ses noms dans site/js/ecole.js.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SCHOOLS = [
  {
    slug: "enspy", short: "ENSPY",
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
  const hero = `    <header class="hero">
      <div class="hero-bg"><img src="/img/ecoles/${s.photo.src}" alt="${s.photo.alt}"></div>
      <div class="hero-lang" data-ztf-slot="lang"></div>
      <div class="hero-in">
        <div class="medals">
          <figure class="medal school-logo"><img src="/img/ecoles/${s.logo.src}" alt="${s.logo.alt}" data-i18n-aria="${s.logo.i18n}"></figure>
          <figure class="medal prize"><img src="/img/ecoles/prix-provisoire.jpg" alt="Logo du prix (provisoire)" data-i18n-aria="e.prize.alt"></figure>
        </div>
        <h1 class="title"><span class="k" data-i18n="e.apply"></span> <span class="s">${s.short}</span></h1>
        <p class="school-name">${s.names.map((k) => `<span data-i18n="${k}"></span>`).join(" · ")}</p>
        <div class="card"><ul class="facts">
          <li><span class="l" data-i18n="e.deadline"></span> <b class="v" data-i18n="e.deadline.v"></b></li>
          <li><span class="l" data-i18n="e.audition"></span> <span class="tbd" data-i18n="e.tbd"></span></li>
          <li><span class="l" data-i18n="e.venue"></span> <span class="tbd" data-i18n="e.tbd"></span></li>
        </ul></div>
      </div>
      <p class="credit"><span data-i18n="e.photo"></span> : ${s.photo.author}, <a href="https://commons.wikimedia.org/wiki/File:${s.photo.file}" target="_blank" rel="noopener">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a></p>
    </header>
`;
  let html = site
    .replace(header, hero)
    .replace(/<title>[^<]*<\/title>/, `<title>Candidature ${s.short} · Prix d'Excellence ZTF</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1Candidature au Prix d'Excellence académique Zacharias Tanee Fomum, 6e édition : page des candidats de l'${s.title} (${s.short}).`)
    .replace(/(href|src)="(css|js|img|shared)\//g, '$1="/$2/')
    .replace('<link rel="stylesheet" href="/css/affiche.css">', '<link rel="stylesheet" href="/css/affiche.css">\n<link rel="stylesheet" href="/css/ecole.css">')
    .replace('<script src="/js/affiche.js"></script>', '<script src="/js/affiche.js"></script>\n<script src="/js/ecole.js"></script>')
    .replace("<body>", `<body>\n<!-- Page ${s.short} : générée par scripts/pages-ecoles.mjs depuis site/index.html, ne pas modifier à la main. -->`);
  if (html.includes('class="head"') || !html.includes("/js/ecole.js") || !html.includes("/js/submit.js")) throw new Error("remplacement incomplet pour " + s.slug);
  mkdirSync(new URL(`site/${s.slug}/`, root), { recursive: true });
  writeFileSync(new URL(`site/${s.slug}/index.html`, root), html);
  console.log(`site/${s.slug}/index.html`);
}
