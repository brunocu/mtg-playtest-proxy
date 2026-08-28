## Why

The main page is a single stacked column that overflows a normal viewport (tall textarea, two fieldsets, a legal footer), forcing scrolling to reach the generate button. The itemized error list and unattributed layout also don't scale well. This change polishes the page to fit a single desktop screen and makes parse/lookup errors visible directly where the user is looking (the decklist textarea) instead of in a separate list.

## What Changes

- Rework the desktop layout into a fixed-height, no-scroll frame: compact header, two-column body (decklist textarea on the left filling remaining height; rendering options, print options, guidance, and the generate action stacked on the right), and a condensed footer. Mobile/narrow viewports revert to the current stacked single-column layout with normal scrolling.
- Condense the footer: shorter attribution text linking to `ATTRIBUTIONS.md` on GitHub for full detail, plus the project's own license and a link back to the GitHub repo (placeholder URL for now).
- Replace the itemized error list with a single generic message stating how many entries could not be included.
- Highlight lines with parse or lookup errors directly in the decklist textarea using a whole-line background band (a backdrop element positioned by line height/index, synced via scroll position — no per-character text mirroring).
- Disable textarea line-wrapping so each logical line always occupies exactly one visual row, keeping the highlight positions exact.
- Show the specific error reason for a highlighted line as a native tooltip (`title` attribute) on hover.
- **BREAKING**: `parseDecklist` and the resolve/error-formatting pipeline now track and expose the originating line number for each entry and each error, changing their return shapes.
- **BREAKING**: Generation no longer proceeds to rendering/PDF output when any decklist line fails to parse or resolve, even if other lines succeed. Parsing and resolving still run to completion across the whole decklist first (so every error is collected and highlighted, not just the first one) — only the render/PDF stage is gated on there being zero errors.
- Polish all user-facing text on the page (headings, labels, guidance copy, status/error messages) for clarity and concision. This is editorial only — no new behavior — so each proposed rewrite must be presented to and explicitly approved by the user before being applied; nothing here is captured as a spec requirement.

## Capabilities

### New Capabilities
- `main-page-layout`: single-screen desktop layout (two-column, no page scroll), mobile stacked fallback, and condensed/attributed footer content.
- `decklist-error-display`: surfacing parse/lookup errors as in-textarea line highlights with hover tooltips and a generic summary count, replacing the itemized error list, and blocking rendering/PDF generation until every decklist line parses and resolves successfully.

### Modified Capabilities
- `decklist-parsing`: parsed entries and unparseable lines must each carry their originating line number so errors can be pinpointed in the UI.
- `card-data-lookup`: unresolved entries must retain a reference back to their originating decklist line number.
- `generation-progress`: generation must also report a stopped/error state — without proceeding to rendering or PDF assembly — when some decklist lines fail while others succeed, not only when every entry fails.

## Impact

- `src/App.vue`: layout markup/styles, error display, footer content.
- `src/style.css`: root/app frame sizing (viewport-height layout, no body scroll on desktop).
- `src/lib/decklist.ts`: `DecklistEntry` and `unparseableLines` gain line-number data.
- `src/lib/deck-pipeline.ts`: `formatPipelineErrors` and related types change shape to carry line numbers instead of (or alongside) flat message strings.
- `src/lib/scryfall.ts`: `ResolveResult`/unresolved entries need line-number data threaded through.
- `ATTRIBUTIONS.md` / license: referenced from the footer; may need a placeholder project license file added.
