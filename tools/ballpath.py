"""Ball-path diagrams (top-down view, 4:5, same frame as the app loop clips).
Each move id maps to a path type; each type renders to assets/paths/<type>.svg.
Viewer = front. Feet at the middle, ball path in orange, dashes = behind the body."""
import os
OR, INK, LINE, MUTE = "#F77914", "#18181b", "#3a3a42", "#b9b4ad"
FEET = '<ellipse cx="64" cy="120" rx="8" ry="14" fill="#fff" opacity=".9"/><ellipse cx="96" cy="120" rx="8" ry="14" fill="#fff" opacity=".9"/>'
BODY = '<circle cx="80" cy="104" r="15" fill="none" stroke="#fff" stroke-width="3" opacity=".55"/>'
def ball(x, y, r=7): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{OR}" stroke="{INK}" stroke-width="1.5"/><path d="M{x-r} {y}h{2*r}M{x} {y-r}v{2*r}" stroke="{INK}" stroke-width="1"/>'
def bounce(x, y): return f'<circle cx="{x}" cy="{y}" r="3" fill="#fff"/>'
def path(d, dash=False): return f'<path d="{d}" fill="none" stroke="{OR}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"{" stroke-dasharray=\"6 7\"" if dash else ""} marker-end="url(#a)"/>'
def rings(x, y, n=3, step=6): return "".join(f'<circle cx="{x}" cy="{y}" r="{8+i*step}" fill="none" stroke="{OR}" stroke-width="2" opacity="{.8-i*.22:.2f}"/>' for i in range(n))
def cone(x, y): return f'<path d="M{x} {y-11}l9 18h-18z" fill="none" stroke="{MUTE}" stroke-width="2.5"/>'
def text(x, y, s, sz=11): return f'<text x="{x}" y="{y}" fill="{MUTE}" font-family="Arial,sans-serif" font-size="{sz}" font-weight="700" text-anchor="middle">{s}</text>'
T = {
 "stance": FEET + BODY + path("M56 150 L24 150") + path("M104 150 L136 150") + text(80, 185, "SIT LOW · SLIDE"),
 "pound": FEET + BODY + rings(124, 132) + ball(124, 132) + text(124, 170, "POUND") ,
 "ladder": FEET + BODY + rings(124, 132, 3, 9) + ball(124, 132) + text(124, 60, "HIGH") + text(140, 105, "MID", 10) + text(124, 175, "LOW"),
 "slaps": FEET + BODY + ball(80, 150, 9) + path("M64 168 L44 168") + path("M96 168 L116 168"),
 "kill": FEET + BODY + rings(124, 132, 4, 3) + ball(124, 132, 6) + text(124, 168, "FAST · LOW"),
 "vfront": FEET + BODY + path("M122 150 L80 168 L38 150") + bounce(80, 168) + ball(122, 150),
 "vside": FEET + BODY + path("M124 92 L132 130 L124 168") + bounce(132, 130) + ball(124, 92),
 "wrap": FEET + BODY + f'<ellipse cx="80" cy="110" rx="46" ry="38" fill="none" stroke="{OR}" stroke-width="4" stroke-dasharray="6 7"/>' + path("M126 112 L126 104") + ball(80, 148),
 "fig8": FEET + BODY + path("M80 120 C60 90 34 110 50 136 C62 152 76 140 80 120 C84 100 98 88 112 104 C126 120 110 152 86 128") + ball(80, 120),
 "fig8drib": FEET + BODY + path("M80 120 C60 90 34 110 50 136 C62 152 76 140 80 120 C84 100 98 88 112 104 C126 120 110 152 86 128") + bounce(50, 136) + bounce(112, 104) + bounce(80, 120) + ball(110, 140),
 "cross": FEET + BODY + path("M122 146 Q80 186 40 146") + bounce(80, 166) + ball(122, 146),
 "thru": FEET + BODY + path("M120 150 L80 124 L44 100") + bounce(80, 124) + ball(120, 150),
 "behind": FEET + BODY + path("M120 120 Q80 52 40 120", dash=True) + bounce(40, 120) + ball(120, 120),
 "ricochet": FEET + BODY + path("M80 160 L80 124 L80 80", dash=True) + bounce(80, 124) + ball(80, 160) + text(80, 190, "THROW · CATCH BEHIND"),
 "speed": FEET + BODY + path("M118 140 L118 192") + bounce(118, 155) + bounce(118, 175) + ball(118, 140) + text(46, 180, "PUSH IT AHEAD", 10),
 "control": FEET + BODY + f'<path d="M58 132 L36 150" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>' + rings(122, 132, 2) + ball(122, 132) + cone(30, 176) + text(80, 194, "ARM BAR", 10),
 "jumpstop": FEET + BODY + path("M80 40 L80 82") + f'<path d="M48 146 H112" stroke="#fff" stroke-width="4"/>' + text(80, 175, "LAND ON TWO"),
 "pivot": FEET + BODY + f'<path d="M96 150 A34 34 0 0 1 46 106" fill="none" stroke="{OR}" stroke-width="4" marker-end="url(#a)"/>' + f'<circle cx="64" cy="120" r="6" fill="{OR}"/>' + text(80, 186, "PIVOT FOOT DOWN", 10),
 "hesi": path("M120 20 L120 70") + f'<path d="M110 84 H130 M110 92 H130" stroke="#fff" stroke-width="4"/>' + path("M120 104 L120 176") + ball(120, 20) + cone(80, 130) + text(60, 92, "PAUSE · GO", 10),
 "pace": bounce(110, 30) + bounce(110, 44) + bounce(110, 58) + bounce(110, 72) + path("M110 84 L110 186") + bounce(110, 120) + bounce(110, 160) + ball(110, 30) + text(56, 60, "SLOW", 11) + text(56, 150, "FAST", 11),
 "stutter": "".join(f'<rect x="{68+(i%2)*14}" y="{40+i*12}" width="8" height="8" rx="2" fill="#fff" opacity=".8"/>' for i in range(6)) + path("M80 120 L80 188") + cone(124, 120) + text(124, 150, "FAST FEET", 10),
 "inout": FEET + BODY + path("M122 140 Q96 156 104 168 Q114 180 130 172") + bounce(102, 160) + ball(122, 140),
 "skip": FEET + BODY + ball(80, 152) + rings(80, 152, 2) + path("M80 152 Q120 150 124 110") + text(80, 192, "SKIP · SNATCH · WRAP", 10),
 "hang": FEET + BODY + ball(122, 128, 9) + f'<path d="M110 112 H134" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' + path("M122 146 Q80 190 40 150") + text(122, 96, "HANG", 11),
 "retreat": FEET + BODY + path("M80 150 L80 186") + path("M120 160 L120 60") + ball(120, 160) + text(80, 30, "BACK OUT", 11),
 "snatch": FEET + BODY + path("M120 120 L120 186") + path("M132 186 L132 120") + ball(120, 120) + text(80, 30, "DRIVE · PULL BACK", 10),
 "spin": FEET + BODY + f'<path d="M118 136 A42 42 0 1 1 46 140" fill="none" stroke="{OR}" stroke-width="4" marker-end="url(#a)"/>' + ball(118, 136) + text(80, 194, "SPIN TIGHT", 10),
 "halfspin": FEET + BODY + f'<path d="M118 136 A42 42 0 0 1 80 62" fill="none" stroke="{OR}" stroke-width="4" marker-end="url(#a)"/><path d="M76 68 A42 42 0 0 0 116 146" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 6" marker-end="url(#w)"/>' + ball(118, 136),
 "double": FEET + BODY + path("M122 140 Q80 172 42 146") + path("M42 160 Q80 192 118 166") + bounce(80, 158) + bounce(80, 182) + ball(122, 140),
 "pushpull": FEET + BODY + path("M118 140 L146 176") + path("M140 186 Q90 200 40 160") + ball(118, 140) + text(80, 30, "PUSH OUT · PULL ACROSS", 10),
 "combo": FEET + BODY + path("M122 146 Q80 184 42 150") + path("M42 150 L80 124 L118 104") + bounce(80, 166) + bounce(80, 124) + ball(122, 146),
 "chain": FEET + BODY + path("M122 150 Q80 186 42 150") + path("M42 150 L80 124 L118 108") + path("M118 108 Q80 48 40 104", dash=True) + ball(122, 150),
 "gauntlet": cone(40, 40) + cone(120, 100) + cone(40, 160) + path("M80 14 Q130 40 80 70 Q30 100 80 130 Q130 160 80 192") + ball(80, 14) + text(124, 40, "1", 12) + text(36, 104, "2", 12) + text(124, 164, "3", 12),
}
TYPE = {"A01":"stance","A02":"pound","A05":"slaps","A03":"ladder","A20":"pound","A10":"vfront","A11":"vside","A06":"wrap","A07":"fig8",
 "A21":"inout","A04":"kill","A12":"cross","A13":"thru","A14":"behind","A09":"ricochet","A15":"fig8drib","B01":"speed","B02":"control",
 "F01":"jumpstop","B04":"cross","B06":"hesi","B05":"inout","B07":"pace","B08":"stutter","C08":"hesi","C09":"stutter","B09":"skip",
 "B10":"thru","C01":"combo","B11":"behind","B18":"double","C07":"inout","B17":"hang","B14":"hang","B03":"retreat","B15":"snatch",
 "B12":"spin","F03":"pivot","B13":"halfspin","C12":"spin","C10":"behind","B16":"pushpull","C03":"combo","C04":"chain","C05":"chain",
 "C06":"chain","C02":"double","C11":"snatch","C13":"gauntlet"}
DEFS = (f'<defs><marker id="a" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{OR}"/></marker>'
        f'<marker id="w" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#fff"/></marker></defs>')
def svg(t):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200" width="160" height="200">{DEFS}'
            f'<rect width="160" height="200" rx="14" fill="{INK}"/><path d="M0 0" stroke="{LINE}"/>{T[t]}</svg>\n')
def write_all(root):
    out = os.path.join(root, "assets", "paths"); os.makedirs(out, exist_ok=True)
    for t in T: open(os.path.join(out, f"{t}.svg"), "w").write(svg(t))
    return out
