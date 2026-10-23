# Character-picker athlete stills (Phase 1)

One folder per skin tone, light to deep: `tone-1/` (light), `tone-2/` (medium), `tone-3/` (**Option A, the brand
athlete, the default**), `tone-4/` (deepest). Same faceless athlete, same kit in every tone: orange headband, black
jersey with orange trim, orange sleeve on the athlete's right arm, black shorts with orange stripes, plain shoes.
No text, no logos, no real-player likeness.

The current files are **placeholders** made by `tools/athlete_placeholders.py` (flat silhouettes; tone 3's avatar,
hero and swatch are crops of the approved Option A reference). To ship the real art, overwrite the files with the
**same names and sizes** and re-export the `.webp` copies. Do not re-run the placeholder script after that.

| File | Size (px) | Background | Used for |
|---|---|---|---|
| `avatar.png` | 512 x 512 | opaque (orange comic bg) | master avatar; head and shoulders, centred for a circle crop |
| `avatar-192.png` | 192 x 192 | opaque | profile card on Today (generated from avatar.png) |
| `avatar-96.png` | 96 x 96 | opaque | header avatar button, in the brand icon's spot (generated from avatar.png) |
| `avatar.webp` | 512 x 512 | opaque | onboarding step 2 and the settings sheet |
| `hero.png` / `hero.webp` | 720 x 1280 (9:16) | opaque | Today hero art and the big onboarding preview (cropped to the top 2/3, keep the head and ball in the upper 60%) |
| `celebrate.png` / `celebrate.webp` | 720 x 720 | **transparent** | day-complete celebration and the streak screen (head to mid-thigh) |
| `share.png` (+ `.webp`) | 1080 x 1350 (4:5) | **transparent** | 9:16 streak share card; drawn 900px wide from y 372, the bottom fades into the dark panel |
| `swatch.png` / `swatch.webp` | 360 x 480 (3:4) | opaque | tone picker buttons (head to hips) |

These files are NOT precached. The app requests them only when the picker flag is on, and `app-preview/sw.js` caches
each one at runtime the first time it is used (cache-first for `/assets/`). After replacing them, bump the SW cache
version `V` so returning users get the new art.
