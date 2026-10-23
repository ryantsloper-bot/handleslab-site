"""One-off image prep: turns the launch-kit art (outside this repo, in hoops-ai/) into
web-sized assets. Outputs are committed, so the site build does not need this script."""
from PIL import Image
import os
SRC = os.environ.get("HOOPS_SRC", "/workspace/hoops-ai")
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")
os.makedirs(OUT, exist_ok=True)
def save(im, name, w=None, q=80):
    im = im.convert("RGB")
    if w and im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=q, method=6)
    im.save(os.path.join(OUT, name + ".jpg"), "JPEG", quality=q, optimize=True, progressive=True)
av = Image.open(f"{SRC}/launch/avatar.png")
save(av, "athlete", 720)
for s in (32, 180, 192, 512):
    av.convert("RGB").resize((s, s), Image.LANCZOS).save(os.path.join(OUT, f"icon-{s}.png"), optimize=True)
hdr = Image.open(f"{SRC}/launch/x-header.png").convert("RGB")
og = Image.new("RGB", (1200, 630), hdr.getpixel((40, 40)))
h = hdr.resize((1200, 400), Image.LANCZOS); og.paste(h, (0, 115))
og.save(os.path.join(OUT, "og.jpg"), "JPEG", quality=85, optimize=True)
for f, n in [("day1-1-step1-stance", "day1-stance"), ("day1-2-step2-pound-right", "day1-pound-right"), ("day1-3-step3-pound-left", "day1-pound-left")]:
    save(Image.open(f"{SRC}/launch/day1/{f}.png"), n, 540, 78)
print(sorted(os.listdir(OUT)))
