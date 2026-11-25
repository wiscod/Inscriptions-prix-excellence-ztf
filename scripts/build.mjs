// Assemble le dossier publié `dist/` :
//   site/            → dist/            (formulaire réel, page d'administration)
//   maquettes/shared → dist/shared      (moteur du formulaire)
import { cpSync, mkdirSync, rmSync } from "node:fs";

// Pages par école : régénérées depuis site/index.html avant la copie.
await import("./pages-ecoles.mjs");

const out = new URL("../dist/", import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(new URL("../site/", import.meta.url), out, { recursive: true });
cpSync(new URL("../maquettes/shared/", import.meta.url), new URL("shared/", out), { recursive: true });
// Images AVIF/WebP, adresses versionnées (?v=…) pour le cache long, version du service worker.
await import("./optimise-dist.mjs");
console.log("dist/ prêt");
