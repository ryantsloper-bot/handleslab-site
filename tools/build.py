#!/usr/bin/env python3
"""Handles Lab static site build.  Usage:  python3 tools/build.py
Reads data/challenge.csv (the 49 challenge moves, already scrubbed of real player names by the
private export step outside this repo) and data/banned-name-hashes.txt, writes:
  index.html, day/1..30/index.html, 404.html, sitemap.xml, robots.txt
Then scans every generated file and FAILS if any real player name appears."""
import csv, html, os, re, sys, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ballpath

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = "https://handleslab.com"
E = lambda s: html.escape(str(s), quote=True)

TITLE = {1: "Stance + pound dribble", 2: "Pound ladder: high, middle, low", 3: "V-dribbles, front and side",
 4: "Ball wraps + figure-8 wrap", 5: "The pretzel", 6: "Stationary crossover + kill dribble",
 7: "Between the legs (stationary)", 8: "Behind the back (stationary)", 9: "Figure-8 dribble + ricochet",
 10: "On the move: speed, control, jump stop", 11: "Crossover on the move", 12: "Hesitation / rocker",
 13: "In-and-out", 14: "Change of pace + stutter step", 15: "First combos: hesi-cross, stutter-cross",
 16: "The skip dribble", 17: "Between the legs on the move", 18: "Killer crossover",
 19: "Behind the back on the move", 20: "Double crossover + in-and-out cross", 21: "Hesi-hold crossover",
 22: "Hang dribble", 23: "Retreat dribble + snatch back", 24: "Front pivot + spin move",
 25: "Half spin + cross into spin", 26: "Shake and bake", 27: "Push-pull crossover",
 28: "Combo chains: cross, thru, wrap", 29: "Sequence + snatch-back crossover", 30: "Final gauntlet: film it, compare to Day 1"}
SHORT = {1: "Pound", 2: "Ladder", 3: "V-dribble", 4: "Wraps", 5: "Pretzel", 6: "Cross", 7: "Thru", 8: "Behind",
 9: "Figure-8", 10: "Move", 11: "Cross", 12: "Hesi", 13: "In-out", 14: "Pace", 15: "Combos", 16: "Skip",
 17: "Thru", 18: "Killer", 19: "Behind", 20: "Double", 21: "Hold", 22: "Hang", 23: "Snatch", 24: "Spin",
 25: "Half spin", 26: "Shake", 27: "Push-pull", 28: "Chains", 29: "Sequence", 30: "Final"}
PHASES = [(1, 9, "Stationary", "Ball control without moving your feet. Pound, V-dribbles, wraps, crossover, through the legs, behind the back. No space needed."),
          (10, 14, "On the move", "Take it into a hallway or driveway: speed and control dribbles, the crossover on the move, hesitation, in-and-out, change of pace."),
          (15, 27, "Combos", "Harder moves and your first combos: between the legs and behind the back on the move, hang, snatch back, spin, shake and bake."),
          (28, 30, "Chains", "String it all together into nonstop chains, then the Day 30 gauntlet. Film it and compare it to Day 1.")]
def phase(d): return next(i + 1 for i, p in enumerate(PHASES) if p[0] <= d <= p[1])

# ---------- data ----------
rows = list(csv.DictReader(open(os.path.join(ROOT, "data", "challenge.csv"), encoding="utf-8")))
by = {r["id"]: r for r in rows}
dayof = {r["id"]: int(r["day"]) for r in rows}
days = collections.defaultdict(list)
for r in rows: days[int(r["day"])].append(r)
missing = [d for d in range(1, 31) if d not in days]
if missing: sys.exit(f"days with no moves: {missing}")
def pre_ids(r): return re.findall(r"\b([A-Z]\d{2})\b", r["prerequisites"])
def order(ms):  # same-day prerequisites first, then easier first, then id
    ids = {m["id"] for m in ms}; out = []; left = sorted(ms, key=lambda m: (int(m["difficulty"]), m["id"]))
    while left:
        for m in left:
            if all(p not in ids or p in [o["id"] for o in out] for p in pre_ids(m)):
                out.append(m); left.remove(m); break
        else: out += left; break
    return out
for d in days: days[d] = order(days[d])

# Each day's headline move (the 30-day plan's primary move). Loop clips (content/app-clips/day-NN/level-N.mp4,
# copied into assets/clips/ by tools/sync_clips.py) belong to this move's Step N.
PRIMARY = {1: "A02", 2: "A03", 3: "A10", 4: "A06", 5: "A08", 6: "A12", 7: "A13", 8: "A14", 9: "A15", 10: "B01", 11: "B04",
 12: "B06", 13: "B05", 14: "B07", 15: "C08", 16: "B09", 17: "B10", 18: "C01", 19: "B11", 20: "B18", 21: "B17", 22: "B14",
 23: "B15", 24: "B12", 25: "B13", 26: "C10", 27: "B16", 28: "C06", 29: "C02", 30: "C13"}
assert all(PRIMARY[d] in [m["id"] for m in days[d]] for d in range(1, 31))
def clip(d, i):
    base = f"assets/clips/day-{d:02d}/level-{i}"
    if os.path.exists(os.path.join(ROOT, base + ".mp4")):
        return "/" + base + ".mp4", ("/" + base + ".jpg") if os.path.exists(os.path.join(ROOT, base + ".jpg")) else ""
    return None
PATH_LABEL = {"stance": "stance and slides", "pound": "pound dribble beside the foot", "ladder": "pound at three heights",
 "slaps": "hand-to-hand taps", "kill": "fast low taps", "vfront": "V in front", "vside": "V at the side", "wrap": "wrap around the body",
 "fig8": "figure-8 around the legs", "fig8drib": "figure-8 dribble", "cross": "crossover in front", "thru": "between the legs",
 "behind": "behind the back", "ricochet": "through the legs, catch behind", "speed": "push the ball ahead", "control": "protect with an arm bar",
 "jumpstop": "two-foot stop", "pivot": "pivot around one foot", "hesi": "pause, then go", "pace": "slow, then fast",
 "stutter": "quick feet, then go", "inout": "fake in, back out", "skip": "skip, snatch, wrap", "hang": "hang, then cross",
 "retreat": "back out, re-attack", "snatch": "drive, pull back", "spin": "spin away", "halfspin": "half spin, spin back",
 "double": "two crossovers", "pushpull": "push out, pull across", "combo": "cross into between the legs", "chain": "three-move chain",
 "gauntlet": "three-chair gauntlet"}

def step_media(r, d, i):
    c = clip(d, i) if r["id"] == PRIMARY[d] else None
    t = ballpath.TYPE[r["id"]]
    svg = f'<img src="/assets/paths/{t}.svg" width="160" height="200" loading="lazy" alt="Ball path: {E(PATH_LABEL[t])}">'
    if c:
        mp4, poster = c
        return (f'<figure class="media"><video class="loop" muted loop playsinline preload="none" data-src="{mp4}"'
                f'{f" poster=\"{poster}\"" if poster else ""} width="720" height="900" aria-label="Step {i} loop: {E(r["move"])}"></video>'
                f'<noscript>{svg}</noscript></figure>')
    return f'<figure class="media">{svg}</figure>'

# ---------- levels (same mapping as the email sequence: hoops-ai/email/build_emails.py) ----------
TIERS = ["Beginner", "Intermediate", "Advanced", "Elite"]
TIER_TXT = {"Beginner": "Ball control and your first moves on the move: pound, V-dribbles, wraps, crossovers, hesitation, change of pace.",
            "Intermediate": "Between the legs and behind the back on the move, first combos, hang dribble, snatch back, the spin.",
            "Advanced": "Half spin, shake and bake, and the nonstop combo chains that finish the challenge.",
            "Elite": "The push-pull crossover: the hardest single move in the 30 days."}
def lvl_word(n): return {1: "Beginner", 2: "Beginner", 3: "Intermediate", 4: "Advanced", 5: "Elite"}[n]
def tier_label(t): return f"Level {TIERS.index(t) + 1} of 4 · {t}"   # the ONE way levels are counted everywhere
def day_lvl(d): return max(int(m["difficulty"]) for m in days[d])
def tier(d): return lvl_word(day_lvl(d))
def tier_i(d): return TIERS.index(tier(d)) + 1
def tier_days(t): return [d for d in range(1, 31) if tier(d) == t]
def ranges(ds):
    out = []; st = pv = None
    for d in ds:
        if st is None: st = pv = d
        elif d == pv + 1: pv = d
        else: out.append((st, pv)); st = pv = d
    if st is not None: out.append((st, pv))
    return ", ".join(f"{a}" if a == b else f"{a}-{b}" for a, b in out)
def name(r): return r["move"]

# Name guardrail. data/banned-name-hashes.txt holds SHA-256 hashes (not the names, since this repo is
# public and served as-is) of every real player name/nickname from the private move library.
import hashlib
def toks(s): return re.findall(r"[a-z0-9]+", html.unescape(s).lower())
def h(s): return hashlib.sha256(s.encode()).hexdigest()
BANNED = {l.strip() for l in open(os.path.join(ROOT, "data", "banned-name-hashes.txt")) if l.strip() and not l.startswith("#")}
def has_name(s):
    t = toks(s)
    for n in (1, 2, 3):
        for i in range(len(t) - n + 1):
            if h(" ".join(t[i:i + n])) in BANNED: return " ".join(t[i:i + n])
    return None

def sources(r):
    out = []
    for s in r["sources"].split(" | "):
        s = s.strip()
        if not s: continue
        m = re.match(r"(.*?) - (https?://\S+)$", s)
        if m:
            label = m.group(1).replace(", ", ": ", 1)
            out.append(f'<a href="{E(m.group(2))}" rel="nofollow noopener" target="_blank">{E(label)}</a>')
        else: out.append(E(s))
    return out

# ---------- shared chrome ----------
def head(title, desc, path, extra=""):
    url = SITE + path
    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0e0e10">
<meta property="og:type" content="website"><meta property="og:site_name" content="Handles Lab">
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/assets/img/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Handles Lab: free 30-day dribbling challenge">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@handleslab">
<meta name="twitter:title" content="{E(title)}"><meta name="twitter:description" content="{E(desc)}">
<meta name="twitter:image" content="{SITE}/assets/img/og.jpg">
<link rel="icon" href="/assets/img/icon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/luckiest-guy-400.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/anton-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">{extra}
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav"><div class="wrap">
<a class="brand" href="/"><img src="/assets/img/icon-180.png" alt="" width="34" height="34">Handles Lab</a>
<nav aria-label="Main"><ul><li><a href="/#days">The 30 days</a></li><li><a href="/#how">How a day works</a></li><li><a href="/#parents">For parents</a></li><li><a href="/#app">The app</a></li></ul></nav>
<a class="btn sm" href="/day/1/">Start Day 1 free</a>
</div></header>
"""

def foot():
    import json
    tiers = json.dumps({d: tier(d) for d in range(1, 31)}, separators=(",", ":"))
    return f"""<footer><div class="wrap">
<div><a class="brand" href="/"><img src="/assets/img/icon-180.png" alt="" width="34" height="34">Handles Lab</a>
<p>The free 30-day at-home dribbling challenge.<br>Not affiliated with any league or team.</p></div>
<nav aria-label="Social"><a href="https://www.tiktok.com/@thehandleslab">TikTok</a><a href="https://www.instagram.com/thehandleslab">Instagram</a><a href="https://x.com/handleslab">X</a><a href="https://www.youtube.com/@HandlesLab">YouTube</a></nav>
<p>© {datetime.date.today().year} Handles Lab · Practice safely: clear space, supervise young kids.</p>
</div></footer>
<script>window.HL={{tiers:{tiers},order:{json.dumps(TIERS)}}};</script>
<script src="/assets/signup.js" defer></script><script src="/assets/progress.js" defer></script>
</body></html>
"""

def signup_form(tag, button, placeholder="you@email.com"):
    """The ONE signup component, used everywhere. tag = 'challenge' or 'waitlist'.
    Provider wiring (MailerLite) lives only in assets/signup.js."""
    fid = f"su-{tag}"
    return f"""<form class="su-form" data-signup="{tag}" novalidate>
<label class="sr" for="{fid}-name">First name (optional)</label>
<input id="{fid}-name" type="text" name="name" autocomplete="given-name" placeholder="First name (optional)">
<label class="sr" for="{fid}">Email address</label>
<input id="{fid}" type="email" name="email" autocomplete="email" inputmode="email" placeholder="{placeholder}" required>
<span class="hp" aria-hidden="true"><input class="hpi" type="text" name="_honey" tabindex="-1" autocomplete="off"></span>
<button class="btn" type="submit">{E(button)}</button>
<p class="su-fine">Under 13? Have a parent sign up for you. No spam, unsubscribe anytime.</p>
<p class="su-note" role="status" aria-live="polite"></p>
</form>"""

def daymap(cur=None, mini=False):
    li = []
    for d in range(1, 31):
        c = ' class="cur" aria-current="page"' if d == cur else ""
        li.append(f'<li><a href="/day/{d}/" data-day="{d}" data-ph="{tier_i(d)}" data-tier="{tier(d)}"{c} title="Day {d}: {E(TITLE[d])}">{d}<small>{E(SHORT[d])}</small></a></li>')
    return f'<ol class="map{" mini" if mini else ""}" aria-label="30-day progress map">' + "".join(li) + "</ol>"

def legend():
    cols = ["var(--ink2)", "#1d1712", "#24170d", "#2e1806"]
    return '<div class="legend">' + "".join(f'<span><i style="background:{c}"></i>{t}</span>' for c, t in zip(cols, TIERS)) + '<span>✓ done · 🔒 locked · ● today (saved on this device)</span></div>'

def diff(n):
    t = lvl_word(int(n)); k = TIERS.index(t) + 1
    return f'<span class="diff" aria-label="{tier_label(t)}">' + "".join(f'<i class="{"on" if i < k else ""}"></i>' for i in range(4)) + f' &nbsp;{tier_label(t)}</span>'

# ---------- landing ----------
def landing():
    a02 = by["A02"]
    phases = "".join(f'<div class="card phase"><span class="days">Level {TIERS.index(t)+1} of 4 · Days {ranges(tier_days(t))}</span><h3>{t}</h3><p>{E(TIER_TXT[t])}</p></div>' for t in TIERS)
    where = " · ".join(f"Days {a}-{b}: {n.lower()}" for a, b, n, _ in PHASES)
    steps = "".join(f"<li><div><b>Step {i}</b>{E(a02['step'+str(i)])}</div></li>" for i in range(1, 5))
    kid = lambda i: E(by[i]["kid_version"])
    return head("Handles Lab · Free 30-Day Dribbling Challenge",
                "A free, at-home 30-day dribbling challenge for kids and grown-ups. One move a day, four steps, just a ball. Start Day 1 now.", "/") + f"""
<main id="main">
<section class="hero" style="border:0"><div class="wrap">
<div>
<span class="kicker">Free 30-day dribbling challenge</span>
<h1>Master your handles.<em>One move a day.</em></h1>
<p class="lead">A free 30-day at-home dribbling challenge. Every move is broken into four steps, from easy to game speed. Ten to fifteen minutes a day. Just you and a ball.</p>
<div class="ctas"><a class="btn" href="/day/1/">Start Day 1 free →</a><a class="btn ghost" href="#days">See all 30 days</a></div>
<ul class="facts"><li>100% free</li><li>10-15 minutes a day</li><li>Kid tips every day</li><li>No sign-up needed</li></ul>
</div>
<div class="hero-art"><img src="/assets/img/hero.webp" width="720" height="1280" alt="The Handles Lab athlete: a faceless white comic-style player spinning a basketball on one finger" fetchpriority="high">
<span class="badge">Day 1 → Day 30</span></div>
</div></section>

<section id="levels"><div class="wrap">
<div class="sec-head"><span class="kicker">How it works</span><h2>Built like a video game.</h2>
<p>Every move is broken into four steps. Lock in Step 1, then step up. By Day 30 you're chaining combos.</p></div>
<div class="grid g3">
<div class="card"><span class="n">01</span><h3>Warm up</h3><p>2-3 minutes reviewing the last three days' moves, so nothing you learned fades.</p></div>
<div class="card"><span class="n">02</span><h3>Step 1 → Step 4</h3><p>Today's new move in four steps, 3 sets with each hand. Move up only when the step before feels easy.</p></div>
<div class="card"><span class="n">03</span><h3>Say the cues</h3><p>Three short cues per move, like "fingertips not palm" and "eyes up". Kids say them out loud.</p></div>
</div></div></section>

<section id="days"><div class="wrap">
<div class="sec-head"><span class="kicker">The plan</span><h2>What the 30 days look like</h2>
<p>Four levels: Level 1 of 4 · Beginner, Level 2 of 4 · Intermediate, Level 3 of 4 · Advanced, Level 4 of 4 · Elite. A day's level is set by its hardest move. Finish every day of one level to unlock the next. Every page stays open to preview.</p></div>
<div class="grid g4">{phases}</div>
<p style="color:var(--mute);font-size:15px;margin-top:16px">Where you'll train: {E(where)}.</p>
<div class="statrow" data-stats hidden><span>🔥 Streak: <b data-streak>0</b> day(s)</span><span>✓ <b data-count>0</b>/30 done</span><span data-badges></span><a class="btn sm" data-today-link href="/day/1/">Go to today</a></div>
<div style="margin-top:20px">{daymap()}{legend()}</div>
</div></section>

<section id="how"><div class="wrap split">
<div>
<div class="sec-head"><span class="kicker">How a day works</span><h2>Warm up. Four steps. Three cues.</h2>
<p>Each day starts with 2-3 minutes reviewing the last few days' moves. Then the new move, from Step 1 to Step 4: 3 sets with each hand. Only move up a step when the one before feels easy.</p></div>
<p class="kicker" style="margin:0 0 10px">Example: Day 1 · Pound dribble</p>
<ol class="steps">{steps}</ol>
<div class="cues"><span>Cues</span><span>{E(a02['cues'])}</span></div>
<p style="color:var(--mute);margin-top:22px"><b style="color:#fff">Gear:</b> a ball. Later days add 1-3 chairs or cones and about 20 ft of hallway or driveway. No hoop needed: this challenge is dribbling only.</p>
</div>
<figure class="shots" style="margin:0" aria-label="Day 1 lesson cards">
<div><picture><source srcset="/assets/img/day1-stance.webp" type="image/webp"><img src="/assets/img/day1-stance.jpg" width="540" height="960" loading="lazy" alt="Day 1 card: athletic stance, feet wide, sit like a chair"></picture><figcaption>Stance</figcaption></div>
<div><picture><source srcset="/assets/img/day1-pound-right.webp" type="image/webp"><img src="/assets/img/day1-pound-right.jpg" width="540" height="960" loading="lazy" alt="Day 1 card: pound dribble with the right hand, knee high"></picture><figcaption>Pound right</figcaption></div>
<div><picture><source srcset="/assets/img/day1-pound-left.webp" type="image/webp"><img src="/assets/img/day1-pound-left.jpg" width="540" height="960" loading="lazy" alt="Day 1 card: pound dribble with the left hand"></picture><figcaption>Pound left</figcaption></div>
</figure>
</div></section>

<section id="parents" class="parents"><div class="wrap split">
<div class="sec-head"><span class="kicker">For kids & parents</span><h2>Built so a 7-year-old can start on Day 1</h2>
<p>Every move has a level, from Beginner to Elite, and every day has a kid version: a simpler way in, often a game. Parents don't need to know basketball. Read the steps out loud and play the defender when a day asks for one.</p>
<p><a class="btn" href="/day/1/" style="margin-top:14px">Try Day 1 together</a></p></div>
<ul class="tips">
<li><b>Right-size the ball.</b> {kid('A02')}.</li>
<li><b>Make it a game.</b> Day 1 stance: {kid('A01')}. Day 12 hesitation: {kid('B06')}.</li>
<li><b>Quiet indoor option.</b> Day 2 seated dribbling: {kid('A20')}.</li>
<li><b>You're the defender.</b> Day 10 control dribble: {kid('B02')}.</li>
<li><b>Slow is fine.</b> Harder days tell kids to stop at Step 2 or 3, or walk it through. Going slower beats getting sloppy.</li>
</ul>
</div></section>

<section id="inbox"><div class="wrap">
<div class="signup">
<div><span class="kicker" style="color:var(--ink)">Optional</span><h2>Get each day in your inbox</h2>
<p>One short email per day with that day's move. No spam, unsubscribe anytime. Prefer not to? Every day is open on the site, no sign-up needed.</p></div>
<div>{signup_form("challenge", "Send me Day 1")}</div>
</div></div></section>

<section id="app"><div class="wrap split">
<div class="sec-head"><span class="kicker">Coming next</span><h2>The Handles Lab app</h2>
<p>We're building an app version of the challenge for after Day 30, with more moves and lessons and practice plans for each player.
Join the waitlist to hear when it opens. Founding price: <b style="color:#fff">$29.99 for the first year</b> for people on the waitlist. The 30-day challenge stays free.</p></div>
<div class="card"><h3>Join the app waitlist</h3><p style="margin-bottom:16px">One email when the app is ready. That's it.</p>{signup_form("waitlist", "Join the waitlist")}</div>
</div></section>

<section id="faq"><div class="wrap" style="max-width:820px">
<div class="sec-head"><span class="kicker">FAQ</span><h2>Questions</h2></div>
<details><summary>Is it really free?</summary><p>Yes. All 30 days are on this site, free, with no account. The paid app is a separate, optional product for later.</p></details>
<details><summary>What age is it for?</summary><p>Anyone who can bounce a ball. Days 1-14 are Level 1 of 4 · Beginner moves a young kid can start with; every day includes a kid version. Later days reach Advanced and Elite for older players.</p></details>
<details><summary>Do I need a hoop or a court?</summary><p>No. It's dribbling only. Days 1-9 need about a 3x3 ft spot; later days use 1-3 chairs or cones and up to 20 ft of hallway or driveway.</p></details>
<details><summary>What if we miss a day or a move is too hard?</summary><p>Repeat the day. Stay on Step 1 or 2 until it feels easy. The challenge is 30 lessons, not 30 calendar days.</p></details>
<details><summary>How do I track progress?</summary><p>Tap "Mark day done" at the bottom of each day. It's saved in your browser on that device, and the 30-day map shows a ✓ on finished days.</p></details>
</div></section>

<section style="text-align:center"><div class="wrap"><h2>Day 1 takes 10 minutes.</h2><p class="lead" style="margin:16px auto 26px">Stance and the pound dribble. Grab a ball.</p><a class="btn" href="/day/1/">Start Day 1 free →</a></div></section>
</main>
""" + foot()

# ---------- day pages ----------
DAY1_IMGS = """<figure class="shots" style="margin:0 0 22px" aria-label="Day 1 lesson cards">
<div><picture><source srcset="/assets/img/day1-stance.webp" type="image/webp"><img src="/assets/img/day1-stance.jpg" width="540" height="960" alt="Athletic stance: feet wide, sit like a chair"></picture></div>
<div><picture><source srcset="/assets/img/day1-pound-right.webp" type="image/webp"><img src="/assets/img/day1-pound-right.jpg" width="540" height="960" loading="lazy" alt="Pound dribble, right hand, knee high"></picture></div>
<div><picture><source srcset="/assets/img/day1-pound-left.webp" type="image/webp"><img src="/assets/img/day1-pound-left.jpg" width="540" height="960" loading="lazy" alt="Pound dribble, left hand, then down to ankle high"></picture></div></figure>"""

def move_card(r, d):
    pre = []
    for p in pre_ids(r):
        if p in by: pre.append(f'<a href="/day/{dayof[p]}/">{E(name(by[p]))}</a> (Day {dayof[p]})')
    aka = r["aliases"]
    steps = "".join(f'<li class="stepcard">{step_media(r, d, i)}<div><b>Step {i}</b>{E(r["step"+str(i)])}</div></li>' for i in range(1, 5))
    src = sources(r)
    return f"""<article class="move" id="{r['id'].lower()}">
<div class="move-head"><h2 style="font-size:clamp(28px,4.5vw,40px)">{E(name(r))}</h2>{diff(r['difficulty'])}</div>
{f'<p class="aka">Also called: {E(aka)}</p>' if aka else ''}
<p class="how">{E(r['how_it_works'])}</p>
<ol class="steps cards">{steps}</ol>
<div class="cues"><span>Cues</span><span>{E(r['cues'])}</span></div>
<div class="kid"><span>Kid version</span><span>{E(r['kid_version'])}</span></div>
<label class="chk"><input type="checkbox" data-chk="{d}-{r['id']}"> <span><b>Self-check:</b> Did you hit 20 clean reps? <small>(at the highest step you reached today)</small></span></label>
<div class="facts2"><span><b>Gear:</b> {E(r['equipment'])}</span>{f'<span><b>Builds on:</b> ' + ', '.join(pre) + '</span>' if pre else ''}</div>
{f'<p class="credits">Sources: ' + ' · '.join(src) + '</p>' if src else ''}
</article>"""

def lockbox(d):
    t = tier_i(d)
    if t == 1: return ""
    need = [x for x in range(1, d) if tier_i(x) < t]
    prev = TIERS[t - 2]
    return (f'<div class="lockbox" data-lock data-need="{",".join(map(str, need))}" hidden><p><b>🔒 {tier_label(tier(d))} is locked.</b> '
            f'Mark every earlier day done first (the {prev} days and below): <span data-missing></span>.</p>'
            f'<p><a href="#main" data-preview>Preview this day anyway</a> · <a data-next-open href="/day/1/">Go to your next open day</a></p></div>')

def teaser(d):
    if d == 30: return '<div class="teaser"><span class="kicker">Tomorrow</span><p><b>Run the Day 30 gauntlet again and compare it with your Day 1 video.</b></p></div>'
    nxt = days[d + 1]
    main = by[PRIMARY[d + 1]]
    return (f'<div class="teaser"><span class="kicker">Tomorrow · Day {d+1} · {tier_label(tier(d+1))}</span>'
            f'<p><b>{E(main["move"])}</b>: {E(main["how_it_works"].split(". ")[0].rstrip("."))}.</p>'
            f'<a href="/day/{d+1}/">Peek at Day {d+1} →</a></div>')

def day_page(d):
    ms = days[d]; ph = PHASES[phase(d) - 1]
    lvl = max(int(m["difficulty"]) for m in ms)
    review = "".join(f'<li><a href="/day/{p}/">Day {p}: {E(TITLE[p])}</a></li>' for p in range(max(1, d - 3), d))
    warm = (f'<div class="warm"><h3>Warm-up · 2-3 min</h3><p style="margin:6px 0 0;color:var(--mute)">Quick review of the last few days, then today\'s new move{"s" if len(ms) > 1 else ""}: Step 1 to Step 4, 3 sets each hand.</p><ul>{review}</ul></div>'
            if d > 1 else '<div class="warm"><h3>How today works</h3><p style="margin:6px 0 0;color:var(--mute)">Do each move from Step 1 to Step 4: 3 sets with each hand. Only move up a step when the one before feels easy. Say the cues out loud.</p></div>')
    prev = f'<a class="prev" href="/day/{d-1}/"><small>← Day {d-1}</small>{E(TITLE[d-1])}</a>' if d > 1 else '<a class="prev" href="/"><small>← Home</small>The 30-day plan</a>'
    nxt = f'<a class="next" href="/day/{d+1}/"><small>Day {d+1} →</small>{E(TITLE[d+1])}</a>' if d < 30 else '<a class="next" href="/#app"><small>Finished →</small>What comes next</a>'
    items = [g.strip() for m in ms for g in re.split(r"[;,]", m["equipment"])]
    gear = ", ".join(dict.fromkeys(g for g in items if g and g.lower() not in ("none", "none/ball", "no space"))) or "Ball"
    desc = f"Day {d} of the free Handles Lab 30-day dribbling challenge: {TITLE[d]}. Four progressive steps, coaching cues and a kid version."
    if d == 30:
        tail = f"""<div class="signup" style="margin:10px 0 40px"><div><span class="kicker" style="color:var(--ink)">You finished</span><h2>30 days done. What's next?</h2>
<p>The Handles Lab app picks up where the challenge ends, with more moves and lessons and plans for each player. Join the waitlist: the founding price is $29.99 for the first year.</p></div>
<div>{signup_form("waitlist", "Join the app waitlist")}</div></div>"""
    else:
        tail = f"""<div class="signup" style="margin:10px 0 18px"><div><h2 style="font-size:clamp(28px,4vw,40px)">Get each day in your inbox</h2><p>One short email per day. Optional: every day stays open here.</p></div>
<div>{signup_form("challenge", "Email me each day")}</div></div>
<p style="text-align:center;color:var(--mute);font-size:15px;margin:0 0 40px">After Day 30: the Handles Lab app is coming. <a href="/#app">Join the waitlist</a> ($29.99 founding price for the first year).</p>"""
    body = f"""<main id="main">
<section class="dayhero" style="border:0"><div class="wrap">
<p class="crumb"><a href="/">Handles Lab</a> / <a href="/#days">30-day challenge</a> / Day {d}</p>
<div class="daynum">Day {d} of 30 · {tier_label(tier(d))}</div>
<h1>{E(TITLE[d])}</h1>
<ul class="meta"><li>{len(ms)} move{"s" if len(ms) > 1 else ""}</li><li>{tier_label(tier(d))}</li><li>Gear: {E(gear)}</li></ul>
<div style="margin-top:26px">{daymap(d, mini=True)}</div>
{lockbox(d)}
</div></section>
<section class="daybody"><div class="wrap" style="max-width:860px">
{warm}
{DAY1_IMGS if d == 1 else ''}
{''.join(move_card(m, d) for m in ms)}
<div class="done-row"><button class="btn" type="button" data-mark="{d}" aria-pressed="false">Mark Day {d} done</button><span class="done-hint" data-hint>Tick the self-check on every move first.</span></div>
<p class="statline"><span>🔥 Streak: <b data-streak>0</b> day(s)</span> · <span><b data-count>0</b>/30 days done on this device</span></p>
<div class="unlock" data-unlock hidden role="status" aria-live="polite"></div>
{teaser(d)}
<nav class="pager" aria-label="Day navigation">{prev}{nxt}</nav>
{tail}
</div></section>
</main>
"""
    return head(f"Day {d}: {TITLE[d]} · Handles Lab 30-Day Dribbling Challenge", desc, f"/day/{d}/") + body + foot()

def write(rel, s):
    p = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8").write(s)

out = {"index.html": landing()}
for d in range(1, 31): out[f"day/{d}/index.html"] = day_page(d)
out["404.html"] = head("Page not found · Handles Lab", "Page not found.", "/404.html") + '<main id="main"><section style="border:0;text-align:center"><div class="wrap"><h1>Air ball.</h1><p class="lead" style="margin:16px auto 28px">That page doesn\'t exist.</p><a class="btn" href="/">Back to Handles Lab</a> <a class="btn ghost" href="/day/1/">Start Day 1</a></div></section></main>' + foot()
out["sitemap.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"<url><loc>{SITE}/{u}</loc></url>\n" for u in [""] + [f"day/{d}/" for d in range(1, 31)]) + "</urlset>\n"
out["robots.txt"] = f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n"
out["site.webmanifest"] = '{"name":"Handles Lab","short_name":"Handles Lab","start_url":"/","display":"standalone","background_color":"#0e0e10","theme_color":"#ff7a1a","icons":[{"src":"/assets/img/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"/assets/img/icon-512.png","sizes":"512x512","type":"image/png"}]}\n'

# ---------- PWA app v1 (unlinked staging: /app-preview/, noindex, not in sitemap) ----------
import json
def app_data():
    D = []
    for d in range(1, 31):
        mv = []
        for r in days[d]:
            st = []
            for i in range(1, 5):
                c = clip(d, i) if r["id"] == PRIMARY[d] else None
                st.append({"t": r["step" + str(i)], "clip": c[0] if c else "", "poster": c[1] if c else ""})
            mv.append({"id": r["id"], "name": r["move"], "lvl": int(r["difficulty"]), "tier": lvl_word(int(r["difficulty"])), "tierLabel": tier_label(lvl_word(int(r["difficulty"]))),
                       "how": r["how_it_works"], "cues": r["cues"], "kid": r["kid_version"], "gear": r["equipment"],
                       "path": ballpath.TYPE[r["id"]], "pathLabel": PATH_LABEL[ballpath.TYPE[r["id"]]], "steps": st})
        D.append({"d": d, "title": TITLE[d], "tier": tier(d), "tierLabel": tier_label(tier(d)), "tierN": TIERS.index(tier(d)) + 1, "phase": PHASES[phase(d) - 1][2],
                  "primary": PRIMARY[d], "primaryName": by[PRIMARY[d]]["move"], "moves": mv})
    return {"v": 1, "tiers": TIERS, "days": D}

def app_index():
    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Handles Lab</title>
<meta name="description" content="Handles Lab app preview.">
<meta name="theme-color" content="#F77914">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Handles Lab">
<link rel="manifest" href="/app-preview/manifest.webmanifest">
<link rel="icon" href="/assets/img/icon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<link rel="preload" href="/assets/fonts/luckiest-guy-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/anton-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/app-preview/app.css">
</head><body>
<div class="shell">
<header class="top">
 <div class="brand"><img src="/assets/img/icon-180.png" alt="" width="30" height="30"><span>Handles Lab</span></div>
 <div class="top-r"><span class="chip" id="lvlchip">Beginner</span><span class="flame" id="streak" aria-label="Streak"><i>🔥</i><b>0</b></span></div>
</header>
<main>
<section class="panel" id="tab-today" aria-label="Today"></section>
<section class="panel" id="tab-map" aria-label="Map" hidden></section>
<section class="panel" id="tab-founding" aria-label="Founding" hidden>
 <div class="found-hero"><img src="/assets/img/athlete.webp" alt="The Handles Lab athlete spinning a basketball" width="720" height="720"></div>
 <p class="kick">Founding members</p>
 <h1 class="disp">The full app is coming.</h1>
 <p class="lead">This preview runs the free 30-day challenge. The full Handles Lab app adds more moves and lessons and practice plans for each player.</p>
 <div class="price"><span class="amt">$29.99</span><span class="per">for your first year<br>founding price</span></div>
 <ul class="ticks"><li>Join the waitlist. We email you once, when the app opens.</li><li>Waitlist members get the $29.99 first-year founding price.</li><li>The 30-day challenge stays free, with or without the app.</li></ul>
 <div class="found-form">{signup_form("waitlist", "Join the founding waitlist")}</div>
</section>
</main>
<nav class="tabs" aria-label="App">
 <button data-tab="today" aria-current="page"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>Today</span></button>
 <button data-tab="map"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Map</span></button>
 <button data-tab="founding"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6 6 1-4.5 4.4 1 6.6L12 17l-5.5 3 1-6.6L3 9l6-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span>Founding</span></button>
</nav>
</div>
<div class="player" id="player" hidden></div>
<div class="sheet-bg" id="sheet" hidden></div>
<div class="celebrate" id="celebrate" hidden></div>
<script src="/app-preview/data.js"></script>
<script src="/assets/signup.js" defer></script>
<script src="/app-preview/app.js" defer></script>
</body></html>
"""
out["app-preview/index.html"] = app_index()
out["app-preview/data.js"] = "window.HLAPP=" + json.dumps(app_data(), ensure_ascii=False, separators=(",", ":")) + ";\n"
out["app-preview/manifest.webmanifest"] = json.dumps({"name": "Handles Lab", "short_name": "Handles Lab", "description": "One dribbling move a day. 30 days.",
    "id": "/app-preview/", "start_url": "/app-preview/", "scope": "/app-preview/", "display": "standalone", "orientation": "portrait",
    "background_color": "#0e0e10", "theme_color": "#F77914",
    "icons": [{"src": "/assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "/assets/img/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}, indent=1) + "\n"

# ---------- guardrail: no player names anywhere that gets served ----------
bad = []
for rel, s in out.items():
    for i, line in enumerate(s.splitlines(), 1):
        m = has_name(line)
        if m: bad.append(f"{rel}:{i}: '{m}'")
for dp, dn, fn in os.walk(ROOT):  # every other text file in the repo is served by GitHub Pages too
    if ".git" in dp.split(os.sep): continue
    for f in fn:
        rel = os.path.relpath(os.path.join(dp, f), ROOT)
        if rel in out or not f.endswith((".html", ".js", ".css", ".csv", ".py", ".txt", ".xml", ".md", ".json", ".webmanifest")): continue
        if f == "banned-name-hashes.txt": continue
        for i, line in enumerate(open(os.path.join(dp, f), encoding="utf-8", errors="ignore"), 1):
            m = has_name(line)
            if m: bad.append(f"{rel}:{i}: '{m}'")
if bad:
    print("BUILD FAILED: player names found:\n" + "\n".join(bad)); sys.exit(1)
ballpath.write_all(ROOT)
for rel, s in out.items(): write(rel, s)
print(f"built {len(out)} files; days 1-30 cover {len(rows)} moves; name check passed ({len(BANNED)} banned names, whole repo scanned)")
