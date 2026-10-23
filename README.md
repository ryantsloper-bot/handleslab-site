# handleslab.com

Static site for the free Handles Lab 30-day dribbling challenge (GitHub Pages, no framework).

- `python3 tools/build.py` regenerates `index.html`, `day/1..30/`, `404.html`, `sitemap.xml` from `data/challenge.csv`.
  The build fails if any real player name (hashed list in `data/banned-name-hashes.txt`) appears in any served file.
- `data/challenge.csv` is exported from the private move library (with names scrubbed) by a script kept outside this repo.
- Email signup: every form is `<form data-signup="challenge|waitlist">`; the provider (MailerLite) is wired only in `assets/signup.js`.
- `python3 tools/check_prereqs.py` checks the plan: every move's prerequisites are taught on an earlier (or the same) day, every 'Builds on' link points at the right day, and retired moves (A08 pretzel, cut 2026-10-23) are gone from the data, app and clip manifest.
- `tools/stepdiagram.py` draws animated step diagrams for steps with no clip (Day 5 in-and-out A21, Day 9, 17, 19). `tools/sync_clips.py` rebuilds `assets/clips/` from `content/app-clips/day-NN/` (it ignores `_retired/`).
- `tools/prep_images.py` made the web images in `assets/img/` from the launch-kit art.
- **Character picker (Phase 1, flagged off):** `/app-preview/?picker=1` turns it on (remembered in localStorage `hl.flag.picker=1`; `?picker=0` turns it off). Without the flag the app is unchanged. Onboarding (skin tone + name), a "Your athlete" settings sheet (header avatar or the profile card's Edit), the name on the profile card, day-complete screen, streak screen (tap the flame) and the share card. Saved as localStorage `hl.athlete` = `{tone: 1-4, name}`. Stills: `assets/img/athlete/` (README there; placeholders from `tools/athlete_placeholders.py`). The name check uses `app-preview/names.js`, written by the build from `data/picker-name-hashes.txt` (full player names + distinctive single names only, so common first names pass; the site content check still uses the full `banned-name-hashes.txt`) plus the hashed profanity list `data/profanity-hashes.txt` (`tools/hash_words.py`; plain words kept outside this repo).
