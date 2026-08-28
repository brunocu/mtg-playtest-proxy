## 1. Project Setup

- [x] 1.1 Scaffold a Vite + TypeScript project structure and verify `npm run dev` serves a blank page
- [x] 1.2 Add the jsPDF dependency and verify it imports without error in a dev build
- [x] 1.3 Bundle the MIT-licensed Mana project mana-symbol assets with an attribution notice, and verify the assets are present in the repo alongside their license/attribution file
- [x] 1.4 Bundle Roboto Slab (title) and Lora (body) fonts with their OFL license files, and verify both fonts load and render in a test page

## 2. Decklist Parsing

- [x] 2.1 Implement quantity-prefixed card line parsing (bare name, numeric prefix, "Nx" prefix) and verify unit tests cover all three scenarios from `decklist-parsing` spec
- [x] 2.2 Implement flavor-name parsing and verify a unit test covers an entry with both real and flavor names
- [x] 2.3 Implement token/emblem line parsing (`(token) Name`, `(emblem) Name`, with quantity prefixes) and verify unit tests cover token, emblem, and quantity-prefixed token scenarios
- [x] 2.4 Implement blank-line skipping and unparseable-line reporting that does not abort the rest of the parse, and verify unit tests cover both scenarios

## 3. Card Data Lookup

- [x] 3.1 Implement Scryfall fuzzy-name lookup (`GET /cards/named?fuzzy=`) for regular card entries and verify a known card name resolves to the expected data
- [x] 3.2 Implement Scryfall type-based search lookup for token/emblem entries and verify a known token name resolves to token card data
- [x] 3.3 Implement an in-memory session cache keyed by card name and verify (via mocked fetch) that duplicate entries for the same card trigger only one network request
- [x] 3.4 Implement a sequential request queue with an inter-request delay and verify requests are issued one at a time rather than concurrently for a multi-card decklist
- [x] 3.5 Implement unresolved-entry handling that reports the failure and continues resolving the rest of the deck, and verify a test with one invalid name among valid ones

## 4. Proxy Card Rendering

- [x] 4.1 Implement base card frame drawing on Canvas 2D (title, type line, text box, P/T regions) and verify the rendered canvas matches the expected region layout
- [x] 4.2 Implement title-line rendering with mana cost, in both icon and text-only (`{W}`) modes, and verify both modes render correctly for a sample card
- [x] 4.3 Implement type-line and oracle-text rendering with shrink-to-fit sizing via `measureText`, and verify long oracle text shrinks and remains fully within the text box bounds
- [x] 4.4 Implement power/toughness rendering and verify creature cards display a P/T box while non-creatures do not
- [x] 4.5 Implement the colored-borders-by-mana-identity option, including multicolor and colorless treatment, and verify sample cards from each color category render the correct border
- [x] 4.6 Implement the full/small scale rendering option and verify small-scale output preserves full layout and content at the reduced size
- [x] 4.7 Implement basic-land handling options (full-art lands, ignore-basic-lands) and verify both behave per the `proxy-card-rendering` spec scenarios
- [x] 4.8 ~~Implement the alternative-frames option for double-faced/split cards~~ (superseded by 4.10-4.14: no user-facing toggle, layout-driven composition instead)
- [x] 4.9 Verify no set icon, rarity icon, or custom icon is ever rendered on any card, as a regression check against the removed icon scope
- [x] 4.10 Remove the `alternativeFrames` option from `RenderOptions` and update `selectFaces`/`renderCardImages` so transform/modal-DFC entries always produce two canvases (one per face) and all other entries always produce one, and verify with tests covering both entry kinds
- [x] 4.11 Implement `split`/`fuse` `CardFrameKind` geometry (both halves rotated 90 degrees onto one canvas, side by side) in `card-layout.ts`, including the fuse text bar for fuse cards, and verify a split and a fuse card render as one correctly-composited canvas each
- [x] 4.12 Implement `aftermath` `CardFrameKind` geometry (top half upright, bottom half rotated like a split's right half) and verify an aftermath card renders as one correctly-composited canvas
- [x] 4.13 Implement `flip` `CardFrameKind` geometry (one face upright, the other rotated 180 degrees beneath it) and verify a flip card renders as one correctly-composited canvas
- [x] 4.14 Implement `adventure` `CardFrameKind` geometry (standard frame plus a compact second rules box below it, on one face) and verify an adventure card renders as one correctly-composited canvas
- [x] 4.15 Implement the diagonal-offset draw path for hybrid/two-hybrid/Phyrexian compound symbols in icon mode, leaving text-only mode unchanged, and verify with tests covering a hybrid and a Phyrexian symbol
- [x] 4.16 Implement the front/back indicator on transform and modal-DFC card faces (Mana font glyph in icon mode, `(front)`/`(back)` text badge in text-only mode) and verify with tests covering both DFC subtypes and both symbol modes
- [x] 4.17 Update `selectFaces`/`renderCardImages` so reversible-card entries join the transform/modal-DFC bucket (always two canvases, one per face), and verify with a test covering a reversible card
- [x] 4.18 Verify room cards render correctly via the existing `split`/`fuse` `CardFrameKind` (no new geometry required) with a test covering a room card
- [x] 4.19 Implement a `prepare` variant of the `adventure` `CardFrameKind` (second rules box mirrored to the right side instead of the left) and verify a prepare card renders as one correctly-composited canvas
- [x] 4.20 Verify the front/back indicator from 4.16 is not drawn for reversible-card entries, as a regression test
- [x] 4.21 Add `loyalty`/`defense` to `ScryfallCard`/`ScryfallCardFace`/`FaceToRender` and generalize `drawPowerToughness` into a single-stat box that renders `power/toughness` when both are present or a bare number when only `loyalty` or `defense` is present, and verify with tests covering a planeswalker and a battle card

## 5. Print Sheet Export

- [x] 5.1 Implement N-up page layout for A4 and US Letter formats and verify the cards-per-page count matches the expected grid for both formats
- [x] 5.2 Implement configurable card spacing (default gap and no-card-space option) and verify both spacing modes lay out correctly
- [x] 5.3 Implement multi-page pagination for decklists exceeding one page's capacity and verify a large decklist produces multiple, fully filled pages
- [x] 5.4 Implement jsPDF assembly embedding each card canvas at true physical size (63mm x 88mm, scaled proportionally for the small option) and verify the generated PDF's page and image dimensions match the expected mm values
- [x] 5.5 Implement crop marks around each card in the generated PDF and verify visually that marks appear at each card's boundary
- [x] 5.6 Add "print at 100% scale" guidance in the UI and verify it is visible before/at download time

## 6. UI Integration

- [x] 6.1 Build the decklist input textarea and an options form covering every rendering/export option, and verify each control updates the render state
- [x] 6.2 Wire the end-to-end "generate and download PDF" action (parse → lookup → render → export) and verify a full sample decklist produces a downloadable PDF
- [x] 6.3 Display parsing and lookup errors (unparseable lines, unresolved cards) to the user without blocking successfully resolved entries, and verify with a decklist containing at least one bad entry

## 7. Deployment

- [x] 7.1 Configure the static production build (`vite build`) and verify the build output serves correctly from a local static file server
- [x] 7.2 Add a Fan Content Policy / Scryfall attribution notice and Mana project attribution to the UI and verify both are visible
