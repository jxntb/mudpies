# MudPies — Version 2

A complete redesign of the MudPies website: a fictional luxury atelier that treats the
childhood mud pie with the seriousness of a fashion house. Static HTML, CSS and
JavaScript — no framework, no build step, no server code. It runs from a double-click
on `index.html`, from any static server, and from GitHub Pages under `/mudpies/`.

- **Audit of Version 1:** [AUDIT.md](AUDIT.md)
- **Testing report:** [TESTING.md](TESTING.md)

---

## Pages

| File | What it is |
| --- | --- |
| `index.html` | The homepage. Hero, the studio ledger, “The House”, Collection 07 in an editorial layout, the expedition film, the library of nine earths, the full **About** section at `index.html#about`, the atelier teaser, field-note excerpts. The **View the Collection** button still opens `https://www.google.com/search?q=is+mud+safe+to+eat?` in a new tab, exactly as before. |
| `collection.html` | The catalogue of Collection 07: a filterable index (by series, with or without pieces “returned to the earth”) and a full dossier for each of the seven pieces — image, story, data, earth composition, and a cross-section drawing generated from its measurements. Each dossier links to the atelier pre-set as a “sibling” (`build.html?from=007`, etc.). |
| `process.html` | *The Craft of Soil*: the expedition in seven stages. The two original films (cave and valley) are scrubbed by scroll, with an altimeter/chapter index, a geological strata interlude, clickable bowls in the material library, the forming protocol, a route map, and the finished object. |
| `build.html` | *The Atelier*: build your own MudPie. Nine earths, six forms, diameter/height/dome, four edges, four surfaces, four kinds of weathering, seven inclusions, and a name. A canvas renderer draws the piece on a turntable; a live specification calculates its mass and curing time; “Prepare for commission” runs a short curing sequence and issues a **Certificate of Formation** (“Ready to order”), then a fictional ledger entry. Save as PNG, Surprise me, Reset, and persistence are kept from Version 1. Nothing is sent anywhere. |
| `about.html` | The full history of the house in seven chapters: origins, philosophy and principles, the four rituals, the founder’s mark, earth & return, the studio, and a chronology. |
| `field-notes.html` | The journal: eight entries (expeditions, observations, a material study, a specimen curing log, studio notes) with a sticky index and filters by kind. |
| `faq.html` | 22 questions in five groups, as native `<details>` accordions, with live search, open/close all, and deep links (`faq.html#can-i-eat-one` opens that answer). |
| `404.html` | “This page has returned to the earth.” GitHub Pages serves it for missing addresses; it resolves its own assets at any depth under `/mudpies/`. |

Navigation: a fixed header with the five main sections (Collection, The Process, Build
Your Own, Field Notes, About), an accessible full-screen menu on small screens (adds
Home and Questions), breadcrumbs on inner pages, and the same footer everywhere (with
a link to `index.html#about`). Every page links home via the wordmark.

## File structure

```
Version2/
├── index.html  collection.html  process.html  build.html
├── about.html  field-notes.html  faq.html  404.html
├── README.md  AUDIT.md  TESTING.md
├── .nojekyll            # tells GitHub Pages to publish files as-is
├── .gitignore           # keeps .DS_Store files out of the repository
└── assets/
    ├── css/
    │   ├── main.css       # design system: tokens, type, layout, header/menu, buttons, footer, motion
    │   └── home.css · collection.css · process.css · build.css · about.css · notes.css · faq.css
    ├── js/
    │   ├── site.js        # every page: header states, mobile menu, reveals, in-view video, studio readout
    │   ├── home.js        # raking light on the hero image, film timecode
    │   ├── collection.js  # series filters, generated section drawings
    │   ├── process.js     # scroll scenes, scrubbed films, altimeter, library hotspots, route drawing
    │   ├── builder.js     # the atelier: textures, renderer, controls, certificate, exports
    │   ├── notes.js       # field-note filters and index highlighting
    │   └── faq.js         # search, open/close all, deep links
    ├── images/            # WebP (and one JPEG/SVG) derived from the original PNGs
    ├── videos/            # the two films, re-encoded for scrubbing, desktop + mobile sizes
    └── icons/             # favicon.svg, apple-touch-icon.png
```

Scripts are classic `defer` scripts (not ES modules) so that every page also works when
opened straight from disk (`file://`).

## Previewing locally

**Simplest:** double-click `index.html` (or drag it into a browser). Everything works
from disk, including the scrubbed films and the atelier’s image export. Fonts come from
Google Fonts, so they need a connection; offline, the site falls back to Georgia and
system sans-serif.

**Under a sub-path, as on GitHub Pages:** from the `MudPies` folder run

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000/Version2/>. (Python’s server does not support byte-range
requests; the process page compensates by loading its films into memory, so scrubbing
still works.)

## Publishing to GitHub Pages

The site uses only relative paths, so it works at `https://jxntb.github.io/mudpies/`
without changes. In the repository (`github.com/jxntb/mudpies`, branch `main`, served by
GitHub Pages from the root), the contents of this folder sit at the top level and
Version 1 is kept, unchanged, in `version-1/` — reachable at
`https://jxntb.github.io/mudpies/version-1/`, including its old README. Its own absolute
links to the live domain now lead to Version 2.

That arrangement was made once, in a clone of the repository:

```bash
git clone https://github.com/jxntb/mudpies.git ~/mudpies-publish
cd ~/mudpies-publish
mkdir version-1
git mv index.html build.html process.html main.js style.css logo.png assets README.md version-1/
rsync -a --exclude .DS_Store /Users/boonstra/Documents/MudPies/Version2/ ./
git add -A
git commit -m "Publish MudPies Version 2"
git push
```

To publish later edits made in this folder, copy it over the clone again and push:

```bash
cd ~/mudpies-publish
git pull
rsync -a --exclude .DS_Store /Users/boonstra/Documents/MudPies/Version2/ ./
git add -A
git commit -m "Update MudPies"
git push
```

`rsync` adds and updates files but never deletes, so `version-1/` and the repository’s
history are safe. If you remove a file from this folder, remove it from the clone with
`git rm` as well. GitHub Pages usually shows a push within a minute or two.

Social previews use an absolute image URL
(`https://jxntb.github.io/mudpies/assets/images/og-image.jpg`).

## Maintaining the site

- **Header, menu and footer** are written into each page (a static site without a
  build step). When you change navigation, update all eight HTML files; the markup is
  identical apart from `aria-current="page"`.
- **Colours, type and spacing** are tokens at the top of `assets/css/main.css`.
  The nine earth colours are `--e01` … `--e09`.
- **Catalogue pieces** live in `collection.html`. If you change a piece’s measurements,
  also update its preset in `PRESETS` near the top of `assets/js/builder.js` so “Commission
  a sibling” matches. Section drawings are generated from each dossier’s `data-d`,
  `data-h`, `data-dome`, `data-lip`, … attributes.
- **The atelier** is configured by the tables at the top of `builder.js` (`EARTHS`,
  `FORMS`, `EDGES`, `SURFACES`, `WEATHERING`, `INCLUSIONS`). Earth textures are generated
  in the browser from each earth’s three tones, so adding an earth needs no image work
  beyond its swatch photo.
- **Process scenes** are plain sections; `data-step="0.17,0.4"` on a caption sets the
  stretch of scroll (0–1 within its scene) during which it is shown, and the scene’s
  `style="--len:4.6"` sets its length in screen heights.

## Assets

| Original (in `MudPies/`) | Used as |
| --- | --- |
| `photo3.png` (discs on the table) | Homepage hero, the collection plate, and the seven specimen images, cut out one by one (`no-007.webp` … `no-031.webp`) |
| `photo2.png` (nine bowls) | The library (`earth-library-*.webp`) and the nine earth swatches (`earth-01.webp` … `earth-09.webp`) |
| `photo1.png` | “The Find” (`the-find-*.webp`) |
| `cave.png`, `valley.png`, `mountain.png` | Field notes, About, homepage (`cave-*`, `valley-*`, `summit-*`) |
| `ChatGPT Image … (1).png`, `(2).png` | Mountain path variants: About (`ridge-*`) and the Ascent (`ascent-*`) |
| `Cave_walk.mp4`, `Vally_walk.mp4` | Re-encoded with a 6-frame keyframe interval for smooth scrubbing: `cave-walk-1080/720.mp4`, `valley-walk-1440/720.mp4` (11.8 MB valley original → 4.5 MB / 1.8 MB) plus poster frames |
| `logo.png` (from the GitHub repository) | “The founder’s mark” (`founders-mark.webp`) on the About page and the certificate |

Not used, deliberately: the two `Untitled_…mp4` files (they carry “Luma AI” watermarks;
`Cave_walk.mp4` is the clean cut), `ChatGPT Image … (3).png` and `(4).png` (design mockups
of a process page, used as direction rather than as images), `my-mudpie.png` (an export
from the old builder), and `mudpie.png` (the sculpture — left out at your request after
its derived files were deleted). The original files are untouched.

Fonts: Fraunces, Instrument Sans and Fragment Mono from Google Fonts (SIL Open Font
License). No other third-party code.

## Browser support

Current Chrome, Edge, Safari and Firefox. Progressive enhancements (cross-document view
transitions, `:has()` focus rings, `color-mix`) degrade quietly. Without JavaScript,
every page still reads in full; the atelier explains that it needs JavaScript. With
“reduce motion” enabled, nothing animates or autoplays and the process films are
offered as ordinary clips with controls.
