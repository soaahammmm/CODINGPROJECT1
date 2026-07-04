# CODINGPROJECT1
New Coding Project
# ENGAWA 

A single-page, scroll-driven brand site for a fictional maker of EN-01,
a modular off-grid dwelling raised on slender piers. Built as an
interactive art piece: one low-poly 3D model persists through the whole
page — wireframe in the hero, assembling itself in Chapter 02, material
and configurable in Chapter 03, multiplying into a settlement at the end.

**No build step. No image files. No audio files.** Every visual and
sound is generated in code (WebGL, SVG, CSS gradients, canvas noise,
WebAudio).

## Running it

ES modules and import maps need a real HTTP origin — the site will
**not** work opened directly as a `file://` URL.

Either:

- **VS Code:** install the *Live Server* extension → right-click
  `index.html` → *Open with Live Server*, or
- **Terminal:** `npx serve .` from this folder, then open the printed URL.

An internet connection is required (three.js, GSAP, Lenis, and the four
Google Fonts load from CDNs — pinned versions, no npm install).

## Hosting on Netlify

The site deploys as-is — no build command, no plugins. Three ways:

1. **Drag and drop** — go to <https://app.netlify.com/drop> and drop this
   `engawa` folder onto the page. Done.
2. **CLI** — from inside this folder:
   `npx netlify-cli deploy --prod --dir .`
   (log in when prompted; accept the defaults).
3. **Git-connected** — push this folder as a repository and "Import from
   Git" in Netlify. `netlify.toml` already sets the publish directory.
   If the repo root is a *parent* folder instead, set **Base directory**
   to `engawa` in the site's build settings.

What the extra files do:

- `netlify.toml` — publish directory, security headers (including a
  Content-Security-Policy matched exactly to the CDNs the site uses),
  and cache rules.
- `404.html` — Netlify serves it automatically for unknown paths;
  styled in the site's tokens, links back to the threshold.
- `.gitignore` — keeps `.DS_Store`, `node_modules/`, and Netlify's local
  CLI folder out of a git deploy.

**The waitlist form works for real on Netlify.** The form carries
`data-netlify="true"`, so Netlify's build bots register it and
submissions appear under **Site → Forms** in the dashboard (100
submissions/month on the free tier — enable notifications there if you
want an email per entry). Locally the same submit fails silently and
the page behaves as before. No other backend exists.

## Files, in the order to create them

| # | File | What it owns |
|---|------|--------------|
| 1 | `index.html` | Semantic structure: threshold gate, chapters 00–07, footer, inline SVG line art |
| 2 | `css/styles.css` | The five material tokens, four type roles, every chapter's layout, reduced-motion layouts |
| 3 | `js/main.js` | Entry point + init order; threshold gate, generated ambient sound, waitlist form |
| 4 | `js/scroll.js` | Lenis ↔ GSAP ticker sync (skipped entirely under reduced motion) |
| 5 | `js/scene.js` | Renderer, camera, lights, fog, drifting fog sprites, the `viz` state object |
| 6 | `js/model.js` | EN-01 from primitives: 5 assembly phases, wireframe ⇄ matte crossfade, settlement + treeline |
| 7 | `js/configurator.js` | Chapter 03: cladding / footprint / interior controls + live spec read-out |
| 8 | `js/chapters.js` | All ScrollTriggers: pinned assembly, broken headline, count-ups, the Ch.07 pull-back |
| 9 | `js/cursor.js` | Custom cursor, chapter counter, generated film grain |

## Design tokens

| Token | Hex | Job |
|-------|-----|-----|
| `--yakisugi` | `#14110E` | charred-cedar black — primary dark canvas |
| `--hinoki` | `#E8DFC8` | pale cypress — light breather chapters (04, 05) |
| `--fog` | `#8B8579` | weathered ash — secondary text, dividers |
| `--verdigris` | `#4E7C74` | oxidized copper — CTAs, links, active states, focus |
| `--ai-indigo` | `#24303D` | indigo dye — Chapter 02 and blueprint panels only |

State colors (focus rings, errors, hovers) are `color-mix()` derivations
of these five — no sixth hue exists anywhere.

Type: **Newsreader** (display serif), **Unbounded** (impact — used in
exactly three places: hero wordmark, chapter counter, the "38" in
Chapter 05; the threshold wordmark is the hero wordmark's first
appearance, counted as the same use), **Bricolage Grotesque** (body/UI),
**IBM Plex Mono** (coordinates, dates, spec data).

## How the throughline works

One fixed, transparent-background `<canvas>` sits behind all content
(`z-index: 0`). Chapters with opaque backgrounds (01, 04, 05, 06) simply
cover it; transparent chapters (00, 02, 03, 07) reveal it. A single
plain object — `viz` in `scene.js` — holds every visual parameter
(assembly progress, materiality, camera orbit/distance, fog, spread).
`chapters.js` tweens those numbers, scrubbed to scroll position, and the
render loop reads them each frame. Scroll is the clock: scrolling
backward genuinely reverses the assembly.

## Accessibility notes

- `prefers-reduced-motion: reduce` gets a genuinely calmer site: no
  Lenis, no pins or scrubs, no letter splits; the model stands fully
  built and static; Chapter 02 reads as a plain document. The one
  concession is a slow crossfade to the settlement in Chapter 07.
- Every interactive element has a visible focus ring (derived from
  `--verdigris`). The configurator uses real radio inputs; the gallery
  is a focusable, keyboard-scrollable region.
- The sound is off by default, generated only after an explicit toggle.
- Without JavaScript, the gate and canvas hide themselves and the
  chapters remain plain readable HTML.

## Honesty notes

ENGAWA is fictional. Every quoted name is invented. The waitlist form
validates for real; hosted on Netlify it stores entries in Netlify
Forms, anywhere else it submits to nowhere — there is no other backend.
