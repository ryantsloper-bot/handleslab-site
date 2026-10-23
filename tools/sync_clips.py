#!/usr/bin/env python3
"""Copy app loop clips into the site: content/app-clips/day-NN/level-N.mp4 (+ .jpg poster)
-> assets/clips/day-NN/level-N.{mp4,jpg}. Keeps every MP4 under ~600 KB (re-encodes with ffmpeg if
needed: H.264, no audio, faststart) and posters under ~80 KB. Then run tools/build.py."""
import os, shutil, subprocess, sys, glob
SRC = sys.argv[1] if len(sys.argv) > 1 else "/workspace/hoops-ai/content/app-clips"
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "clips")
LIMIT, PLIMIT = 600_000, 80_000
n = 0
for mp4 in sorted(glob.glob(os.path.join(SRC, "day-[0-9][0-9]", "level-[1-4].mp4"))):
    day = os.path.basename(os.path.dirname(mp4)); lvl = os.path.splitext(os.path.basename(mp4))[0]
    out = os.path.join(DST, day); os.makedirs(out, exist_ok=True)
    dst = os.path.join(out, lvl + ".mp4")
    if os.path.getsize(mp4) <= LIMIT:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4, "-c", "copy", "-an", "-movflags", "+faststart", dst], check=True)
    else:
        for crf in (28, 31, 34, 37):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4, "-an", "-vf", "scale=720:900:force_original_aspect_ratio=decrease,pad=720:900:(ow-iw)/2:(oh-ih)/2",
                            "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst], check=True)
            if os.path.getsize(dst) <= LIMIT: break
    if os.path.getsize(dst) > LIMIT: print("WARNING still over limit:", dst, os.path.getsize(dst))
    poster = os.path.splitext(mp4)[0] + ".jpg"
    pdst = os.path.join(out, lvl + ".jpg")
    if os.path.exists(poster):
        shutil.copyfile(poster, pdst)
        if os.path.getsize(pdst) > PLIMIT:
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", poster, "-vf", "scale=480:-2", "-q:v", "6", pdst], check=True)
    else:  # make a poster from the first frame
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", dst, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "6", pdst], check=True)
    n += 1; print(f"{day}/{lvl}: {os.path.getsize(dst)//1024} KB mp4, {os.path.getsize(pdst)//1024} KB poster")
print(f"synced {n} clips")
