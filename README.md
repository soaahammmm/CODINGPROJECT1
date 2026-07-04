# ENGAWA

*Dwellings for the space between.*

A single-page, scroll-driven brand site for a fictional maker of EN-01 — a modular off-grid dwelling raised on slender piers — where one low-poly 3D model persists through the entire page, changing state as you scroll.

**No build step. No image files. No audio files.** Every visual and sound — WebGL, SVG, CSS gradients, canvas noise, WebAudio — is generated in code.

![ENGAWA — the EN-01 wireframe behind the site's threshold wordmark](docs/images/engawa-hero.png)

## Try it

**Live demo:** not deployed yet. Once you've pushed this to Netlify (see [Deploying to Netlify](#deploying-to-netlify) below), put the URL here — it's the first thing reviewers will click.

## Quick start

No live URL yet? One command runs it locally:

```bash
npx serve .
```

Open the URL it prints. That's the entire setup — no install, no build. (You'll need internet access: three.js, GSAP, Lenis, and four Google Fonts load from CDNs.)

## Features

- One persistent low-poly EN-01 model that wireframes, assembles, textures, becomes configurable, and multiplies into a settlement — all driven by scroll position, including in reverse.
- Every visual and sound is generated in code (WebGL, SVG, CSS gradients, canvas noise, WebAudio) — zero image or audio files ship with the site.
- A live configurator in Chapter 03: swap cladding, footprint, and interior, with a real-time spec read-out.
- A genuine reduced-motion mode: no pins, scrubs, or letter-splitting — the model just stands fully built and static.
- A waitlist form that actually stores submissions once deployed to Netlify, with no separate backend.
- No build step, no `npm install` — three.js, GSAP, Lenis, and four Google Fonts load as pinned CDN versions.

## Running it locally

ES modules and import maps need a real HTTP origin, so opening `index.html` directly as a `file://` URL won't work. Pick one:

- **VS Code** — install the *Live Server* extension, right-click `index.html`, choose *Open with Live Server*.
- **Terminal** — `npx serve .` from this folder, then open the printed URL. (Needs Node.js installed, for `npx`.)

Either way, you'll need an internet connection: three.js, GSAP, Lenis, and the four Google Fonts load from CDNs at pinned versions — there's no `npm install` step and nothing to build.

## Deploying to Netlify

The site deploys as-is — no build command, no plugins.

1. **Drag and drop** — go to [app.netlify.com/drop](https://app.netlify.com/drop) and drop this `engawa` folder onto the page. Done.
2. **CLI** — from inside this folder, run `npx netlify-cli deploy --prod --dir .` (log in when prompted; accept the defaults).
3. **Git-connected** — push this folder as a repository and choose "Import from Git" in Netlify. `netlify.toml` already sets the publish directory. If your repo root is a *parent* folder instead, set **Base directory** to `engawa` in the site's build settings.

What the extra files do:

- `netlify.toml` — publish directory, security headers (including a Content-Security-Policy matched exactly to the CDNs the site uses), and cache rules.
- `404.html` — served automatically for unknown paths; styled in the site's tokens, links back to the threshold.
- `.gitignore` — keeps `.DS_Store`, `node_modules/`, and Netlify's local CLI folder out of a git deploy.

**The waitlist form works for real on Netlify.** It carries `data-netlify="true"`, so Netlify's build bots register it and submissions appear under **Site → Forms** in the dashboard (100 submissions/month on the free tier — enable notifications there for an email per entry). Locally, the same submit fails silently and the page behaves as before.



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

### The throughline

One fixed, transparent-background `<canvas>` sits behind all content (`z-index: 0`). Chapters with opaque backgrounds (01, 04, 05, 06) simply cover it; transparent chapters (00, 02, 03, 07) reveal it.

A single plain object — `viz` in `scene.js` — holds every visual parameter: assembly progress, materiality, camera orbit/distance, fog, spread. `chapters.js` tweens those numbers, scrubbed to scroll position, and the render loop reads them every frame. Scroll is the clock, so scrolling backward genuinely reverses the assembly instead of just replaying an animation.

![Chapter 02 — the EN-01 frame mid-assembly](docs/images/engawa-chapter-02.png)

### Design tokens

| Token | Hex | Job |
|-------|-----|-----|
| `--yakisugi` | `#14110E` | charred-cedar black — primary dark canvas |
| `--hinoki` | `#E8DFC8` | pale cypress — light breather chapters (04, 05) |
| `--fog` | `#8B8579` | weathered ash — secondary text, dividers |
| `--verdigris` | `#4E7C74` | oxidized copper — CTAs, links, active states, focus |
| `--ai-indigo` | `#24303D` | indigo dye — Chapter 02 and blueprint panels only |

State colors (focus rings, errors, hovers) are `color-mix()` derivations of these five — no sixth hue exists anywhere.

Type is **Newsreader** (display serif), **Unbounded** (impact — used in exactly three places: hero wordmark, chapter counter, the "38" in Chapter 05; the threshold wordmark counts as the hero wordmark's first appearance), **Bricolage Grotesque** (body/UI), and **IBM Plex Mono** (coordinates, dates, spec data).

## Accessibility

- `prefers-reduced-motion: reduce` gets a genuinely calmer site: no Lenis, no pins or scrubs, no letter splits; the model stands fully built and static; Chapter 02 reads as a plain document. The one concession is a slow crossfade to the settlement in Chapter 07.
- Every interactive element has a visible focus ring (derived from `--verdigris`). The configurator uses real radio inputs; the gallery is a focusable, keyboard-scrollable region.
- Sound is off by default and only generated after an explicit toggle.
- Without JavaScript, the gate and canvas hide themselves and the chapters remain plain, readable HTML.

## Credits

Built with [three.js](https://threejs.org/), [GSAP](https://gsap.com/) with ScrollTrigger, and [Lenis](https://lenis.darkroom.engineering/) for smooth scroll — all loaded from CDNs at pinned versions. Typefaces via Google Fonts: Newsreader, Unbounded, Bricolage Grotesque, and IBM Plex Mono. Hosting, forms, and headers courtesy of [Netlify](https://www.netlify.com/).

## Honesty notes

ENGAWA is fictional. Every quoted name is invented. The waitlist form validates for real; hosted on Netlify it stores entries in Netlify Forms, anywhere else it submits to nowhere — there is no other backend.
