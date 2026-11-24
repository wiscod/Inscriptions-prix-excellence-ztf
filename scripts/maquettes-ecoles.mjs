// Génère les 5 maquettes de la page ENSPY (maquettes/ecoles/enspy/1-….html à 5-….html).
// Le formulaire de droite est recopié tel quel depuis site/index.html : seule la colonne
// de gauche change d'une maquette à l'autre. À relancer après une modification du formulaire :
//   node scripts/maquettes-ecoles.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const site = readFileSync(new URL("site/index.html", root), "utf8");
const main = site.match(/  <main class="main">[\s\S]*?<\/main>/)[0];
if (!main.includes("data-ztf-form")) throw new Error("formulaire introuvable dans site/index.html");

const IMG = "../img/";
const photos = {
  batiment: { src: "enspy-batiment.jpg", author: "Marcell NEMG", file: "Batiment-polytech-cmr.jpg", alt: "Bâtiment des salles de cours de l'ENSPY" },
  td: { src: "enspy-batiment-td.jpg", author: "Loic kana", file: "BatTdPolytech-Cmr.jpg", alt: "Bâtiment des travaux dirigés de l'ENSPY" },
};
const credit = (p) => `<p class="credit"><span data-i18n="e.photo"></span> : ${p.author}, <a href="https://commons.wikimedia.org/wiki/File:${p.file}" target="_blank" rel="noopener">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a></p>`;
const bg = (p) => `<div class="bg"><img src="${IMG}${p.src}" alt="${p.alt}"></div>`;

const medals = `<div class="medals">
        <figure class="medal school-logo"><img src="${IMG}enspy-logo.jpg" alt="Logo de l'ENSPY" data-i18n-aria="e.enspy.logo.alt"></figure>
        <figure class="medal prize"><img src="${IMG}prix-provisoire.jpg" alt="Logo du prix (provisoire)" data-i18n-aria="e.prize.alt"></figure>
      </div>`;
const title = `<h1 class="title"><span class="k" data-i18n="e.apply"></span><span class="s">ENSPY</span></h1>`;
const name = `<p class="school-name"><span data-i18n="e.enspy.name"></span> · <span data-i18n="e.enspy.univ"></span></p>`;
const TBD = `<span class="v"><span class="tbd" data-i18n="e.tbd"></span></span>`;
const rows = [
  ["e.deadline", `<span class="v" data-i18n="e.deadline.v"></span>`, "cal"],
  ["e.audition", TBD, "mic"],
  ["e.venue", TBD, "pin"],
];
const icons = {
  cal: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  mic: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>',
  pin: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
};
const facts = (withIcon, dot) => `<ul class="facts">
${rows.map(([k, v, ic]) => `        <li>${dot ? `<span class="dot">${icons[ic]}</span>` : withIcon ? icons[ic] : ""}<span class="l" data-i18n="${k}"></span>${v}</li>`).join("\n")}
      </ul>`;
const countdown = `<div class="cd" data-cd-open>
        <div class="countdown"><div><b data-cd="d">00</b><span data-i18n="a.cd.days"></span></div><div><b data-cd="h">00</b><span data-i18n="a.cd.hours"></span></div><div><b data-cd="m">00</b><span data-i18n="a.cd.min"></span></div></div>
        <p class="lbl" data-i18n="a.cd.left"></p>
      </div>`;

const variants = [
  { file: "1-croquis.html", name: "Croquis", aside: (p) => `<div class="school-in">
      ${bg(p)}
      ${medals}
      <div>${title}${name}</div>
      ${facts(false)}
      ${credit(p)}
    </div>`, photo: photos.batiment },
  { file: "2-vitrine.html", name: "Vitrine", aside: (p) => `<div class="school-in">
      ${bg(p)}
      <div class="card">
      ${medals}
      <div>${title}${name}</div>
      ${facts(false)}
      ${countdown}
      </div>
      ${credit(p)}
    </div>`, photo: photos.batiment },
  { file: "3-bandeau.html", name: "Bandeau", aside: (p) => `<div class="school-in">
      <div class="band"><img src="${IMG}${p.src}" alt="${p.alt}">${credit(p)}</div>
      ${medals}
      <div class="body">
      <div>${title}${name}</div>
      ${facts(false, true)}
      </div>
    </div>`, photo: photos.td },
  { file: "4-couleurs-ecole.html", name: "Couleurs de l'école", aside: (p) => `<div class="school-in">
      ${bg(p)}
      ${medals}
      <div>${title}${name}</div>
      ${facts(false)}
      ${credit(p)}
    </div>`, photo: photos.batiment },
  { file: "5-gala.html", name: "Gala", aside: (p) => `<div class="school-in">
      ${bg(p)}
      ${medals}
      <div>${title}${name}</div>
      <div class="ticket">${facts(true)}</div>
      ${countdown}
      ${credit(p)}
    </div>`, photo: photos.batiment, sparkle: true },
];

const scripts = site.match(/<script src="shared\/form-data\.js">[\s\S]*?<\/script>\n(?=<\/body>)/)[0]
  .replace(/src="shared\//g, 'src="../../shared/')
  .replace('<script src="js/affiche.js"></script>', '<script src="../../affiche/affiche.js"></script>\n<script src="../ecoles.js"></script>')
  .replace('<script src="js/submit.js"></script>\n', ""); // maquette : envoi simulé

mkdirSync(new URL("maquettes/ecoles/enspy/", root), { recursive: true });
variants.forEach((v, i) => {
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Candidature ENSPY · Prix ZTF · Maquette ${i + 1}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../affiche/affiche.css">
<link rel="stylesheet" href="../ecoles.css">
</head>
<body class="v${i + 1}">
<!-- Maquette ${i + 1} « ${v.name} » : générée par scripts/maquettes-ecoles.mjs, ne pas modifier à la main. -->
<div class="layout">
  <aside class="school${v.sparkle ? " sparkle" : ""}">
    ${v.aside(v.photo)}
  </aside>

${main}
</div>

${scripts}</body>
</html>
`;
  writeFileSync(new URL(`maquettes/ecoles/enspy/${v.file}`, root), html);
  console.log("maquettes/ecoles/enspy/" + v.file);
});
