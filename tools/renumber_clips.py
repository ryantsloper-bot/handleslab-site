#!/usr/bin/env python3
"""Renumber app clip folders after a 30-day plan reorder.  Dry run by default; nothing moves without --apply.

Usage:
  python3 tools/renumber_clips.py [--map CSV] [--src DIR]            # dry run: print every move, check for problems
  python3 tools/renumber_clips.py --apply                            # do the moves (two-phase, via a staging folder)
  python3 tools/renumber_clips.py --remap-manifest assets/clips/manifest.json
        # rewrite a synced manifest's day keys to the NEW days while still pointing at the OLD asset folders
        # (lets the site use the new order before the source clips are moved and re-synced)

Map CSV (default <src>/renumber-2026-10-23.csv): columns old,new,move,status, e.g. day-15/C08,day-22/C08,C08,moves.
'day-NN/level-*' rows move a day's flat clips. Rows with status 'same' or old '(none yet)' are skipped.
Moves go old -> <src>/_renumber_staging/ -> new, so swaps (day 5 <-> 6) never collide. The README table's day
column ('| 15/C08 ...' or '| 13 | ...') is renumbered with --apply too. Afterwards run tools/sync_clips.py, then tools/build.py."""
import argparse, csv, glob, json, os, re, shutil, sys
ap = argparse.ArgumentParser()
ap.add_argument("--src", default="/workspace/hoops-ai/content/app-clips")
ap.add_argument("--map")
ap.add_argument("--apply", action="store_true")
ap.add_argument("--remap-manifest")
a = ap.parse_args()
MAP = a.map or os.path.join(a.src, "renumber-2026-10-23.csv")
rows = [r for r in csv.DictReader(open(MAP)) if r["status"] == "moves"]
day = lambda p: int(re.match(r"day-(\d\d)", p).group(1))

if a.remap_manifest:
    man = json.load(open(a.remap_manifest)); out = {}
    o2n = {(day(r["old"]), r["move"]): day(r["new"]) for r in rows}
    for d, moves in man.items():
        for mid, folder in moves.items():
            nd = o2n.get((int(d), mid), int(d))
            out.setdefault(str(nd), {})[mid] = folder
    json.dump(out, open(a.remap_manifest, "w"), indent=1, sort_keys=True)
    print(f"remapped {a.remap_manifest}: " + ", ".join(f"{mid} day {d}->{nd}" for (d, mid), nd in sorted(o2n.items()) if any(mid in v for v in man.values())))
    sys.exit(0)

problems, plan = [], []
srcs = {r["old"] for r in rows}
for r in rows:
    old, new = r["old"], r["new"]
    if old.endswith("/level-*"):
        files = sorted(glob.glob(os.path.join(a.src, old.replace("level-*", "level-[1-4].*"))))
        if not files: problems.append(f"{old}: no flat clips found")
        for f in files: plan.append((f, os.path.join(a.src, os.path.dirname(new), os.path.basename(f))))
    else:
        s = os.path.join(a.src, old)
        if not os.path.isdir(s): problems.append(f"{old}: folder missing"); continue
        plan.append((s, os.path.join(a.src, new)))
for _, dst in plan:   # a destination may exist only if it is itself being moved away
    rel = os.path.relpath(dst, a.src)
    if os.path.exists(dst) and rel not in srcs: problems.append(f"{rel}: already exists and is not in the map (would be overwritten)")
for s, d in plan:
    print(f"{'MOVE' if a.apply else 'would move'}  {os.path.relpath(s, a.src):<22} -> {os.path.relpath(d, a.src)}"
          f"  ({len(os.listdir(s)) if os.path.isdir(s) else 1} files)")
if problems:
    print("PROBLEMS (nothing moved):\n  " + "\n  ".join(problems)); sys.exit(1)
if not a.apply:
    print(f"dry run OK: {len(plan)} moves, 0 conflicts. Re-run with --apply, then tools/sync_clips.py and tools/build.py."); sys.exit(0)
stage = os.path.join(a.src, "_renumber_staging")
os.makedirs(stage)
staged = []
for i, (s, d) in enumerate(plan):
    t = os.path.join(stage, f"{i:03d}"); shutil.move(s, t); staged.append((t, d))
for t, d in staged:
    os.makedirs(os.path.dirname(d), exist_ok=True); shutil.move(t, d)
os.rmdir(stage)
for dd in glob.glob(os.path.join(a.src, "day-[0-9][0-9]")):
    if not os.listdir(dd): os.rmdir(dd)
rp = os.path.join(a.src, "README.md")
if os.path.exists(rp):
    o2n = {(day(r["old"]), r["move"]): day(r["new"]) for r in rows}
    def fix(m):
        d, mid = int(m.group(1)), m.group(2)
        return f"| {o2n.get((d, mid), d):02d}/{mid}"
    txt = re.sub(r"^\| (\d\d)/([A-Z]\d\d)", fix, open(rp).read(), flags=re.M)
    open(rp, "w").write(txt)
print(f"applied {len(plan)} moves. Now run tools/sync_clips.py and tools/build.py.")
