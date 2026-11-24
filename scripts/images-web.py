#!/usr/bin/env python3
"""
Variantes légères des images du site, pour les connexions lentes (3G, forfaits limités).

Pour chaque image JPEG listée dans RULES, écrit à côté de l'original des copies AVIF et WebP
à plusieurs largeurs (« affiche-gala-960.avif », …) et le fichier site/img/variantes.json.
Au build, scripts/optimise-dist.mjs remplace chaque <img> concerné par un <picture> :
le navigateur prend le format le plus léger qu'il sait lire, à la largeur dont l'écran a besoin ;
le JPEG d'origine reste en dernier recours.

À relancer après l'ajout ou le changement d'une image (par exemple la photo d'une nouvelle école) :
    pip install pillow   # Pillow 11 ou plus, avec AVIF
    python3 scripts/images-web.py
"""
import glob, json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
AVIF_Q, WEBP_Q = 55, 78

# (motif des images à servir, source à réduire, largeurs, attribut sizes à poser si l'<img> n'en a pas)
RULES = [
    ("img/affiche-gala.jpg", "img/affiche-gala-2x.jpg", [480, 720, 960, 1280, 1808], None),
    ("img/ecoles/*-batiment.jpg", None, [640, 960, 1280, 1600], "(max-width: 980px) 100vw, 60vw"),
    ("img/ecoles/*-logo.jpg", None, [160, 320, 480], "138px"),
    ("img/ecoles/prix-provisoire.jpg", None, [160, 320, 440], "138px"),
]


def main():
    manifest = {}
    for pattern, source, widths, sizes in RULES:
        for path in sorted(glob.glob(os.path.join(ROOT, pattern))):
            rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
            src = os.path.join(ROOT, source) if source else path
            im = Image.open(src).convert("RGB")
            ws = sorted({w for w in widths if w <= im.width} | ({im.width} if im.width < max(widths) else set()))
            base = os.path.splitext(rel)[0]
            out = []
            for w in ws:
                r = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
                r.save(os.path.join(ROOT, f"{base}-{w}.avif"), "AVIF", quality=AVIF_Q, speed=4)
                r.save(os.path.join(ROOT, f"{base}-{w}.webp"), "WEBP", quality=WEBP_Q, method=6)
                out.append(w)
            manifest["/" + rel] = {"base": "/" + base, "widths": out, "sizes": sizes}
            print(rel, out)
    with open(os.path.join(ROOT, "img", "variantes.json"), "w") as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
        f.write("\n")


if __name__ == "__main__":
    main()
