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
| `data/projects-override.json` | Source of truth for project details shown in the case-notes modal |
| `scripts/sync-projects.js` | Refreshes the modal data and the "Other builds" cards from the overrides + GitHub |
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

## Updating projects

- Edit `data/projects-override.json`, then run `npm run sync` (fetches GitHub) or
  `npm run sync:offline` (overrides only). This rewrites the `project-data` JSON block and the
  "Other builds" cards between the `SYNC:experiments` comments in `index.html`.
- The seven featured case studies are hand-composed layouts in `index.html`; the sync script
  never overwrites them. New repos tagged `portfolio` on GitHub land in "Other builds".
- Screenshots: add files under `images/<project>/` and list them in that project's
  `screenshots` array (`{ "src": "...", "alt": "..." }`).

## Placeholders to replace

- **Beyond the terminal** — the five contact-sheet frames use line illustrations. Swap the
  `<svg>` inside each `.frame__print` for an `<img>` (see the `PHOTO PLACEHOLDERS` comment).
- **OPPY** — no product screenshot yet; the case shows a feature-flow sketch. See the comment in
  `#case-oppy` for where a screenshot goes.
- **D-Day** — space for an event photo and event link is marked with a comment in `#achievements`.

The current project screenshots were captured from each project's own source code running
locally (Metro Fare Calculator, Gesture App, CampusPortal, Imperial Wheels, Khana Kreation).
