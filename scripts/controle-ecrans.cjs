// Contrôle visuel du site à plusieurs largeurs d'écran (téléphone → grand écran).
// Assemble dist/, sert le site en local, ouvre chaque page à chaque largeur, prend une capture
// et signale ce qu'on ne voit pas en ne testant qu'une seule taille :
//   - défilement horizontal (un élément dépasse de l'écran) ;
//   - bandeau ou affiche qui s'arrête avant le bord de sa colonne (bande vide à droite sur grand écran) ;
//   - image cassée ou déformée ;
//   - sur téléphone : champ de formulaire écrit sous 16 px (iOS zoome), cible tactile sous 24 px (WCAG 2.5.8) ;
//   - erreur JavaScript.
// Usage : npm run controle            (captures dans .controle-ecrans/, ignoré par git)
//         node scripts/controle-ecrans.cjs /enspy/   (une seule page)
// Nécessite Playwright et Chromium (préinstallés dans les sessions Claude Code ; sinon : npx playwright install chromium).
const { chromium, devices } = require("playwright");
const { execFileSync } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const out = path.join(root, ".controle-ecrans");

const SCREENS = [
  { name: "telephone-390", device: devices["iPhone 13"], mobile: true },
  { name: "tablette-768", device: devices["iPad Mini"], mobile: true },
  { name: "portable-1280", viewport: { width: 1280, height: 800 } },
  { name: "ordinateur-1440", viewport: { width: 1440, height: 900 } },
  { name: "grand-ecran-1920", viewport: { width: 1920, height: 1080 } },
];
// Éléments qui doivent toucher les bords de leur colonne (bandeaux, affiche).
const FULL_BLEED = [".hero", ".poster"];

execFileSync(process.execPath, [path.join(__dirname, "build.mjs")], { stdio: "ignore" });

// Pages : l'accueil et chaque page d'école (site/<école>/index.html), sauf l'administration.
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ["/"].concat(
  fs.readdirSync(path.join(root, "site"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "admin" && fs.existsSync(path.join(root, "site", d.name, "index.html")))
    .map((d) => "/" + d.name + "/"));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  let f = path.join(dist, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(dist)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];

  for (const url of pages) {
    for (const s of SCREENS) {
      const ctx = await browser.newContext(s.device || { viewport: s.viewport });
      const page = await ctx.newPage();
      const where = `${url} @ ${s.name}`;
      page.on("pageerror", (e) => problems.push(`${where} : erreur JavaScript : ${e.message}`));
      page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(base)) problems.push(`${where} : ${r.status()} sur ${r.url().slice(base.length)}`); });
      await page.goto(base + url, { waitUntil: "load" });
      await page.waitForTimeout(400);

      const found = await page.evaluate(({ fullBleed, mobile }) => {
        const p = [];
        const vw = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > vw + 1) {
          const wide = [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > vw + 1 && getComputedStyle(e).position !== "fixed")
            .slice(0, 3).map((e) => e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : ""));
          p.push(`défilement horizontal : la page fait ${document.documentElement.scrollWidth} px pour ${vw} px d'écran (${wide.join(", ")})`);
        }
        fullBleed.forEach((sel) => document.querySelectorAll(sel).forEach((e) => {
          const col = e.closest(".layout > *") || document.body, a = e.getBoundingClientRect(), b = col.getBoundingClientRect();
          if (a.width && (Math.abs(a.left - b.left) > 1 || Math.abs(a.right - b.right) > 1))
            p.push(`${sel} ne touche pas les bords de sa colonne (${Math.round(a.left)}–${Math.round(a.right)} px pour ${Math.round(b.left)}–${Math.round(b.right)} px)`);
        }));
        document.querySelectorAll("img").forEach((i) => {
          const name = (i.getAttribute("src") || "").split("/").pop();
          if (i.complete && !i.naturalWidth) p.push(`image cassée : ${name}`);
          else if (i.naturalWidth && i.offsetWidth && getComputedStyle(i).objectFit === "fill") {
            const ratio = (i.offsetWidth / i.offsetHeight) / (i.naturalWidth / i.naturalHeight);
            if (Math.abs(ratio - 1) > 0.03) p.push(`image déformée : ${name} (${Math.round((ratio - 1) * 100)} %)`);
          }
        });
        if (mobile) {
          const small = [...document.querySelectorAll("input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]),select,textarea")]
            .filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.name || e.id);
          if (small.length) p.push(`champs sous 16 px (zoom automatique sur iPhone) : ${small.join(", ")}`);
          const tiny = [...document.querySelectorAll("button,summary,select,input[type=checkbox],input[type=radio],a:not(p a):not(li a)")]
            .filter((e) => e.offsetParent && getComputedStyle(e).position !== "fixed").filter((e) => { const r = e.getBoundingClientRect(); return r.height < 24 || r.width < 24; })
            .map((e) => `${e.tagName.toLowerCase()} « ${(e.textContent || e.name || "").trim().slice(0, 25)} »`);
          if (tiny.length) p.push(`cibles tactiles sous 24 px : ${tiny.slice(0, 5).join(", ")}`);
        }
        return p;
      }, { fullBleed: FULL_BLEED, mobile: !!s.mobile });
      found.forEach((m) => problems.push(`${where} : ${m}`));

      await page.addStyleTag({ content: ".ztf-demo{display:none!important}" });
      const file = (url.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "accueil") + "-" + s.name + ".png";
      await page.screenshot({ path: path.join(out, file) });
      await ctx.close();
    }
  }

  await browser.close();
  server.close();
  console.log(`${pages.length} page(s) × ${SCREENS.length} largeurs ; captures dans ${path.relative(root, out)}/`);
  if (problems.length) { console.log(`\n${problems.length} problème(s) :`); problems.forEach((p) => console.log(" - " + p)); process.exitCode = 1; }
  else console.log("Aucun problème détecté. Regardez quand même les captures : un contrôle automatique ne voit pas tout.");
})().catch((e) => { console.error(e); server.close(); process.exitCode = 2; });
