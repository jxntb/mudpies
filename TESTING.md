# Testing report — MudPies Version 2

Tested on 29 October 2026 on macOS, in Chromium-based browsers only: the Claude desktop
app’s browser pane and Google Chrome (headless, with a throwaway profile). The site was
served from a local static server mounted at `/mudpies/` (the same path as GitHub Pages,
with HTTP byte-range support), from Python’s plain `http.server`, and opened directly from
disk (`file://`). These tests ran before publication; nothing had been deployed at the time.

## What was verified

**Links, assets and structure (automated, all 8 pages)**
- 413 internal references (links, `src`, `srcset`, posters, video sources, CSS `url()`)
  all resolve to files inside `Version2`; every `#fragment` exists on its target page;
  no reference leaves the folder. External references: Google Fonts, and the joke link.
- Every page: `lang="en"`, a title, a meta description, exactly one `h1`, no skipped
  heading levels, a link back to `index.html`, a `#top` target. All 66 images have `alt`
  (empty where decorative) and explicit width/height. Every asset file is referenced.
- No JavaScript errors or failed loads on any page, checked by capturing Chrome’s console
  over HTTP and over `file://` (method validated with a deliberate error).
- No horizontal overflow at 1280, 375 and 320 px wide on any page.

**The joke link** — `index.html` “View the Collection” has exactly
`href="https://www.google.com/search?q=is+mud+safe+to+eat?"` with `target="_blank"
rel="noopener"`. Clicking it made the page open www.google.com in a new tab (the test
browser blocks script-driven new tabs, so the URL was then opened directly): it loads the
Google results page titled “is mud safe to eat? - Google Search”.

**`index.html#about`** — loading the URL directly lands with the About section 84 px from
the top, just clear of the fixed header; the section has a heading, ~230 words, principles,
facts and the founder’s mark.

**Navigation** — desktop header with current-page state on every page; on phones the
menu opens, moves focus to its first link, keeps Tab/Shift+Tab inside, closes on Escape
or link choice, returns focus to the button, and unlocks scrolling. Without JavaScript the
links show as a plain row instead.

**Process page** — film scrubbing follows scroll (0.9 s → 2.9 s → 6.1 s → 8.1 s of the
cave film across the scene); captions switch at their ranges; the altimeter and chapter
index update; library hotspots select and highlight the matching earth. Under simulated
“reduce motion” the page becomes a static essay with all 12 captions visible, no video
downloaded until “Play the film” is pressed, which plays it inline with controls and moves
focus to it.

**Atelier (build.html)** — every form, edge, surface, weathering and inclusion renders
(checked visually in several combinations); presets from the catalogue (`?from=007`) load
with a note; sliders update the drawing, mass and dimensions; arrow keys turn and tilt the
focused preview; Surprise, Reset and local persistence work; the canvas has a descriptive
label. “Prepare for commission” runs the curing sequence into the Certificate of Formation
(“Ready to order”), then the ledger with its fiction notice; “Begin another” resets.
“Save image” and “Save certificate” produce valid PNGs (1.7 MB and 1.1 MB) — verified by
intercepting the download, so no file was written to disk.

**Other pages** — collection filters and the returned-pieces toggle update the table,
dossiers and count; section drawings render; field-note filters and index work; FAQ search
filters and opens matches, shows its empty state, “Open/Close all” work, and
`faq.html#can-i-eat-one` opens and focuses that answer; the 404 page served at a nested
missing address (`/mudpies/journal/2026/missing-entry`) still loads its styles, image and
links.

**Without JavaScript** (scripts stripped) — every page reads in full with no hidden
content; the atelier hides itself.

**Contrast** — all text colour pairings in the palette meet WCAG AA (lowest: 5.19:1 for
secondary text on bone).

## Issues found and fixed during testing

1. Scroll-reveal never fired for masked images (Chromium ignores fully clipped targets) —
   the mask moved onto the image inside the observed box.
2. Scrubbed films stopped responding after the first load — the frame loop now restarts on
   scroll and when metadata arrives.
3. Opening `index.html#about` overshot the section, because smooth scrolling and a
   position correction compounded — smooth scrolling is now enabled only after load.
4. Primary-button hover text was 4.01:1 on clay — the fill is now deep clay (6.13:1).
5. Films could not be scrubbed from servers without byte-range support (e.g. Python’s
   `http.server`) — they now load as in-memory blobs when served over HTTP.
6. The atelier’s mass estimate disagreed with the catalogue (4,630 g vs 2,140 g for the
   same piece) — the density model was calibrated and the catalogue aligned to it.
7. Fragment links landed too low (header offset applied twice) — duplicate scroll margins
   removed.
8. The process intro was hard to read over the brightest part of the cave footage —
   captions now sit on a soft pool of shade.

## Not tested

- Real phones and tablets, Safari/iOS, Firefox, and Android browsers (phone layouts were
  checked with viewport emulation and narrow frames in Chromium only).
- The live GitHub Pages deployment (nothing was pushed); paths were checked under a local
  `/mudpies/` mount instead.
- Screen readers (only semantic structure, labels and focus behaviour were checked), and
  the operating system’s own reduce-motion setting (simulated by overriding the media query).
- A browser with scripting genuinely disabled (scripts were stripped instead, so the
  atelier’s `<noscript>` notice was not displayed).
- Slow or offline networks; font fallback was not checked visually.
- Animations were reviewed only partly: the test pane repeatedly paused when hidden, so
  several screenshots show transitions mid-way. Final states were confirmed by measuring
  styles or by disabling transitions for the capture.
