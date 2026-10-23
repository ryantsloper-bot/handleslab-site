#!/usr/bin/env python3
"""Placeholder athlete stills for the character picker (Phase 1), until the Shorts Producer delivers real art.
Usage:  python3 tools/athlete_placeholders.py
Writes assets/img/athlete/tone-1..4/{avatar.png, avatar-192.png, avatar-96.png, hero.png, celebrate.png, share.png,
swatch.png} plus .webp copies. Faceless flat silhouette: orange headband, black/orange jersey, orange sleeve on the
athlete's right arm, plain shoes. No text, no logos. Tone 3 = Option A: its opaque stills (avatar, hero, swatch) are
crops of the approved Option A reference (HOOPS_REF, outside this repo) when it is present.
Rendering uses headless Chrome (google-chrome) for SVG -> PNG with alpha. Real stills: drop them in with the same
names and sizes (see assets/img/athlete/README.md) and do NOT re-run this script."""
import os, subprocess, tempfile, shutil
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "img", "athlete")
REF = os.environ.get("HOOPS_REF", "/workspace/hoops-ai/reference/option-a-locked")
CHROME = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")

# light -> deep. Tone 3 is sampled from the Option A athlete (deep warm brown).
TONES = {1: ("#EDC6A0", "#D2A57F"), 2: ("#BF8150", "#9E6439"), 3: ("#7A4122", "#5B2D15"), 4: ("#44240F", "#2D1608")}
INK, OR, OR2, BLK, WHITE = "#121214", "#F77914", "#FF9A3D", "#17171a", "#F6F2EC"

def limb(pts, w, col):
    d = "M" + " L".join(f"{x},{y}" for x, y in pts)
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + 12}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')

def figure(skin, shade):
    o = f'stroke="{INK}" stroke-width="7" stroke-linejoin="round"'
    s = []
    s.append('<ellipse cx="300" cy="952" rx="190" ry="20" fill="rgba(0,0,0,.16)"/>')
    # legs + socks
    for side in (-1, 1):
        hip, knee, ank = (300 + side * 40, 600), (300 + side * 52, 760), (300 + side * 56, 892)
        s.append(limb([hip, knee, ank], 60, skin))
        s.append(f'<path d="M{knee[0] + side * 14},{knee[1] - 40} L{ank[0] + side * 14},{ank[1] - 40}" stroke="{shade}" stroke-width="12" stroke-linecap="round" opacity=".7"/>')
        s.append(f'<path d="M{ank[0] - 0.5 * side},{858} L{ank[0]},{900}" stroke="{INK}" stroke-width="60" stroke-linecap="butt"/>'
                 f'<path d="M{ank[0] - 0.5 * side},{860} L{ank[0]},{898}" stroke="{WHITE}" stroke-width="48" stroke-linecap="butt"/>')
    # plain shoes: black upper, orange toe + heel blocks, white sole (no marks)
    for side in (-1, 1):
        x = 300 + side * 56
        def X(v): return x + side * v
        up = f"M{X(-30)},898 L{X(30)},898 L{X(32)},934 L{X(-44)},934 Q{X(-62)},932 {X(-58)},918 Q{X(-54)},906 {X(-30)},898 Z"
        s.append(f'<path d="{up}" fill="{BLK}" {o}/>')
        s.append(f'<path d="M{X(-40)},905 Q{X(-56)},910 {X(-57)},922 L{X(-30)},922 L{X(-26)},903 Z" fill="{OR}"/>')
        s.append(f'<path d="M{X(30)},899 L{X(31)},922 L{X(16)},922 L{X(18)},899 Z" fill="{OR}"/>')
        s.append(f'<rect x="{min(X(-64), X(36))}" y="932" width="100" height="14" rx="7" fill="{WHITE}" {o}/>')
    # shorts
    s.append(f'<path d="M222,470 L378,470 L400,642 L314,652 L300,598 L286,652 L200,642 Z" fill="{BLK}" {o}/>')
    s.append(f'<path d="M227,480 L207,634 M373,480 L393,634" stroke="{OR}" stroke-width="9" stroke-linecap="round"/>')
    s.append(f'<path d="M206,636 L284,645 M316,645 L394,636" stroke="{OR}" stroke-width="7" stroke-linecap="round"/>')
    # neck + shoulders
    s.append(f'<rect x="274" y="200" width="52" height="66" rx="10" fill="{skin}" {o}/>')
    s.append(f'<circle cx="226" cy="300" r="36" fill="{skin}" {o}/><circle cx="374" cy="300" r="36" fill="{skin}" {o}/>')
    # athlete's right arm (image left) with the orange sleeve
    s.append(limb([(222, 304), (190, 430), (182, 540)], 46, skin))
    s.append(f'<path d="M191,428 L183,532" stroke="{INK}" stroke-width="62" stroke-linecap="round"/><path d="M191,428 L183,532" stroke="{OR}" stroke-width="50" stroke-linecap="round"/>')
    s.append(f'<path d="M200,438 L194,526" stroke="#C9580A" stroke-width="10" stroke-linecap="round" opacity=".8"/>')
    s.append(f'<ellipse cx="181" cy="566" rx="27" ry="30" fill="{skin}" {o}/>')
    # jersey (sleeveless, V-neck)
    s.append(f'<path d="M236,262 Q300,252 364,262 Q392,300 372,372 L380,484 L220,484 L228,372 Q208,300 236,262 Z" fill="{BLK}" {o}/>')
    s.append(f'<path d="M272,262 L300,306 L328,262 Z" fill="{skin}"/>')
    s.append(f'<path d="M268,260 L300,312 L332,260" fill="none" stroke="{OR}" stroke-width="10" stroke-linejoin="round"/>')
    s.append(f'<path d="M240,268 Q218,306 231,368 M360,268 Q382,306 369,368" fill="none" stroke="{OR}" stroke-width="8" stroke-linecap="round"/>')
    s.append(f'<path d="M231,380 L224,476 M369,380 L376,476" stroke="{OR}" stroke-width="7" stroke-linecap="round"/>')
    s.append(f'<path d="M224,478 L376,478" stroke="{OR}" stroke-width="6"/>')
    # ball on the hip, then the athlete's left arm over it
    s.append(f'<circle cx="420" cy="545" r="62" fill="#E8701C" {o}/>')
    s.append(f'<path d="M420,483 Q440,545 420,607 M358,545 Q420,528 482,545 M378,500 Q412,545 378,590 M462,500 Q428,545 462,590" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    s.append(f'<path d="M392,515 Q404,500 420,497" fill="none" stroke="#FFB36B" stroke-width="7" stroke-linecap="round" opacity=".8"/>')
    s.append(limb([(378, 304), (430, 410), (408, 492)], 46, skin))
    s.append(f'<ellipse cx="404" cy="500" rx="30" ry="26" fill="{skin}" {o}/>')
    # head: faceless, with headband
    s.append(f'<defs><clipPath id="hd"><ellipse cx="300" cy="160" rx="52" ry="63"/></clipPath></defs>')
    s.append(f'<ellipse cx="300" cy="160" rx="52" ry="63" fill="{skin}"/>')
    s.append(f'<g clip-path="url(#hd)"><ellipse cx="338" cy="176" rx="34" ry="70" fill="{shade}" opacity=".75"/>'
                          f'<rect x="240" y="114" width="130" height="30" fill="{OR}"/><rect x="240" y="114" width="130" height="7" fill="{OR2}"/>'
             f'<path d="M240,114 L370,114 M240,144 L370,144" stroke="{INK}" stroke-width="5"/></g>')
    s.append(f'<ellipse cx="300" cy="160" rx="52" ry="63" fill="none" {o}/>')
    return "".join(s)

def background(x, y, w, h):
    return (f'<defs><pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.2" fill="rgba(120,40,0,.16)"/>'
            f'<circle cx="12" cy="12" r="2.2" fill="rgba(120,40,0,.16)"/></pattern>'
            f'<radialGradient id="glow" cx=".7" cy=".25" r=".8"><stop offset="0" stop-color="{OR2}"/><stop offset="1" stop-color="{OR}"/></radialGradient></defs>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#glow)"/><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#dots)"/>'
            f'<g fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="6"><circle cx="300" cy="960" r="230"/><path d="M{x},700 L{x + w},640"/></g>'
            f'<g stroke="#fff" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"><path d="M{x + w - 60},{y + 90} L{x + w - 150},{y + 140}"/><path d="M{x + 40},{y + 200} L{x + 110},{y + 170}"/></g>')

# name: (size, viewBox, opaque)
VIEWS = {"share": ((1080, 1350), (-60, 70, 720, 900), False),
         "hero": ((720, 1280), (19, 0, 562.5, 1000), True),
         "celebrate": ((720, 720), (-10, 80, 620, 620), False),
         "avatar": ((512, 512), (125, 70, 350, 350), True),
         "swatch": ((360, 480), (105, 66, 390, 520), True)}

def render(svg, size, path):
    with tempfile.TemporaryDirectory() as td:
        f = os.path.join(td, "a.html")
        open(f, "w").write(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
        subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", f"--window-size={size[0]},{size[1]}",
                        "--default-background-color=00000000", f"--screenshot={path}", "file://" + f], check=True, capture_output=True)
    im = Image.open(path).convert("RGBA")
    if im.size != size: im = im.crop((0, 0) + size)
    im.save(path, optimize=True)

def crop_ref(name, size):
    """Tone 3 (Option A) opaque stills from the approved reference set."""
    if name == "hero" and os.path.exists(os.path.join(REF, "day1-ref-frame.png")):
        return Image.open(os.path.join(REF, "day1-ref-frame.png")).convert("RGB").resize(size, Image.LANCZOS)
    p = os.path.join(REF, "ref-hero.png")
    if not os.path.exists(p): return None
    im = Image.open(p).convert("RGB")
    box = {"avatar": (264, 20, 664, 420), "swatch": (190, 10, 730, 730)}.get(name)
    return im.crop(box).resize(size, Image.LANCZOS) if box else None

def main():
    for t, (skin, shade) in TONES.items():
        d = os.path.join(OUT, f"tone-{t}"); os.makedirs(d, exist_ok=True)
        for name, (size, vb, opaque) in VIEWS.items():
            p = os.path.join(d, name + ".png")
            ref = crop_ref(name, size) if t == 3 and opaque else None
            if ref is not None: ref.save(p, optimize=True)
            else:
                body = (background(*vb) if opaque else "") + figure(skin, shade)
                render(f'<svg xmlns="http://www.w3.org/2000/svg" width="{size[0]}" height="{size[1]}" viewBox="{" ".join(map(str, vb))}">{body}</svg>', size, p)
            im = Image.open(p)
            im.save(os.path.join(d, name + ".webp"), "WEBP", quality=82, method=6)
        av = Image.open(os.path.join(d, "avatar.png")).convert("RGB")
        for s in (192, 96): av.resize((s, s), Image.LANCZOS).save(os.path.join(d, f"avatar-{s}.png"), optimize=True)
        print("tone", t, sorted(os.listdir(d)))

if __name__ == "__main__": main()
