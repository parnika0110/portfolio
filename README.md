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
- **Hosting:** Vercel

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

To update project details, edit `data/projects-override.json`, then run `npm run sync` (fetches from GitHub) or `npm run sync:offline`.

## Project structure

| Path | Contents |
| --- | --- |
| `index.html` | Page markup, SVG sprite and the case-notes data |
| `src/input.css` → `styles.css` | Design system and components (Tailwind source → built CSS) |
| `js/main.js` | Navigation, filters, modals and gallery, ⌘K console, night theme, build log |
| `js/interactive.js` | Project visuals, dot field, 3D portrait, custom cursor |
| `tests/` | Browser regression tests |
| `scripts/`, `data/` | Project data sync |
| `images/`, `assets/`, `certifications/` | Screenshots, portrait, certificates |

Project screenshots were captured from each project's live site or from its own source running locally.
