#!/usr/bin/env python3
"""Prerequisite check for the 30-day plan.  Usage: python3 tools/check_prereqs.py  (exit 1 on any problem)
- every prerequisite id of every challenge move is itself in the challenge and introduced on an EARLIER day
  (or the same day, ordered before it by build.py)
- every day 1-30 has moves and its PRIMARY move is on that day
- every 'Builds on' link on the built day pages points at the day that teaches that move
- no retired move id (RETIRED) is left in the data, app data or clip manifest"""
import csv, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RETIRED = {"A08"}   # pretzel, cut from the challenge 2026-10-23
rows = list(csv.DictReader(open(os.path.join(ROOT, "data", "challenge.csv"), encoding="utf-8")))
day = {r["id"]: int(r["day"]) for r in rows}
name = {r["id"]: r["move"] for r in rows}
src = open(os.path.join(ROOT, "tools", "build.py"), encoding="utf-8").read()
PRIMARY = {int(k): v for k, v in re.findall(r'(\d+): "([A-Z]\d{2})"', re.search(r"PRIMARY = \{(.*?)\}", src, re.S).group(1))}
bad, n = [], 0
for d in range(1, 31):
    if not any(v == d for v in day.values()): bad.append(f"day {d}: no moves")
    if day.get(PRIMARY.get(d)) != d: bad.append(f"day {d}: primary {PRIMARY.get(d)} is not on that day")
for r in rows:
    for p in re.findall(r"\b([A-Z]\d{2})\b", r["prerequisites"]):
        n += 1
        if p not in day: bad.append(f"{r['id']} (day {r['day']}): prerequisite {p} is not in the challenge")
        elif day[p] > int(r["day"]): bad.append(f"{r['id']} (day {r['day']}): prerequisite {p} comes later (day {day[p]})")
for d in range(1, 31):
    page = open(os.path.join(ROOT, "day", str(d), "index.html"), encoding="utf-8").read()
    for m in re.finditer(r'<b>Builds on:</b> (.*?)</span>', page):
        for href, txt, dd in re.findall(r'<a href="/day/(\d+)/">([^<]*)</a> \(Day (\d+)\)', m.group(1)):
            mids = [k for k, v in name.items() if v == txt.replace("&#x27;", "'").replace("&amp;", "&")]
            if href != dd or not mids or day[mids[0]] != int(dd): bad.append(f"day {d} page: bad builds-on link '{txt}' -> day {href}")
    for href in re.findall(r'href="/day/(\d+)/"', page):
        if not 1 <= int(href) <= 30: bad.append(f"day {d} page: link to missing day {href}")
blob = open(os.path.join(ROOT, "app-preview", "data.js"), encoding="utf-8").read() + open(os.path.join(ROOT, "assets", "clips", "manifest.json")).read()
for rid in RETIRED:
    if rid in day: bad.append(f"retired {rid} still in data/challenge.csv")
    if f'"{rid}"' in blob or f"/{rid}" in blob: bad.append(f"retired {rid} still in app data or clip manifest")
print(f"checked {len(rows)} moves, {n} prerequisite links, 30 day pages: " + ("OK, 0 problems" if not bad else f"{len(bad)} problem(s)"))
for b in bad: print("  " + b)
sys.exit(1 if bad else 0)
