## Context

See proposal.md - Why/What Changes for motivation and scope. This is a greenfield project (no existing code, no existing specs) built as a single static, client-side-only web app implementing all four capabilities (`decklist-parsing`, `card-data-lookup`, `proxy-card-rendering`, `print-sheet-export`). Constraints already established during exploration:

- Scryfall's API (`api.scryfall.com` and its image origins) sends CORS headers for GET/HEAD/POST/OPTIONS, confirmed via its own docs — no backend proxy is needed for either card data or card images.
- bwproxy's bundled fonts (`matrixb.ttf`, `MPLANTIN.ttf`) are not redistributable and must be replaced with open-license fonts.
- Mana symbols come from the MIT-licensed Mana project, bundled with attribution.
- Set/rarity/custom icons are out of scope entirely (per proposal amendment).
- Fuzzy name matching is a Scryfall API feature (`GET /cards/named?fuzzy=`), not something this project implements.

## Goals / Non-Goals

**Goals:**
- Reproduce bwproxy's rendering fidelity (layout, shrink-to-fit oracle text, border coloring, alternative frames) using only browser-native APIs plus jsPDF.
- Keep the app fully static: buildable to plain files, deployable to any static host (e.g. GitHub Pages), no server component.
- Produce print-accurate PDFs at true card size (63mm x 88mm / 2.5in x 3.5in), robust to browser print-scaling inconsistency.

**Non-Goals:**
- Cross-session persistence of Scryfall lookups (spec only requires caching within a session; an in-memory cache is sufficient).
- User accounts, saved decklists, or any server-side state.
- Pixel-identical output to bwproxy — visual parity of layout/behavior is the target, not byte-identical images (different rendering engine, different fonts).
- Special text-section formatting for `case`, `saga`, `class`, `leveler`, `mutate`, and `prototype` layouts (chapter dividers, solved/unsolved sections, level brackets, etc.) — these render today via the plain oracle-text box with no special affordances. bwproxy never solved this either (its own source has a standing TODO: "Class, Sagas and Leveler frames?"). Left as a known, explicit gap rather than a silent omission; revisit as a separate change if it matters for actual decklists.
- Auxiliary/supplemental card formats not normally included in a deck: `planar`, `scheme`, `vanguard`, `art_series`. These fall through to the standard frame if ever encountered rather than getting dedicated handling.

## Decisions

**Rendering surface: Canvas 2D, not SVG.**
bwproxy composes cards as raster images (PIL: paste layers, draw text, recolor border pixels). Canvas 2D mirrors that model directly (`drawImage`, `fillText`, `measureText`, pixel-level border recoloring) and produces a `canvas.toDataURL()` PNG that jsPDF can embed with `addImage()` with no extra rasterization step. SVG would require an additional raster conversion before PDF embedding and doesn't offer a real advantage for this raster-style layout.

**PDF generation: jsPDF, client-side.**
Per the earlier research pass: jsPDF supports mm-unit positioning, is actively maintained, and is the pattern used by comparable existing proxy-sheet tools. CSS `@media print` was rejected — documented cross-browser scaling/margin bugs make it unreliable for exact physical dimensions, which this project depends on for print-and-cut accuracy. Mitigation for jsPDF's own scale risk (PDF viewers can still apply "fit to page" on print): render crop marks around each card and show explicit "print at 100% scale" instructions in the UI, both already captured in the `print-sheet-export` spec.

**Decklist parsing: regex-based, reimplemented in TypeScript.**
Mirrors bwproxy's own approach (regex line parsing for `<qty> <name>` / `<qty>x <name>` / bare name, plus flavor-name syntax) rather than a parser-generator or grammar library — the input format is small and line-oriented enough that a library would be unjustified complexity.

**Card data fetching: sequential per-unique-name calls to `/cards/named?fuzzy=`, deduplicated via an in-memory cache.**
Each unique card name in the decklist is looked up once; repeated entries reuse the cached result (satisfies the `card-data-lookup` caching requirement). Requests are issued with a small delay between them to stay within Scryfall's documented rate-limit guidance, since a large decklist could otherwise fire many near-simultaneous requests.

**Shrink-to-fit oracle text: reimplemented from measurement, not ported thresholds.**
bwproxy's `fitMultiLine` shrinks a fixed base font size in steps until PIL's text measurement says it fits. The web port reimplements the same shrink-until-fits strategy using `CanvasRenderingContext2D.measureText()` against the actual chosen replacement font, rather than porting bwproxy's specific size thresholds — those were tuned for Matrix Bold/MPlantin's specific metrics and would not transfer correctly to a different font family.

**Bundling policy for assets:** Mana project mana-symbol icons/font are bundled at build time with attribution (MIT license permits this). Card art, when rendered, is fetched live from Scryfall (`image_uris` on the resolved card) and drawn onto the canvas at render time — never bundled, never cached to disk beyond the in-memory session cache, consistent with Scryfall's terms and the CardConjurer precedent.

**Build tooling: Vite + TypeScript, no UI framework.**
The UI surface is a form of option controls plus a decklist textarea and a render/download action — state is a single "current render options + resolved deck" object recomputed on option change. A full component framework isn't warranted for this scope; plain TypeScript with Vite for bundling/dev-server keeps the dependency surface minimal, consistent with deploying a static site.

**Replacement fonts: Roboto Slab (titles) / Lora (type line and oracle text).**
Both are SIL OFL-licensed on Google Fonts (bundle-safe with attribution), replacing bwproxy's non-redistributable `matrixb.ttf` (title) and `MPLANTIN.ttf` (body). Roboto Slab covers the bold title role with a clean modern slab serif across a wide weight range; Lora covers type line/oracle text with a screen-optimized serif that includes italic (for reminder text) and bold (for keyword emphasis) variants.

**Multi-face card layouts: per-layout authentic composition, no user-facing toggle.**
bwproxy's actual behavior (traced from its source, not its docs) is layout-driven, not flag-driven: transform/modal-DFC cards are *always* rendered as two independent standard-shaped card images (a two-sided physical card needs two proxy cards); split, fuse, aftermath, adventure, and flip cards are *always* rendered as a single composited card image using that layout's authentic physical geometry (split/fuse: both halves rotated 90° onto one card, side by side; aftermath: top half normal, bottom half rotated like a split's right half; flip: one face normal, the other rotated 180° beneath it, mirroring the real paper card; adventure: the creature's standard frame plus a compact second rules-box below it, both on one face). bwproxy's `alternativeFrames` flag only affects flip cards, downgrading them from one mirrored image to two plain standard-shaped images — a minor convenience knob, not a "combined vs. split" switch. The web port drops that flag entirely and always uses the authentic per-layout composition: it's cheap to implement now (new `CardFrameKind`s per layout with their own geometry, mirroring `card-layout.ts`'s existing pattern) and it determines how many canvases `renderCardImages()` returns, which `print-sheet-export` (section 5) depends on. Fuse cards additionally get bwproxy's shared fuse-text bar spanning both halves.

**Compound mana symbols (hybrid/phyrexian): diagonal-offset glyph pair, not fused-glyph or CSS duo.**
bwproxy achieves single-glyph duo symbols via a hand-modified font with manually drawn glyphs at bespoke Unicode PUA codepoints — not redistributable (unclear license for the edited glyphs) and not portable to a stock font. The bundled Mana project's own `.ms-duo`/split-cost CSS achieves the same visual with a colored diagonal-gradient circle plus two small glyphs offset via `{top:-0.38em,left:0.28em}` / `{top:0.5em,left:1.0em}` — a real technique, but built on colored pip backgrounds that don't fit this tool's black/white line-art style (there is no colored-fill mana symbol anywhere else in the render). The web port keeps the existing side-by-side glyph extraction (`symbolGlyphs()` splitting on `/` — unchanged) but replaces the side-by-side draw with the same diagonal-offset positioning Mana's CSS uses, at reduced size, with no color fill: this reads as one compound symbol rather than two adjacent full symbols, without requiring a colored background or a new font asset. Text-only mode is unaffected — compound tokens keep rendering as bracketed text (`{W/U}`, `{W/P}`) exactly as today.

**Double-faced indicators: draw the bundled Mana font's existing DFC glyphs.**
The Mana font (already bundled in task 1.3) includes dedicated single-codepoint icons for this purpose: ``/`` (transform front/back) and ``/`` (modal-DFC front/back). Since transform/modal-DFC cards always render as two separate canvases (per the layout decision above), each canvas draws the appropriate glyph immediately left of the title in icon mode — no new font asset or custom shape drawing needed. Text-only mode has no bracket-token equivalent to fall back to (this isn't a scryfall `{...}` symbol), so it renders a plain `(front)`/`(back)` text badge instead.

**Layout coverage beyond bwproxy: verified live against Scryfall, not assumed from bwproxy's (now-dated) source.**
bwproxy predates several current Scryfall layouts, so its own `TWO_PARTS_LAYOUTS`/`DFC_LAYOUTS` constants are an incomplete reference. Checked live (`GET /cards/search?q=layout:<name>`, and full card JSON for representative cards) rather than trusted from memory or a secondary source (an initial docs lookup incorrectly claimed `case` wasn't a real layout — contradicted by live data):
- **Room** (Duskmourn) is not a distinct layout — Scryfall assigns it `layout: "split"` (two named/costed faces, e.g. *Bottomless Pool // Locker Room*). No new handling needed beyond the split/fuse `CardFrameKind`; folded into that requirement's scenarios.
- **Prepare** (Secrets of Strixhaven, released after bwproxy and after this project's own research pass) is structurally identical to `adventure` — one creature frame plus a compact spell sub-box on the same face — except the sub-box sits on the right side of the frame instead of the left. Implemented as `adventure`'s geometry mirrored horizontally, not a new frame shape.
- **Reversible card** (e.g. *Adrix and Nev, Twincasters*) has two `card_faces` and is physically two-sided like transform/modal-DFC, so it's folded into the "always two canvases" DFC bucket rather than getting its own `CardFrameKind`. Unlike transform/modal-DFC, it isn't a front/back or modal mechanic (both faces are the same card, different treatment), so it does not get a DFC front/back indicator glyph — there's no bwproxy precedent and no matching Mana-font glyph for this case.
- **Battle** (e.g. *Invasion of Gobakhan*) is not a distinct layout either — it uses `layout: "transform"` — so it already gets the two-canvas DFC treatment. What it lacks is its `defense` stat, which the current `FaceToRender`/`ScryfallCard` types don't carry at all (only `power`/`toughness`).

**Loyalty and defense: generalize the existing P/T stat box, matching bwproxy's own model.**
Neither loyalty (planeswalkers) nor defense (battles) has ever been implemented — `ScryfallCard`/`ScryfallCardFace` only declare `power`/`toughness`, and `drawPowerToughness` only fires when both are present, so planeswalkers currently render with no stat box at all. bwproxy already treats this as one concept (`hasPTL()` = has power/toughness OR loyalty, one box, one code path — `drawPTL`), and battle's defense is the same shape of value (a single number, no second stat). The fix generalizes the existing PTL box to a single-stat box that shows `power/toughness` when both are present, or a bare number when only `loyalty` or `defense` is present — no new box geometry, `loyalty`/`defense` added to the Scryfall types and `FaceToRender`.

## Risks / Trade-offs

- **Browser/OS print pipeline still rescales despite a correctly-sized PDF** → Mitigation: crop marks + explicit "print at 100%" UI instructions (already in `print-sheet-export` spec); this is a residual risk inherent to relying on the user's print dialog, not something the app can fully control.
- **Replacement fonts change text-fit behavior versus bwproxy** → Mitigation: shrink-to-fit is reimplemented from live measurement against the actual chosen font rather than porting fixed thresholds, so it self-corrects for whatever font is selected.
- **Large decklists could trigger many rapid Scryfall requests** → Mitigation: sequential fetches with inter-request delay, plus session-level caching of repeated card names.
- **Reliance on Scryfall's continued CORS support and uptime** → No mitigation beyond noting it's an external dependency; this is an accepted trade-off of the "no backend" design and matches how bwproxy already depends on Scryfall for all card data.
- **Canvas-rendered PNGs embedded per card could bloat PDF size for large decks** → Mitigation: render canvases at a resolution matched to the physical print size (equivalent to ~300 DPI at true card dimensions) rather than arbitrarily high, keeping per-card image size reasonable.

## Migration Plan

Greenfield project — no existing system to migrate from or roll back to. Implementation proceeds in capability dependency order: `decklist-parsing` → `card-data-lookup` → `proxy-card-rendering` → `print-sheet-export`, each independently testable against its spec's scenarios before the next builds on it. This change delivers a static production build (`vite build`); publishing it to a static host is a follow-up step outside this change's scope.
