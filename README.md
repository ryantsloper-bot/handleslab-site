# handleslab.com

Static site for the free Handles Lab 30-day dribbling challenge (GitHub Pages, no framework).

- `python3 tools/build.py` regenerates `index.html`, `day/1..30/`, `404.html`, `sitemap.xml` from `data/challenge.csv`.
  The build fails if any real player name (hashed list in `data/banned-name-hashes.txt`) appears in any served file.
- `data/challenge.csv` is exported from the private move library (with names scrubbed) by a script kept outside this repo.
- Email signup: every form is `<form data-signup="challenge|waitlist">`; the provider (MailerLite) is wired only in `assets/signup.js`.
- `python3 tools/check_prereqs.py` checks the plan: every move's prerequisites are taught on an earlier (or the same) day, every 'Builds on' link points at the right day, and retired moves (A08 pretzel, cut 2026-10-23) are gone from the data, app and clip manifest.
- `tools/stepdiagram.py` draws animated step diagrams for steps with no clip (Day 5 in-and-out A21, Day 9, 17, 19). `tools/sync_clips.py` rebuilds `assets/clips/` from `content/app-clips/day-NN/` (it ignores `_retired/`).
- `tools/prep_images.py` made the web images in `assets/img/` from the launch-kit art.
