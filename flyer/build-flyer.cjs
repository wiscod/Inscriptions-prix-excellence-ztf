// Génère le flyer (A4) avec un QR code vers le formulaire, en PDF pour l'impression et en PNG pour WhatsApp.
// Usage : node flyer/build-flyer.cjs [adresse]   (nécessite les paquets qrcode, jsqr, pngjs et playwright)
// NODE_PATH peut pointer vers le dossier node_modules qui contient ces paquets.
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const jsQR = require("jsqr");
const { PNG } = require("pngjs");
const { chromium } = require("playwright");

const URL_FORM = process.argv[2] || "https://prix-ztf-candidature.vercel.app";
// Usage par école : node flyer/build-flyer.cjs https://…/enspy flyer-enspy  → sans le badge de date limite.
const OUT = process.argv[3] || "flyer-prix-ztf";
const OUT_DIR = process.argv[3] ? "ecoles" : "";
const dir = __dirname;

(async () => {
  const svg = await QRCode.toString(URL_FORM, { type: "svg", errorCorrectionLevel: "Q", margin: 2, color: { dark: "#06104a", light: "#ffffff" } });
  const laureat = "data:image/jpeg;base64," + fs.readFileSync(path.join(dir, "../maquettes/affiche/img/laureat.jpg")).toString("base64");
  const html = fs.readFileSync(path.join(dir, "flyer.template.html"), "utf8")
    .replace("__QR__", svg).replace("__LAUREAT__", laureat)
    .replace("__TROPHEE__", "data:image/jpeg;base64," + fs.readFileSync(path.join(dir, "../maquettes/affiche/img/trophee.jpg")).toString("base64"))
    .split("__URL_TEXT__").join(URL_FORM.replace(/^https?:\/\//, ""))
    .replace(process.argv[3] ? /<div class="seal">.*?<\/div><\/div>/ : /$^/, "");
  fs.mkdirSync(path.join(dir, OUT_DIR), { recursive: true });
  const htmlPath = path.join(dir, OUT_DIR, "flyer.html");
  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 3 });
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(dir, OUT_DIR, OUT + "-A4.pdf"), format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const clip = { x: 0, y: 0, width: 794, height: 1123 };
  await page.screenshot({ path: path.join(dir, OUT_DIR, OUT + ".jpg"), type: "jpeg", quality: 88, clip });
  const pngPath = path.join(require("os").tmpdir(), "flyer-prix-ztf-verif.png");
  await page.screenshot({ path: pngPath, clip });
  await browser.close();

  // Vérification : le QR code de l'image se lit et mène bien au formulaire.
  const png = PNG.sync.read(fs.readFileSync(pngPath));
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  console.log("QR lu :", code ? code.data : "ILLISIBLE", code && code.data === URL_FORM ? "(correct)" : "(ERREUR)");
})();
