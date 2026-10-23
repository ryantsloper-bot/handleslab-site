#!/usr/bin/env python3
"""Copy app loop clips into the site and write assets/clips/manifest.json (day -> move id -> clip folder).

Source layouts (both supported, in content/app-clips/):
  day-NN/<MOVEID>/level-N.mp4 (+ .jpg)  per-move clips, e.g. day-06/A12/level-1.mp4  -> assets/clips/day-NN/<MOVEID>/
  day-NN/level-N.mp4 (+ .jpg)           flat clips (original layout)                   -> assets/clips/day-NN/
Flat clips belong to the move the README table names for that day ("| 06 | Kill dribble (A04) | ...").
If the README has no row for the day, the manifest stores "*" and build.py uses the day's primary move.
If a day has any per-move folder, its flat files are ignored (per-move folders always win). Moves without clips keep their ball-path diagram.
Every MP4 is kept under ~600 KB (re-encoded with ffmpeg if needed: H.264, no audio, faststart); posters under ~80 KB.
assets/clips/ is rebuilt from scratch each run, so removed or reassigned clips don't linger. Then run tools/build.py."""
import os, re, shutil, subprocess, sys, glob, json
SRC = sys.argv[1] if len(sys.argv) > 1 else "/workspace/hoops-ai/content/app-clips"
DST = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "clips"))
LIMIT, PLIMIT = 600_000, 80_000

readme_move = {}
rp = os.path.join(SRC, "README.md")
if os.path.exists(rp):
    for line in open(rp, encoding="utf-8"):
        m = re.match(r"\|\s*(\d{1,2})\s*\|[^|]*\(([A-Z]\d{2})\)", line)
        if m: readme_move[int(m.group(1))] = m.group(2)

def put(mp4, out):
    os.makedirs(out, exist_ok=True)
    lvl = os.path.splitext(os.path.basename(mp4))[0]; dst = os.path.join(out, lvl + ".mp4")
    if os.path.getsize(mp4) <= LIMIT:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4, "-c", "copy", "-an", "-movflags", "+faststart", dst], check=True)
    else:
        for crf in (28, 31, 34, 37):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4, "-an", "-vf", "scale=720:900:force_original_aspect_ratio=decrease,pad=720:900:(ow-iw)/2:(oh-ih)/2",
                            "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst], check=True)
            if os.path.getsize(dst) <= LIMIT: break
    if os.path.getsize(dst) > LIMIT: print("WARNING still over limit:", dst, os.path.getsize(dst))
    poster, pdst = os.path.splitext(mp4)[0] + ".jpg", os.path.join(out, lvl + ".jpg")
    if os.path.exists(poster):
        shutil.copyfile(poster, pdst)
        if os.path.getsize(pdst) > PLIMIT:
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", poster, "-vf", "scale=480:-2", "-q:v", "6", pdst], check=True)
    else:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", dst, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "6", pdst], check=True)
    print(f"{os.path.relpath(dst, DST)}: {os.path.getsize(dst)//1024} KB mp4, {os.path.getsize(pdst)//1024} KB poster")

if os.path.isdir(DST): shutil.rmtree(DST)
manifest, n = {}, 0
for ddir in sorted(glob.glob(os.path.join(SRC, "day-[0-9][0-9]"))):
    day = int(os.path.basename(ddir)[4:]); dname = f"day-{day:02d}"; moves = {}
    for mdir in sorted(glob.glob(os.path.join(ddir, "[A-Z][0-9][0-9]"))):          # per-move folders
        files = sorted(glob.glob(os.path.join(mdir, "level-[1-4].mp4")))
        if not files: continue
        mid = os.path.basename(mdir)
        for f in files: put(f, os.path.join(DST, dname, mid)); n += 1
        moves[mid] = f"{dname}/{mid}"
    flat = sorted(glob.glob(os.path.join(ddir, "level-[1-4].mp4")))
    fmid = readme_move.get(day, "*")
    if flat and moves:
        # per-move folders win: once a day has any <MOVEID>/ folder, its flat files are ignored (never mapped via README)
        print(f"{dname}: flat clips ignored, per-move folders present: {', '.join(sorted(moves))}")
    elif flat:                                                                        # flat layout (backward compatible)
        for f in flat: put(f, os.path.join(DST, dname)); n += 1
        moves[fmid] = dname
    if moves: manifest[str(day)] = moves
os.makedirs(DST, exist_ok=True)
json.dump(manifest, open(os.path.join(DST, "manifest.json"), "w"), indent=1, sort_keys=True)
print(f"synced {n} clips; manifest: {json.dumps(manifest)}")
