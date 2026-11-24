// Génère les 5 maquettes de la page ENSPY (maquettes/ecoles/enspy/1-….html à 5-….html).
// Tout vient de site/index.html : l'affiche de gauche et le formulaire sont recopiés tels quels.
// Seul l'en-tête de la partie droite (« Prix d'Excellence… » et le bandeau « Postuler jusqu'au… »)
// est remplacé par le bloc du croquis : logo de l'école et logo du prix côte à côte,
// « CANDIDATURE ENSPY », date limite, audition, lieu, sur une photo de l'école.
// À relancer après une modification de site/index.html :
//   node scripts/maquettes-ecoles.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const site = readFileSync(new URL("site/index.html", root), "utf8");
const pick = (re, what) => { const m = site.match(re); if (!m) throw new Error(what + " introuvable dans site/index.html"); return m[0]; };

const style = pick(/<style>[\s\S]*?<\/style>/, "<style>");
const aside = pick(/  <aside class="poster[\s\S]*?<\/aside>/, "l'affiche de gauche").replace('src="img/', 'src="../../affiche/img/');
const header = pick(/    <div class="head">[\s\S]*?<\/div>\n    <\/div>\n    <p class="dl"[^\n]*<\/p>\n/, "l'en-tête de droite");
const main = pick(/  <main class="main">[\s\S]*?<\/main>/, "le formulaire");
if (!main.includes("data-ztf-form")) throw new Error("formulaire introuvable");
const scripts = pick(/<script src="shared\/form-data\.js">[\s\S]*?<\/script>\n(?=<\/body>)/, "les scripts")
  .replace(/src="shared\//g, 'src="../../shared/')
  .replace('<script src="js/affiche.js"></script>', '<script src="../../affiche/affiche.js"></script>\n<script src="../ecoles.js"></script>')
  .replace('<script src="js/submit.js"></script>\n', ""); // maquette : envoi simulé

const IMG = "../img/";
const photos = {
  batiment: { src: "enspy-batiment.jpg", author: "Marcell NEMG", file: "Batiment-polytech-cmr.jpg", alt: "Bâtiment des salles de cours de l'ENSPY" },
  td: { src: "enspy-batiment-td.jpg", author: "Loic kana", file: "BatTdPolytech-Cmr.jpg", alt: "Bâtiment des travaux dirigés de l'ENSPY" },
};
const credit = (p) => `<p class="credit"><span data-i18n="e.photo"></span> : ${p.author}, <a href="https://commons.wikimedia.org/wiki/File:${p.file}" target="_blank" rel="noopener">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a></p>`;
const medals = `<div class="medals">
          <figure class="medal school-logo"><img src="${IMG}enspy-logo.jpg" alt="Logo de l'ENSPY" data-i18n-aria="e.enspy.logo.alt"></figure>
          <figure class="medal prize"><img src="${IMG}prix-provisoire.jpg" alt="Logo du prix (provisoire)" data-i18n-aria="e.prize.alt"></figure>
        </div>`;
const title = `<h1 class="title"><span class="k" data-i18n="e.apply"></span> <span class="s">ENSPY</span></h1>`;
const name = `<p class="school-name"><span data-i18n="e.enspy.name"></span> · <span data-i18n="e.enspy.univ"></span></p>`;
const TBD = `<span class="tbd" data-i18n="e.tbd"></span>`;
const facts = `<ul class="facts">
          <li><span class="l" data-i18n="e.deadline"></span> <b class="v" data-i18n="e.deadline.v"></b></li>
          <li><span class="l" data-i18n="e.audition"></span> ${TBD}</li>
          <li><span class="l" data-i18n="e.venue"></span> ${TBD}</li>
        </ul>`;

// Chaque variante : ordre des blocs dans l'en-tête + photo utilisée.
const variants = [
  { file: "1-croquis.html", name: "Croquis", photo: photos.batiment,
    body: () => `${medals}\n        ${title}\n        ${name}\n        ${facts}` },
  { file: "2-bandeau-photo.html", name: "Bandeau photo", photo: photos.batiment,
    body: () => `${medals}\n        ${title}\n        ${name}\n        <div class="card">${facts}</div>` },
  { file: "3-photo-en-haut.html", name: "Photo en haut", photo: photos.td,
    body: () => `${medals}\n        ${title}\n        ${name}\n        ${facts}` },
  { file: "4-couleurs-ecole.html", name: "Couleurs de l'école", photo: photos.batiment,
    body: () => `${medals}\n        <div class="txt">${title}\n        ${name}\n        ${facts}</div>` },
  { file: "5-gala.html", name: "Gala", photo: photos.batiment,
    body: () => `${medals}\n        ${title}\n        ${name}\n        <div class="ticket">${facts}</div>` },
];

mkdirSync(new URL("maquettes/ecoles/enspy/", root), { recursive: true });
variants.forEach((v, i) => {
  const hero = `    <header class="hero">
      <div class="hero-bg"><img src="${IMG}${v.photo.src}" alt="${v.photo.alt}"></div>
      <div class="hero-lang" data-ztf-slot="lang"></div>
      <div class="hero-in">
        ${v.body()}
      </div>
      ${credit(v.photo)}
    </header>
`;
  const right = main.replace(header, hero);
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Candidature ENSPY · Prix ZTF · Maquette ${i + 1}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../affiche/affiche.css">
${style}
<link rel="stylesheet" href="../ecoles.css">
</head>
<body class="v${i + 1}">
<!-- Maquette ${i + 1} « ${v.name} » : générée par scripts/maquettes-ecoles.mjs depuis site/index.html, ne pas modifier à la main. -->
<div class="layout">
${aside}

${right}
</div>

${scripts}</body>
</html>
`;
  writeFileSync(new URL(`maquettes/ecoles/enspy/${v.file}`, root), html);
  console.log("maquettes/ecoles/enspy/" + v.file);
});
