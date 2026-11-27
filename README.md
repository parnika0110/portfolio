# Parnika S M — Portfolio

A single-page software engineering portfolio, designed as *the curious builder's field journal*: an editorial layout with journal annotations, postage-stamp details and live, interactive project visuals.

**Live portfolio:** https://parnika-sm.vercel.app/

## Key features

- **Case studies:** OPPY, MediAssist and the Gesture Controlled Infotainment System, each with real screenshots and a case-notes modal with a gallery. A postcard archive holds four more projects.
- **Live project visuals:** canvas animations, each clearly labelled:
  - OPPY's opportunity pipeline (simulation)
  - MediAssist's prescription OCR (sample data)
  - a 21-point hand model for the gesture project (simulated; no camera)
  - Metro route search, running on that project's own station data and depth-first search
- **Engineer's cursor:** on desktop, a custom crosshair with live page coordinates replaces the arrow. Buttons and links get lock-on brackets and a magnetic pull. Keyboard use and Windows High Contrast mode keep the system cursor.
- **Hero dot field and 3D portrait:** a dot field that responds to the pointer, and a layered 3D tilt on the portrait. The photo itself is unaltered.
- **Night shift theme:** a dark theme from the toggle in the nav or the ⌘K console, remembered per visitor and applied before the page paints. The photo, stamps, postcards and the OPPY and Gesture panels keep their daytime look.
- **Proof at a glance:** one line under the hero with the BLR Tech Week demo, the 52-of-300+ selection and CGPA, all facts stated elsewhere on the page.
- **Live build log:** the Work section shows the latest public commit (repo, message, time) from GitHub's public API, cached for 30 minutes. If GitHub can't be reached, it falls back to a plain link to the GitHub profile.
- **⌘K console:** jump to any section, or type commands such as `open oppy`, `open metro`, `theme night`, `resume`, `copy email` and `help`.
- **Visitor counter:** the footer shows the total visitors, counted once per browser session and stored in Upstash Redis (see [Visitor counter](#visitor-counter)).
- **Navigation:** project filters, copy-to-clipboard email and a live GitHub repository count.
- **Accessible and responsive:**
  - works from 320px wide and without JavaScript
  - respects reduced motion
  - keyboard navigable with visible focus rings
  - labelled visuals

## Tech stack

- **Site:** HTML5, Tailwind CSS v4, vanilla JavaScript and Canvas 2D (no frameworks or animation libraries)
- **Fonts:** Space Grotesk, Inter, IBM Plex Mono
- **Tooling:**
  - Node.js scripts sync project data from GitHub
  - Playwright and Node's test runner run the browser regression tests
- **Hosting:** Vercel; one serverless function (`api/visitors.js`) with Upstash Redis for the visitor count

## Local setup

```bash
npm ci
npm run build                     # src/input.css → styles.css (commit the result)
python3 -m http.server 8000       # open http://localhost:8000
```

Run the tests after changing anything in `js/` or `src/input.css`. On a new machine, install Chromium once first:

```bash
npx playwright install chromium
npm test
```

The tests cover:
- the cursor, magnetic controls and dot field, including scrolling, keyboard use, high contrast, touch and reduced motion
- the proof line and the build log (with GitHub mocked)
- the ⌘K commands
- the night theme, including a check that the photo is pixel-identical in both themes
- the visitor counter: counting once per session, reading the count, abuse protection and API failures (Upstash is stubbed, so no credentials are needed)

To update project details, edit `data/projects-override.json`, then run `npm run sync` (fetches from GitHub) or `npm run sync:offline`.

## Visitor counter

The footer shows a live total of visitors. `api/visitors.js` is a Vercel serverless function that stores the count in Upstash Redis through its REST API. It has no extra dependencies.

**How it counts**
- The first page view in a browser session counts the visit (`POST /api/visitors`). Later views in the same session only read the total (`GET`). A `sessionStorage` flag tracks this; no cookies are used.
- Abuse protection:
  - only requests from the site itself can count
  - bots, crawlers and headless browsers aren't counted
  - each anonymous client counts at most once per 30 minutes
  - at most 120 visits a minute are counted
- Privacy: no IP address or other identifying data is stored. The throttle uses a salted SHA-256 hash of the IP and the day, kept for 30 minutes.
- If Upstash isn't configured or can't be reached, the API answers `503` and the counter stays hidden. It never shows a made-up number.

**Setup (once)**
1. Create a Redis database, either:
   - in the Vercel dashboard: Storage → Create Database → **Upstash for Redis** (Marketplace), connected to this project; or
   - at [console.upstash.com](https://console.upstash.com) → Redis → Create database.
2. In Vercel → Project → Settings → Environment Variables, add these for **Production** and **Preview**:

   | Variable | Value |
   | --- | --- |
   | `UPSTASH_REDIS_REST_URL` | The database's REST URL (Upstash console → your database → REST API) |
   | `UPSTASH_REDIS_REST_TOKEN` | The REST token. Not the read-only token; counting needs write access. |
   | `VISITOR_HASH_SALT` *(optional)* | Any long random string used to salt the hashes. Defaults to the REST token. |

   If you connected through the Vercel Marketplace, the integration adds the database variables for you. The function also reads `KV_REST_API_URL` and `KV_REST_API_TOKEN`, so check which names appear under Environment Variables.
3. Redeploy: environment variables only apply to new deployments.
4. Check `https://<your-site>/api/visitors`:
   - `{"count": …}` means it works.
   - `{"error":"counter not configured"}` means the variables aren't set for that environment.

**Locally:** `python3 -m http.server` has no `/api`, so the counter stays hidden. To run the function locally, use `npx vercel dev` with the variables in `.env.local`, for example from `npx vercel env pull .env.local`. `.env*.local` is git-ignored; never commit tokens.

**Optional Redis check:** to run the counting script against a real, throwaway Redis, start one and run the tests. This empties that Redis database, so never point it at real data.

```bash
redis-server --port 6390 --save "" --daemonize yes
REDIS_TEST_PORT=6390 npm test
```

## Project structure

| Path | Contents |
| --- | --- |
| `index.html` | Page markup, SVG sprite and the case-notes data |
| `src/input.css` → `styles.css` | Design system and components (Tailwind source → built CSS) |
| `js/main.js` | Navigation, filters, modals and gallery, ⌘K console, night theme, build log |
| `js/interactive.js` | Project visuals, dot field, 3D portrait, custom cursor |
| `api/visitors.js` | Visitor-counter serverless function (Upstash Redis) |
| `tests/` | Browser regression tests |
| `scripts/`, `data/` | Project data sync |
| `images/`, `assets/`, `certifications/` | Screenshots, portrait, certificates |

Project screenshots were captured from each project's live site or from its own source running locally.
