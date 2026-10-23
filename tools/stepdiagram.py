"""Animated step diagrams: a premium stand-in for a step that has no loop clip.

Top-down view (front of the player = up, so L is on the left), 720x900 (same 4:5 frame as the clips).
Plain shoes; hands carry 'L hand' / 'R hand' chips, numbered markers 1-2-3 give the order, and the ball runs the path in a smooth loop:
one slow lap, then one at game speed (badge switches SLOW -> GAME SPEED). A white arrow rides just ahead of the ball
and a see-through ghost ball marks the next spot, so the direction is obvious at phone size. Cues sit under the card (CSV, word for word).
Pure inline SVG + SMIL: no requests, so it works offline in the PWA. Pages pause it for prefers-reduced-motion
(svg.pauseAnimations()), which leaves a complete still: path, numbers, hands and ball at the start.

Reusable: add a (move id, step) entry to SPECS. Only ids/steps listed in ENABLED render; everything else
keeps its ball-path drawing. build.py calls diagram() only for steps with no clip."""
from html import escape as E
OR, INK, CREAM, WHITE = "#F77914", "#0e0e10", "#fff7ef", "#ffffff"
FEET = {"L": (285, 500), "R": (435, 500)}
HEAD = (360, 398)

# figure-8 paths around the feet (crossing between them); P8 tight (pretzel), W8 wide (wrap / dribble)
P8 = "M360 500 C360 410 200 410 200 500 C200 590 360 590 360 500 C360 410 520 410 520 500 C520 590 360 590 360 500"
W8 = "M360 500 C360 380 150 380 150 500 C150 620 360 620 360 500 C360 380 570 380 570 500 C570 620 360 620 360 500"
RICO = "M360 250 L360 500 L360 640 C600 640 600 250 360 250"           # front -> bounce between feet -> catch behind -> bring back
BULLET = "M360 398 L360 500 L360 640 C600 640 600 398 360 398"         # starts overhead

def wrap(txt, n=34):
    out, line = [], ""
    for w in txt.split():
        if len(line) + len(w) + 1 > n and line: out.append(line); line = w
        else: line = (line + " " + w).strip()
    return out + [line]

H_PRETZEL = [("L", 232, 580, "a", "down"), ("R", 360, 462, "a", "upright"), ("R", 488, 580, "b", "down"), ("L", 360, 462, "b", "upleft")]
H_RICO = [("L", 312, 250, "a", "left"), ("R", 408, 250, "a", "right"), ("L", 312, 640, "b", "left"), ("R", 408, 640, "b", "right")]
SPECS = {
 # Day 5 pretzel (A08)
 ("A08", 1): dict(path=W8, tag="NO DRIBBLE", hands=[("L", 150, 500, None, "down"), ("R", 570, 500, None, "down")],
                  marks=[(1, 215, 352), (2, 300, 612), (3, 505, 352)]),
 ("A08", 2): dict(path=P8, tag="SWAP HANDS", hands=H_PRETZEL, marks=[(1, 175, 455), (2, 360, 625), (3, 545, 455)]),
 ("A08", 3): dict(path=P8, tag="FASTER", slow=3.2, fast=1.4, hands=H_PRETZEL, marks=[(1, 175, 455), (2, 360, 625), (3, 545, 455)]),
 ("A08", 4): dict(path=W8, tag="PRETZEL → DRIBBLE", bounces=[(150, 500), (360, 500), (570, 500)],
                  hands=[("L", 172, 432, None, "up"), ("R", 548, 432, None, "up")], marks=[(1, 360, 600), (2, 105, 600), (3, 615, 600)]),
 # Day 9 ricochet (A09) steps without a clip, figure-8 dribble (A15) step 1
 ("A09", 2): dict(path=RICO, tag="CATCH BEHIND", bounces=[(360, 500)], hands=H_RICO, marks=[(1, 360, 178), (2, 205, 560), (3, 360, 715)], split=.5),
 ("A09", 3): dict(path=RICO, tag="10 IN A ROW", bounces=[(360, 500)], hands=H_RICO, marks=[(1, 360, 178), (2, 205, 560), (3, 360, 715)], split=.5, slow=3.0, fast=1.6),
 ("A09", 4): dict(path=BULLET, tag="FROM OVERHEAD", bounces=[(360, 500)],
                  hands=[("L", 296, 398, "a", "left"), ("R", 424, 398, "a", "right"), ("L", 312, 640, "b", "left"), ("R", 408, 640, "b", "right")],
                  marks=[(1, 360, 322), (2, 205, 560), (3, 360, 715)], split=.5),
 ("A15", 1): dict(path=W8, tag="NO DRIBBLE", hands=[("L", 150, 500, None, "down"), ("R", 570, 500, None, "down")],
                  marks=[(1, 215, 352), (2, 300, 612), (3, 505, 352)]),
}
# on-the-move helpers (front = direction of travel = up)
STRIDE = [(300, 448, "a"), (420, 585, "a"), (420, 448, "b"), (300, 585, "b")]       # front foot swaps every step
def chevrons(x, y, label):
    c = "".join(f'<path d="M{x-34} {y+i*34+26}L{x} {y+i*34}L{x+34} {y+i*34+26}" fill="none" stroke="{CREAM}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="{.95-i*.3:.2f}"/>' for i in range(3))
    return c + f'<text x="{x}" y="{y+132}" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="30" fill="{INK}" letter-spacing="2">{label}</text>'
def chair(x, y):
    return (f'<g transform="translate({x} {y})"><rect x="-46" y="-40" width="92" height="80" rx="12" fill="{CREAM}" stroke="{INK}" stroke-width="6"/>'
            f'<rect x="-46" y="-40" width="92" height="20" rx="8" fill="{INK}"/><text y="26" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="26" fill="{INK}">CHAIR</text></g>')
def back_label(y):
    return (f'<text x="360" y="{y}" text-anchor="middle" font-family="Lucky,Impact,sans-serif" font-size="34" fill="{INK}" stroke="{CREAM}" stroke-width="10" paint-order="stroke">BEHIND YOUR BACK</text>')
# between the legs: R hand -> bounce in the gap between front and back foot -> L hand, then back the other way
THRU = "M525 490 Q450 590 360 510 Q270 430 195 490 Q270 590 360 510 Q450 430 525 490"
# behind the back: R hip -> around the BACK of the hips (below the body, dashed) -> L hip, then back
BTB = "M505 485 C540 680 180 680 215 485 C180 680 540 680 505 485"
BODY_BACK = (f'<path d="M210 470 Q360 545 510 470" fill="none" stroke="{INK}" stroke-width="10" stroke-linecap="round" opacity=".55"/>')
SPECS.update({
 ("B10", 3): dict(path=THRU, tag="EVERY STEP", feet=STRIDE, bounces=[(360, 510)],
                  hands=[("L", 195, 490, None, "left"), ("R", 525, 490, None, "right")],
                  marks=[(1, 565, 600), (2, 360, 668), (3, 155, 600)], under=chevrons(360, 190, "JOG"), extent=[(326, 190), (394, 330)]),
 ("B11", 3): dict(path=BTB, tag="BEHIND THE BACK", bounces=[(360, 640)], ghosts=[(215, 485, "a"), (505, 485, "b")],
                  hands=[("L", 215, 485, None, "left"), ("R", 505, 485, None, "right")],
                  marks=[(1, 575, 545), (2, 590, 668), (3, 145, 545)], under=chair(360, 215) + back_label(745), over=BODY_BACK,
                  extent=[(314, 175), (406, 255), (150, 760), (570, 760)]),
 ("B11", 4): dict(path=BTB, tag="CHANGE DIRECTION", slow=3.4, fast=1.6, bounces=[(360, 640)], ghosts=[(215, 485, "a"), (505, 485, "b")],
                  hands=[("L", 215, 485, None, "left"), ("R", 505, 485, None, "right")],
                  marks=[(1, 575, 545), (2, 590, 668), (3, 145, 545)],
                  under=(f'<path d="M520 300 Q360 170 200 300" fill="none" stroke="{CREAM}" stroke-width="14" stroke-linecap="round"/>'
                         f'<path d="M222 262L196 306L246 312" fill="none" stroke="{CREAM}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>'
                         f'<text x="360" y="250" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="30" fill="{INK}" letter-spacing="2">NEW DIRECTION</text>') + back_label(745),
                  over=BODY_BACK, extent=[(190, 200), (530, 320), (150, 760), (570, 760)]),
})

# Turned on only where the CEO asked: all Day 5 pretzel steps + the Day 9 steps with no clip.
ENABLED = {("A08", 1), ("A08", 2), ("A08", 3), ("A08", 4), ("A09", 2), ("A09", 3), ("A09", 4), ("A15", 1),
           ("B10", 3), ("B11", 3), ("B11", 4)}

def ball(r=30, ghost=False):
    op = ' opacity=".38"' if ghost else ""
    return (f'<g{op}><circle r="{r}" fill="{OR}" stroke="{INK}" stroke-width="6"{" stroke-dasharray=\"8 6\"" if ghost else ""}/>'
            f'<path d="M{-r} 0H{r}M0 {-r}V{r}M{-r*.7:.0f} {-r*.7:.0f}Q0 0 {-r*.7:.0f} {r*.7:.0f}M{r*.7:.0f} {-r*.7:.0f}Q0 0 {r*.7:.0f} {r*.7:.0f}" '
            f'stroke="{INK}" stroke-width="3.5" fill="none"/>' + ("" if ghost else f'<circle cx="{-r*.35:.0f}" cy="{-r*.4:.0f}" r="{r*.22:.0f}" fill="#fff" opacity=".45"/>') + '</g>')

CHIP_W, CHIP_H = 132, 50
def chip_box(x, y, side):
    """Top-left corner of the 'L hand' / 'R hand' chip placed beside a hand at (x, y)."""
    gap = 32
    return {"left": (x - gap - CHIP_W, y - CHIP_H / 2), "right": (x + gap, y - CHIP_H / 2),
            "up": (x - CHIP_W / 2, y - gap - CHIP_H), "down": (x - CHIP_W / 2, y + gap),
            "upright": (x + 18, y - gap - CHIP_H), "upleft": (x - 18 - CHIP_W, y - gap - CHIP_H)}[side]

def feet_of(spec):
    """[(x, y, phase)] - phase 'a'/'b' feet swap in time with the hands (jogging strides); None = always shown."""
    return spec.get("feet") or [(x, y, None) for (x, y) in FEET.values()]

def phased(ph, keyvals, T):
    if not ph: return ""
    v = "1;0;1;0;1" if ph == "a" else "0;1;0;1;0"
    return f'<animate attributeName="opacity" values="{v}" keyTimes="{keyvals}" calcMode="discrete" dur="{T:.2f}s" repeatCount="indefinite"/>'

def _check(spec, key):
    for (n, x, y) in spec["marks"]:   # numbered markers must never sit on the feet
        for (fx, fy, _p) in feet_of(spec):
            if ((x - fx) / (36 + 34)) ** 2 + ((y - fy) / (62 + 34)) ** 2 < 1:
                raise ValueError(f"stepdiagram {key}: marker {n} overlaps a foot")

def _bbox(spec):
    import re
    nums = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?", spec["path"])]
    xs, ys = nums[0::2], nums[1::2]
    for (_, x, y, _p, side) in spec["hands"]:
        xs += [x - 30, x + 30]; ys += [y - 30, y + 30]      # chips are kept on-card by the fit loop in diagram()
    for (_, x, y) in spec["marks"]: xs += [x - 32, x + 32]; ys += [y - 32, y + 32]
    for (x, y) in spec.get("bounces", []): xs += [x - 62, x + 62]; ys += [y - 40, y + 30]
    for (x, y, _p) in feet_of(spec): xs += [x - 40, x + 40]; ys += [y - 66, y + 66]
    for (x, y) in spec.get("extent", []): xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)

def diagram(mid, step, cues, uid, step_text=""):
    if (mid, step) not in ENABLED or (mid, step) not in SPECS: return None
    s = SPECS[(mid, step)]; _check(s, (mid, step))
    slow, fast = s.get("slow", 4.6), s.get("fast", 2.2); T = slow + fast; k = slow / T
    sp = s.get("split", .5)
    # fit: the drawing spans ~70% of the card width, centred in the space under the top chips
    x0, y0, x1, y1 = _bbox(s); sc = min(0.70 * 720 / (x1 - x0), (820 - 215) / (y1 - y0), 1.8)   # drawing lives in y 215-820 (safe when the app crops to a square-ish card)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; CY = 518
    def fits(k):
        for (_, x, y, _p, side) in s["hands"]:
            bx, by = chip_box(x, y, side)
            for (px, py) in ((bx, by), (bx + CHIP_W, by + CHIP_H)):
                X, Y = 360 + (px - cx) * k, CY + (py - cy) * k
                if not (12 <= X <= 708 and 215 <= Y <= 820): return False
        return True
    while sc > 0.6 and not fits(sc): sc -= 0.02
    o = []
    o.append(f'<svg class="dg" viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated diagram, top-down view: {E(step_text)}. Cues: {E(cues)}">')
    o.append(f'<defs><pattern id="ht{uid}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="3.2" fill="#7a2c00" opacity=".16"/></pattern>'
             f'<radialGradient id="vg{uid}" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>')
    o.append(f'<rect width="720" height="900" fill="{OR}"/><rect width="720" height="900" fill="url(#ht{uid})"/>')
    o.append(f'<g fill="none" stroke="{CREAM}" stroke-width="7" opacity=".45"><circle cx="360" cy="500" r="270"/><path d="M0 200H720M40 0V900M680 0V900"/></g>')
    o.append(f'<rect width="720" height="900" fill="url(#vg{uid})"/>')
    o.append(f'<g font-family="Anton,Impact,sans-serif" font-size="28" fill="{INK}" text-anchor="middle"><path d="M360 182l16 22h-32z"/><text x="360" y="172" letter-spacing="3">FRONT</text></g>')
    o.append(f'<g transform="translate(360 {CY}) scale({sc:.3f}) translate({-cx:.1f} {-cy:.1f})">')
    o.append(f'<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="{s["path"]}" stroke="{INK}" stroke-width="20" opacity=".9"/>'
             f'<path d="{s["path"]}" stroke="{WHITE}" stroke-width="8" stroke-dasharray="22 16" opacity=".85"/></g>')
    a_vals = f"0;{sp*k:.4f};{k:.4f};{k+sp*(1-k):.4f};1"
    o.append(s.get("under", ""))        # extras drawn under the body (chair, travel arrows, labels)
    for (x, y, ph) in feet_of(s):   # plain sneakers, no letters
        o.append(f'<g transform="translate({x} {y})" opacity="{0 if ph == "b" else 1}">{phased(ph, a_vals, T)}<ellipse rx="36" ry="62" fill="{INK}" stroke="{WHITE}" stroke-width="5"/>'
                 f'<ellipse cy="-36" rx="28" ry="20" fill="{OR}"/><path d="M-14 0h28M-14 14h28" stroke="{WHITE}" stroke-width="4" opacity=".6"/></g>')
    hx, hy = HEAD
    o.append(f'<ellipse cx="{hx}" cy="{hy}" rx="150" ry="40" fill="{INK}" opacity=".55" stroke="{WHITE}" stroke-width="5"/>'
             f'<circle cx="{hx}" cy="{hy}" r="42" fill="{WHITE}" stroke="{INK}" stroke-width="6"/><circle cx="{hx}" cy="{hy}" r="30" fill="none" stroke="{OR}" stroke-width="12"/>')
    for (x, y) in s.get("bounces", []):
        o.append(f'<g transform="translate({x} {y})" stroke="{WHITE}" stroke-width="6" stroke-linecap="round"><path d="M-44 -30l-12 -8M44 -30l12 -8M-48 18l-14 6M48 18l14 6"/>'
                 f'<circle r="20" fill="none" stroke="{INK}" stroke-width="5" stroke-dasharray="7 6"/></g>')
    for (n, x, y) in s["marks"]:
        o.append(f'<g transform="translate({x} {y})"><circle r="30" fill="{INK}" stroke="{WHITE}" stroke-width="5"/>'
                 f'<text y="13" text-anchor="middle" font-family="Lucky,Impact,sans-serif" font-size="38" fill="{WHITE}">{n}</text></g>')
    o.append(s.get("over", ""))
    for (lab, x, y, ph, side) in s["hands"]:
        anim = ""
        if ph:
            v = "1;0;1;0;1" if ph == "a" else "0;1;0;1;0"
            anim = f'<animate attributeName="opacity" values="{v}" keyTimes="{a_vals}" calcMode="discrete" dur="{T:.2f}s" repeatCount="indefinite"/>'
        bx, by = chip_box(x, y, side)
        o.append(f'<g opacity="{0 if ph == "b" else 1}">{anim}'
                 f'<circle cx="{x}" cy="{y}" r="26" fill="{WHITE}" stroke="{INK}" stroke-width="6"/>'
                 f'<rect x="{bx:.0f}" y="{by:.0f}" width="{CHIP_W}" height="{CHIP_H}" rx="25" fill="{WHITE}" stroke="{INK}" stroke-width="5"/>'
                 f'<text x="{bx + CHIP_W / 2:.0f}" y="{by + 36:.0f}" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="30" fill="{INK}">{lab} hand</text></g>')
    # motion: the path is tripled so the arrow and ghost ball can run a fixed distance ahead of the ball
    d3 = " ".join([s["path"]] * 3); kt = f"0;{k:.4f};1"; spl = 'calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"'
    def motion(lead, rotate=False):
        kp = f"{lead:.4f};{1/3 + lead:.4f};{2/3 + lead:.4f}"
        return f'<animateMotion dur="{T:.2f}s" repeatCount="indefinite" path="{d3}" keyPoints="{kp}" keyTimes="{kt}" {spl}{" rotate=\"auto\"" if rotate else ""}/>'
    if s.get("ghosts"):      # fixed ghost ball at the spot the ball is heading for (e.g. the far hip)
        for (x, y, ph) in s["ghosts"]:
            o.append(f'<g transform="translate({x} {y})" opacity="{0 if ph == "b" else 1}">{phased(ph, a_vals, T)}{ball(30, ghost=True)}</g>')
    else:
        o.append(f'<g>{ball(30, ghost=True)}{motion(0.13 / 3)}</g>')                 # ghost ball: the next spot
    o.append(f'<g><path d="M-22 -34L38 0L-22 34L-8 0Z" fill="{WHITE}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>{motion(0.065 / 3, True)}</g>')  # direction arrow
    o.append(f'<g>{ball()}{motion(0)}</g>')
    o.append("</g>")
    # top chips: tag (starts at x=168, clear of the app's step-number badge) + speed (right)
    o.append(f'<g font-family="Anton,Impact,sans-serif" font-size="30" letter-spacing="2">'
             f'<rect x="168" y="82" width="{min(272, 30 + 14 * len(s["tag"]))}" height="54" rx="27" fill="{INK}"/><text x="183" y="118" font-size="25" fill="{WHITE}">{E(s["tag"])}</text>'
             f'<g><rect x="452" y="82" width="244" height="54" rx="27" fill="{WHITE}" stroke="{INK}" stroke-width="5"/>'
             f'<text x="574" y="120" text-anchor="middle" fill="{INK}">🐢 SLOW FIRST<animate attributeName="opacity" values="1;0;1" keyTimes="0;{k:.4f};1" calcMode="discrete" dur="{T:.2f}s" repeatCount="indefinite"/></text>'
             f'<text x="574" y="120" text-anchor="middle" fill="{OR}" opacity="0">🐇 GAME SPEED<animate attributeName="opacity" values="0;1;0" keyTimes="0;{k:.4f};1" calcMode="discrete" dur="{T:.2f}s" repeatCount="indefinite"/></text></g></g>')
    o.append("</svg>")
    return "".join(o)

if __name__ == "__main__":   # preview: python3 tools/stepdiagram.py out.html
    import sys
    cues = {"A08": "Little hands, fast hands; mini squat; head up", "A09": "Bounce hard; hands ready behind; knees bent", "A15": "Low dribbles; wide stance", "B10": "Bounce as front foot lands; low", "B11": "Body ahead of ball; pull with wrist; eyes up"}
    html = "".join(f'<div style="display:inline-block;width:300px;margin:6px">{diagram(m, st, cues[m], f"{m}{st}")}</div>' for (m, st) in sorted(ENABLED))
    open(sys.argv[1], "w").write('<!doctype html><meta charset="utf-8"><body style="background:#111;margin:0">' + html)
