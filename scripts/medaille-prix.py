# Médaillon provisoire du prix : le trophée entier, centré sur son axe, sur fond bleu nuit des affiches.
# Usage (depuis la racine du dépôt, Python + Pillow) : python3 scripts/medaille-prix.py apercu.png
from PIL import Image, ImageDraw, ImageFilter
import sys
src = Image.open("maquettes/affiche/img/trophee.jpg").convert("RGB")
N = 600
bg = Image.new("RGB", (N, N), (3, 10, 51)); glow = Image.new("L", (N, N), 0)
ImageDraw.Draw(glow).ellipse([60, 40, N - 60, N - 80], fill=255); glow = glow.filter(ImageFilter.GaussianBlur(90))
bg.paste(Image.new("RGB", (N, N), (11, 26, 107)), (0, 0), glow)
h = int(N * 0.8); w = int(src.width * h / src.height); t = src.resize((w, h), Image.LANCZOS)
axis = 139 / src.width * w                      # axe vertical du trophée (x = 139 px sur 314)
x = int(N / 2 - axis); y = int((N - h) / 2) + 6
mask = Image.new("L", (w, h), 0)
ImageDraw.Draw(mask).ellipse([int(w * .05), int(h * .02), int(w * .95), int(h * 1.02)], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(24))
bg.paste(t, (x, y), mask)
bg.resize((440, 440), Image.LANCZOS).save("site/img/ecoles/prix-provisoire.jpg", quality=90)
prev = Image.open("site/img/ecoles/prix-provisoire.jpg").convert("RGB")
m = Image.new("L", prev.size, 0); ImageDraw.Draw(m).ellipse([0, 0, 439, 439], fill=255)
out = Image.new("RGB", (460, 460), (3, 10, 51)); out.paste(prev, (10, 10), m); out.save(sys.argv[1])
