"""Animated step diagrams: a premium stand-in for a step that has no loop clip.

Top-down view (front of the player = up, so L is on the left), 720x900 (same 4:5 frame as the clips).
Hands are marked L/R, numbered markers 1-2-3 give the order, and the ball runs the path in a smooth loop:
one slow lap, then one at game speed (badge switches SLOW -> GAME SPEED). The CSV cue line sits on the card.
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

SPECS = {
 # Day 5 pretzel (A08)
 ("A08", 1): dict(path=W8, tag="NO DRIBBLE", hands=[("L", 150, 500, None), ("R", 570, 500, None)],
                  marks=[(1, 215, 362), (2, 300, 612), (3, 505, 362)]),
 ("A08", 2): dict(path=P8, tag="SWAP HANDS", hands=[("L", 232, 580, "a"), ("R", 360, 470, "a"), ("R", 488, 580, "b"), ("L", 360, 470, "b")],
                  marks=[(1, 190, 610), (2, 360, 625), (3, 530, 610)]),
 ("A08", 3): dict(path=P8, tag="FASTER", slow=3.2, fast=1.4, hands=[("L", 232, 580, "a"), ("R", 360, 470, "a"), ("R", 488, 580, "b"), ("L", 360, 470, "b")],
                  marks=[(1, 190, 610), (2, 360, 625), (3, 530, 610)]),
 ("A08", 4): dict(path=W8, tag="PRETZEL → DRIBBLE", bounces=[(150, 500), (360, 500), (570, 500)],
                  hands=[("L", 172, 440, None), ("R", 548, 440, None)], marks=[(1, 360, 560), (2, 112, 590), (3, 608, 590)]),
 # Day 9 ricochet (A09) steps without a clip, figure-8 dribble (A15) step 1
 ("A09", 2): dict(path=RICO, tag="CATCH BEHIND", bounces=[(360, 500)], hands=[("L", 312, 250, "a"), ("R", 408, 250, "a"), ("L", 312, 640, "b"), ("R", 408, 640, "b")],
                  marks=[(1, 225, 250), (2, 215, 560), (3, 235, 640)], split=.5),
 ("A09", 3): dict(path=RICO, tag="10 IN A ROW", bounces=[(360, 500)], hands=[("L", 312, 250, "a"), ("R", 408, 250, "a"), ("L", 312, 640, "b"), ("R", 408, 640, "b")],
                  marks=[(1, 225, 250), (2, 215, 560), (3, 235, 640)], split=.5, slow=3.0, fast=1.6),
 ("A09", 4): dict(path=BULLET, tag="FROM OVERHEAD", bounces=[(360, 500)], hands=[("L", 296, 398, "a"), ("R", 424, 398, "a"), ("L", 312, 640, "b"), ("R", 408, 640, "b")],
                  marks=[(1, 230, 360), (2, 215, 560), (3, 235, 640)], split=.5),
 ("A15", 1): dict(path=W8, tag="NO DRIBBLE", hands=[("L", 150, 500, None), ("R", 570, 500, None)],
                  marks=[(1, 215, 362), (2, 300, 612), (3, 505, 362)]),
}
# Turned on only where the CEO asked: all Day 5 pretzel steps + the Day 9 steps with no clip.
ENABLED = {("A08", 1), ("A08", 2), ("A08", 3), ("A08", 4), ("A09", 2), ("A09", 3), ("A09", 4), ("A15", 1)}

def ball(r=30):
    return (f'<g><circle r="{r}" fill="{OR}" stroke="{INK}" stroke-width="6"/>'
            f'<path d="M{-r} 0H{r}M0 {-r}V{r}M{-r*.7:.0f} {-r*.7:.0f}Q0 0 {-r*.7:.0f} {r*.7:.0f}M{r*.7:.0f} {-r*.7:.0f}Q0 0 {r*.7:.0f} {r*.7:.0f}" '
            f'stroke="{INK}" stroke-width="3.5" fill="none"/><circle cx="{-r*.35:.0f}" cy="{-r*.4:.0f}" r="{r*.22:.0f}" fill="#fff" opacity=".45"/></g>')

def diagram(mid, step, cues, uid, step_text=""):
    if (mid, step) not in ENABLED or (mid, step) not in SPECS: return None
    s = SPECS[(mid, step)]; slow, fast = s.get("slow", 4.6), s.get("fast", 2.2); T = slow + fast; k = slow / T
    sp = s.get("split", .5)   # where hand set "a" hands over to "b" within a lap
    o = []
    o.append(f'<svg class="dg" viewBox="0 0 720 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated diagram, top-down view: {E(step_text)}. Cues: {E(cues)}">')
    o.append(f'<defs><pattern id="ht{uid}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="3.2" fill="#7a2c00" opacity=".16"/></pattern>'
             f'<radialGradient id="vg{uid}" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>')
    o.append(f'<rect width="720" height="900" fill="{OR}"/><rect width="720" height="900" fill="url(#ht{uid})"/>')
    # court lines (cream, comic)
    o.append(f'<g fill="none" stroke="{CREAM}" stroke-width="7" opacity=".5"><circle cx="360" cy="500" r="250"/><path d="M0 170H720M60 0V900M660 0V900"/></g>')
    o.append(f'<rect width="720" height="900" fill="url(#vg{uid})"/>')
    # front marker
    o.append(f'<g font-family="Anton,Impact,sans-serif" font-size="30" fill="{INK}" text-anchor="middle"><path d="M360 118l18 26h-36z" fill="{INK}"/><text x="360" y="105" letter-spacing="3">FRONT</text></g>')
    o.append('<g transform="translate(360 478) scale(1.22) translate(-360 -500)">')   # figure layer, scaled to fill the card
    # ball path: ink outline + white core
    o.append(f'<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="{s["path"]}" stroke="{INK}" stroke-width="22"/>'
             f'<path d="{s["path"]}" stroke="{WHITE}" stroke-width="10" stroke-dasharray="26 16"/></g>')
    # body (top-down): sneakers + shoulders + faceless head with headband
    for side, (x, y) in FEET.items():
        o.append(f'<g transform="translate({x} {y})"><ellipse rx="36" ry="62" fill="{INK}" stroke="{WHITE}" stroke-width="5"/>'
                 f'<ellipse cy="-36" rx="28" ry="20" fill="{OR}"/><text y="26" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="30" fill="{WHITE}">{side}</text></g>')
    hx, hy = HEAD
    o.append(f'<ellipse cx="{hx}" cy="{hy}" rx="150" ry="40" fill="{INK}" opacity=".6" stroke="{WHITE}" stroke-width="5"/>'
             f'<circle cx="{hx}" cy="{hy}" r="42" fill="{WHITE}" stroke="{INK}" stroke-width="6"/><circle cx="{hx}" cy="{hy}" r="30" fill="none" stroke="{OR}" stroke-width="12"/>')
    for (x, y) in s.get("bounces", []):
        o.append(f'<g transform="translate({x} {y})" stroke="{WHITE}" stroke-width="6" stroke-linecap="round"><path d="M-44 -30l-12 -8M44 -30l12 -8M-48 18l-14 6M48 18l14 6"/>'
                 f'<circle r="20" fill="none" stroke="{INK}" stroke-width="5" stroke-dasharray="7 6"/></g>')
    # numbered order markers
    for (n, x, y) in s["marks"]:
        o.append(f'<g transform="translate({x} {y})"><circle r="30" fill="{INK}" stroke="{WHITE}" stroke-width="5"/>'
                 f'<text y="13" text-anchor="middle" font-family="Lucky,Impact,sans-serif" font-size="38" fill="{WHITE}">{n}</text></g>')
    # hands (L/R); phase a = first part of each lap, b = the rest (synced to the ball's two laps)
    a_vals = f"0;{sp*k:.4f};{k:.4f};{k+sp*(1-k):.4f};1"
    for (lab, x, y, ph) in s["hands"]:
        anim = ""
        if ph:
            v = "1;0;1;0;1" if ph == "a" else "0;1;0;1;0"
            anim = f'<animate attributeName="opacity" values="{v}" keyTimes="{a_vals}" calcMode="discrete" dur="{T:.2f}s" repeatCount="indefinite"/>'
        o.append(f'<g transform="translate({x} {y})" opacity="{0 if ph == "b" else 1}">{anim}<circle r="34" fill="{WHITE}" stroke="{INK}" stroke-width="6"/>'
                 f'<text y="15" text-anchor="middle" font-family="Lucky,Impact,sans-serif" font-size="40" fill="{INK}">{lab}</text></g>')
    # the ball: one slow lap, one game-speed lap, smooth (spline) easing
    d2 = s["path"] + " " + s["path"]
    o.append(f'<g>{ball()}<animateMotion dur="{T:.2f}s" repeatCount="indefinite" path="{d2}" keyPoints="0;0.5;1" keyTimes="0;{k:.4f};1" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/></g>')
    o.append("</g>")
    # top chips: tag (starts at x=168, clear of the app's step-number badge) + speed (right)
    o.append(f'<g font-family="Anton,Impact,sans-serif" font-size="30" letter-spacing="2">'
             f'<rect x="168" y="24" width="{min(272, 30 + 14 * len(s["tag"]))}" height="54" rx="27" fill="{INK}"/><text x="183" y="60" font-size="25" fill="{WHITE}">{E(s["tag"])}</text>'
             f'<g><rect x="452" y="24" width="244" height="54" rx="27" fill="{WHITE}" stroke="{INK}" stroke-width="5"/>'
             f'<text x="574" y="62" text-anchor="middle" fill="{INK}">🐢 SLOW FIRST<animate attributeName="opacity" values="1;0;1" keyTimes="0;{k:.4f};1" calcMode="discrete" dur="{T:.2f}s" repeatCount="indefinite"/></text>'
             f'<text x="574" y="62" text-anchor="middle" fill="{OR}" opacity="0">🐇 GAME SPEED<animate attributeName="opacity" values="0;1;0" keyTimes="0;{k:.4f};1" calcMode="discrete" dur="{T:.2f}s" repeatCount="indefinite"/></text></g></g>')
    # cue card (CSV cues, word for word)
    lines = wrap(cues, 34)[:3]; h = 64 + 40 * len(lines)
    y0 = 880 - h
    o.append(f'<g><rect x="24" y="{y0}" width="672" height="{h}" rx="24" fill="{CREAM}" stroke="{INK}" stroke-width="6"/>'
             f'<text x="52" y="{y0 + 48}" font-family="Lucky,Impact,sans-serif" font-size="32" fill="{OR}">CUES</text>')
    for i, ln in enumerate(lines):
        o.append(f'<text x="52" y="{y0 + 92 + 40 * i}" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="32" font-weight="800" fill="{INK}">{E(ln)}</text>')
    o.append("</g></svg>")
    return "".join(o)

if __name__ == "__main__":   # preview: python3 tools/stepdiagram.py out.html
    import sys
    cues = {"A08": "Little hands, fast hands; mini squat; head up", "A09": "Bounce hard; hands ready behind; knees bent", "A15": "Low dribbles; wide stance"}
    html = "".join(f'<div style="display:inline-block;width:300px;margin:6px">{diagram(m, st, cues[m], f"{m}{st}")}</div>' for (m, st) in sorted(ENABLED))
    open(sys.argv[1], "w").write('<!doctype html><meta charset="utf-8"><body style="background:#111;margin:0">' + html)
