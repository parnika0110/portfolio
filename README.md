# Parnika S M — Portfolio

A static, single-page portfolio designed as *the curious builder's field journal*:
an editorial software portfolio with journal annotations and postage-stamp details.

Live: https://parnika-sm.vercel.app/

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | The whole page: markup, SVG sprite (postmarks, icons, illustrations) and the case-notes data block |
| `src/input.css` | Design system + components (Tailwind CSS v4 source) |
| `styles.css` | Built, minified CSS — generated, but committed so Vercel can serve it as-is |
| `js/main.js` | Interactions: nav, filters, modals + gallery, ⌘K palette, copy email, GitHub repo count |
| `js/interactive.js` | Interactive layer: live project visuals (canvas, labelled as simulation / sample data), hero dot field, layered 3D portrait tilt, engineer's cursor. The field, cursor and magnetic buttons need a desktop mouse; everything draws one still frame under reduced motion. The Metro visual uses that project's own station data and depth-first search |
| `tests/` | Browser regression tests for the cursor, magnetic controls and dot field (`npm test`) |
| `data/projects-override.json` | Source of truth for project details shown in the case-notes modal |
| `scripts/sync-projects.js` | Refreshes the case-notes data for the seven showcased projects from the overrides + GitHub |
| `images/<project>/` | Project screenshots |
| `certifications/` | Certificate images and the Oracle badge/PDF |
| `assets/` | Portrait (`parnika-portrait.webp` is served; the PNGs are fallbacks/originals) |

## Working locally

```bash
npm ci
npm run build          # src/input.css → styles.css
python3 -m http.server 8000   # then open http://localhost:8000
```

Run `npm run build` after any CSS change, and commit the regenerated `styles.css`.

## Tests

```bash
npx playwright install chromium   # once per machine, if Chromium isn't installed yet
npm test
```

`npm test` serves the site locally and runs the browser regression tests in `tests/` with Node's built-in test runner and Playwright (Chromium). They cover the engineer's cursor and hero dot field in `js/interactive.js`:

- pointer tracking
- lock-on brackets and magnetic offsets
- plain text cards
- scrolling under a still mouse
- modifier keys
- keyboard navigation and focus rings
- Windows High Contrast (forced colours)
- touch devices
- reduced motion

Run the tests after changing `js/interactive.js` or the cursor styles.

## Updating projects

- Edit `data/projects-override.json`, then run `npm run sync` (fetches GitHub) or
  `npm run sync:offline` (overrides only). This rewrites the `project-data` JSON block in
  `index.html` for the showcased projects.
- The showcase is curated: seven projects (three case studies and four postcards), hand-composed in
  `index.html`; the sync script never overwrites them. Repos with section `"experiments"` — and
  new repos tagged `portfolio` — are recorded in `data/projects.json` but not shown on the page.
  Every repository stays reachable from the "All repositories" link at the end of the postcards.
- Screenshots: add files under `images/<project>/` and list them in that project's
  `screenshots` array (`{ "src": "...", "alt": "..." }`).

## Placeholders to replace

- **Beyond the terminal** — the five contact-sheet frames use line illustrations. Swap the
  `<svg>` inside each `.frame__print` for an `<img>` (see the `PHOTO PLACEHOLDERS` comment).
- **D-Day** — no event link yet (the photo story is in `#dday`).

## Where the visuals come from

- **OPPY** (`images/oppy/`) — captured from the live site, https://myoppy.xyz, on 25 Nov 2026
  (landing page and the discovery step). The case study switches between these and the
  feature-flow sketch. The opportunity count shown on the landing page is live data from that day.
- **Metro Fare Calculator, Gesture App, CampusPortal, Imperial Wheels, Khana Kreation** —
  captured from each project's own source code running locally.
- **D-Day** (`images/d-day/`) — event photographs; originals kept unchanged, with 960w/1600w
  WebP versions served on the page.
- **More projects (postcard archive)** — each postcard's stamp is that project's own screenshot,
  and the postmark shows the month of the repository's first commit, taken from its Git history
  (Imperial Wheels Mar 2026, Metro Fare Calculator Apr 2026, CampusPortal Jul 2026,
  Khana Kreation Nov 2025). Update the postmark if a repository's history changes.
