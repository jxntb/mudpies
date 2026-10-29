# Audit of Version 1

What was inspected before redesigning: the local files in `/Users/boonstra/Documents/MudPies`
(`index.html`, `process.html`, `process(original).html`, `build.html`, 12 PNGs, 4 MP4s),
a read-only clone of `github.com/jxntb/mudpies` (which also contains `logo.png`,
`main.js`, `style.css` and an `assets/` folder), and the live site at
`https://jxntb.github.io/mudpies/` at desktop and 375 px widths.

## Worth keeping — and kept

- **The premise and its tone**: “Artisan mudpies made with care”, handcrafted, sun-dried,
  “refined soil objects”. Version 2 keeps the deadpan and takes it further.
- **The joke link**: the homepage button opens `https://www.google.com/search?q=is+mud+safe+to+eat?`
  in a new tab. Kept byte-for-byte; label corrected to “View the Collection”.
- **The expedition films**: `Cave_walk.mp4` and `Vally_walk.mp4`, scrubbed by scroll on
  the process page. Kept as the spine of the new process page.
- **Process copy**: “The Craft of Soil”, “We begin in the darkness”, “Beneath the
  Surface”, “We walk upon our past — soft cool ground”, “A great and grounding shift”,
  and “What began beneath the surface emerges as something tangible: a refined object
  carrying the character of the earth it came from” all reappear in Version 2.
- **The builder’s model and features**: shape, size, surface texture, colour, toppings,
  auto-spin, drag to turn, “Surprise me”, reset, save as image, and local persistence.
  All survive, re-implemented (colours became nine real earths; toppings became
  inclusions; a squashed SVG became a lit 3-D turntable).
- **The warm palette and editorial serif** as a starting direction (re-drawn as a
  fuller system).
- **`logo.png`**, the hand-drawn M, now presented as “the founder’s mark”.

## Weaknesses found

**Layout and navigation**
- At 375 px the header’s four links overflow the screen and the hero’s inline
  `display:flex` never wraps, pushing the headline and buttons off-canvas (confirmed on
  the live site). There was no mobile navigation.
- The “Collection” link pointed at `index.html` itself; no collection existed.
- `#about` was a single short paragraph at the end of the homepage.
- `process.html` had no site header at all; its only links were absolute URLs to the
  live domain, so they break locally and in any other location.
- The header logo was sized at 1 in × 1 in, making the sticky header very tall.
- Comments in `index.html` were swapped (“LEFT: TEXT” wraps the SVG).

**Process page**
- The local copy points at `assets/Valley_walk.mp4`, but the file is `Vally_walk.mp4`
  (and the local folder has no `assets/` directory), so the local page is broken.
- All captions start at `opacity:0; visibility:hidden` and only GSAP reveals them. With
  “reduce motion” on, or if the GSAP CDN fails, almost all text is invisible.
- Both videos use `preload="auto"` (~15 MB) and long keyframe intervals, so they load
  eagerly and stutter when scrubbed; the `requestAnimationFrame` loops run forever,
  even off-screen.
- `photo2.png` (bowls of soil) carried the alt text “Cool ground”.

**Builder**
- Colour swatches are `<span>`s and the auto-spin switch is a `<label>` around a `<span>`:
  neither is reachable by keyboard; chips have no pressed state for assistive tech.
- `touch-action: none` on the stage stops the page scrolling when a thumb lands on it.
- Toppings were placed at fixed coordinates and did not follow the pie’s size; the
  stacked shape used a clipping ellipse that did not match it; “rotation” was a
  horizontal squash.
- No summary of the configuration and no final “ready to order” moment.
- Navigation lacked the About link.

**Content and claims**
- “Vegan, organic” stated as fact; Version 2 replaces real-world claims with fiction
  that makes none.

**Assets**
- `mudpie.png`, `photo1.png`, `cave.png`, `valley.png`, `mountain.png` and the two
  high-resolution mountain images were unused on the live homepage.
- `Untitled_…rjqPjavN.mp4` and `Untitled_…16BaPRAK.mp4` carry “Luma AI” watermarks;
  `Cave_walk.mp4` is the clean version.
- `ChatGPT Image … (3).png` and `(4).png` are screenshots of a process-page design
  (Sand → Cave → People → Mountain), useful as intent, not as images.
- `process(original).html` depends on `style.css`/`main.js` that exist only in the
  repository and on an external wallpaper image.

## Opportunities taken

- Turn the photo of discs on the table into the collection itself: seven individually
  cut specimens, each with a story, data and a section drawing.
- Turn the photo of nine bowls into a material library that runs through the site:
  homepage, process hotspots, and the builder’s earth selector.
- Give the process a geography (cave → bed → Red Country → studio → curing ground)
  that uses every landscape image and both films in a sensible order.
- Make About a real section and a real page, with the founder’s mark as an artefact.
- Add a journal and a FAQ that extend the fiction, and a 404 page that belongs to it.
