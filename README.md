# CenterText

Single-page webapp that displays some large text (like a single number), along with markings that help center that text on a surface, like a greeting card.  Then produces a dimensionally-accurate printable result.

## Use case

The primary use case is for someone hand-lettering a greeting card, using a lightbox to project a template from underneath the card, and wanting to center the text onto the greeting card.

## Vision

A webapp that provides some simple controls:

* Text specs - font, size, weight, style
* Text (multi-line possible)
* page size (inches)
* optional outline size (inches)

Generates a viewable region containing:

* The text, centered around a coordinate system at 0, 0.  In addition to the text,
* The outline, if specified, also centered around 0, 0
* "rulers" running along both axes, allowing something to be centered over it.  Not entirely sure what it should look like but possibly:
    * rules down to 1/8", with different lengths to make it obvious which rule is which
    * numbered every 1"
    * rules long enough to use as a straightedge, but not so long as to be obnoxious

There should also be a print button (probably generates a PDF for printing)

The webapp should be a single HTML page that can be deployed to a static S3 site.

### Font Selection

The app should be able to select different fonts.  Would entertain suggestions for how this should work.  For example, is there a way a user could browse google fonts and select one of those fonts (without necessarily doing a full download and re-upload).

This implies that the user might want to add multiple fonts to the app and be able to select between them, and have those fonts be "stored" somehow locally (see below).

### Local Storage

The app should store all settings locally, so the next time it comes up those settings are restored.  Including the actual text.

This might also allow the user to add multiple fonts that are stored locally, and have those fonts be available the next time the user brings up the app.

---

## Implementation

The app is authored as TypeScript modules and bundled into a **single,
self-contained `index.html`** (CSS + JS inlined) that can be dropped onto a
static S3 site or opened directly from disk — no server required.

### Tech

* **Vite + `vite-plugin-singlefile`** — build step that produces one HTML file.
* **TypeScript**, no UI framework (plain DOM).
* **pdf-lib** — generates the print PDF at exact physical dimensions.

### How it works

There is one geometry model, expressed entirely in **inches** with the origin
`(0, 0)` at the centre (text size is stored in points; 1pt = 1/72"). It feeds
two renderers that stay visually consistent:

* **Live preview** — a WYSIWYG `<canvas>`, sized to the page's aspect ratio and
  scaled by a single pixels-per-inch factor.
* **Print PDF** — `pdf-lib` builds the page at `width×72 × height×72` points, so
  one printed inch equals one real inch regardless of the print dialog (print at
  100% / "Actual size"). Rulers and the outline are drawn as vectors; the text
  is rasterised at 600 DPI with the chosen font and embedded, so any
  font/weight/style prints faithfully.

Text is **centred on its ink box** (real glyph bounds, not the font's line box),
so the visible strokes sit on the origin — which is what matters when aligning
over a card on a lightbox.

**Fonts** are loaded from Google Fonts via the CSS API. A curated list of
popular families (with many hand-lettering scripts) is built in and works
offline after first use; "Load all Google Fonts" pulls the full library on
demand. All settings, the text, and saved/favourited fonts persist in
`localStorage`.

### Develop / build / deploy

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # type-check + bundle -> dist/index.html (single file)
npm run preview  # serve the built file locally
```

Deploy by uploading the single `dist/index.html` to any static host (e.g. an
S3 website bucket).
