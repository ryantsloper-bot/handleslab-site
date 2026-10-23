# handleslab.com

Static site for the free Handles Lab 30-day dribbling challenge (GitHub Pages, no framework).

- `python3 tools/build.py` regenerates `index.html`, `day/1..30/`, `404.html`, `sitemap.xml` from `data/challenge.csv`.
  The build fails if any real player name (hashed list in `data/banned-name-hashes.txt`) appears in any served file.
- `data/challenge.csv` is exported from the private move library (with names scrubbed) by a script kept outside this repo.
- Email signup: every form is `<form data-signup="challenge|waitlist">`; the provider (MailerLite) is wired only in `assets/signup.js`.
- `tools/prep_images.py` made the web images in `assets/img/` from the launch-kit art.
