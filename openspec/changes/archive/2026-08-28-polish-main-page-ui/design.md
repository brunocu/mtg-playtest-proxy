## Context

See proposal.md - Why. The app is a single Vue SFC (`src/App.vue`) with plain, lightly-styled HTML elements (no component library) — that "minimal html" character is a hard constraint, not something this change should erode. Errors currently flow through `parseDecklist` (`unparseableLines: string[]`), `resolveDecklist` (`unresolved: {entry, reason}[]`), and `formatPipelineErrors` (flat `string[]` messages), none of which track a source line number today.

## Goals / Non-Goals

**Goals:**
- Single-screen, no-scroll desktop layout using plain CSS (flex/grid), no layout framework.
- In-textarea whole-line error highlighting without adopting a code-editor/highlighting library.
- Generation only produces output (rendered cards / PDF) when the whole decklist parses and resolves cleanly, while still surfacing every error at once rather than one at a time.

**Non-Goals:**
- Rich/per-character highlighting inside the textarea (explicitly ruled out in favor of whole-line bands).
- Any behavior change to the parsing/resolution *algorithms* themselves — line-number bookkeeping is added, but every line is still parsed/resolved exactly as before; only what happens *after* that (whether generation proceeds) changes.
- Mobile-specific redesign beyond reverting to the existing stacked layout.

## Decisions

**Layout: CSS Grid frame sized to `100dvh`, not a JS-measured layout.**
`#app` becomes a grid with fixed header/footer rows and a `1fr` body row; the body row is itself a two-column grid (textarea column `1fr`, options column `auto`-ish/fixed width) on desktop, collapsing to a single column via a media query on narrow viewports (reverting to normal document flow/scrolling there — the `100dvh` frame only applies above the breakpoint). `dvh` over `vh` to avoid mobile browser chrome resize jumps, though mobile itself isn't frame-constrained. No JS involved in the layout itself.
- *Alternative considered*: JS `ResizeObserver`-driven height calculation — rejected, adds runtime complexity for something CSS handles natively.

**Error highlighting: absolutely-positioned backdrop `<div>` behind a transparent-background `<textarea>`, bands only (no text mirroring).**
A wrapper establishes `position: relative`; the backdrop div is `position: absolute; inset: 0`, non-interactive (`pointer-events: none` except on highlighted bands, which need `pointer-events: auto` to receive hover for the tooltip), rendering one absolutely-positioned band per bad line at `top: line_height * (lineNumber - 1)`. The band carries the `title` attribute with that line's error reason. The backdrop's `scrollTop` is kept equal to the textarea's on the textarea's `scroll` event. Because line-wrap is disabled (`white-space: pre; overflow-x: auto` on the textarea, matched on the backdrop), `line_height * index` stays exact — no text duplication needed, which is what keeps this out of "mirrored `<pre>`" territory.
- *Alternative considered*: the `highlight-within-textarea` pattern (mirrored styled text under a transparent textarea) — rejected as unnecessary machinery once highlighting is whole-line rather than per-character (see prior exploration), and the one Vue port of it is an unmaintained GitHub-only package.
- *Alternative considered*: adopting a code-editor library (`vue-prism-editor`, CodeMirror) — rejected, far heavier than a plain `<textarea>` and against the minimal-html direction.

**Line-number plumbing: entries and unparseable lines carry a `line: number` field; unresolved entries inherit it from their source entry.**
`parseDecklist` computes line number from the loop index over `text.split(/\r?\n/)` (1-based, blank lines included in the count per the spec scenario) and attaches it to both `DecklistEntry` and each unparseable line (which becomes `{ line: number; text: string }` instead of a bare `string`). `resolveDecklist`'s `unresolved` entries already carry the originating `entry`, so its `line` is reached via `entry.line` — no separate threading needed through `resolveDecklist` itself, only through the `ResolvedEntry`/unresolved type shapes.
- *Alternative considered*: keeping a side-table mapping line text back to line number — rejected, fragile with duplicate lines (e.g. two identical decklist lines), whereas carrying the index at parse time is unambiguous.

**Error summary: replace `formatPipelineErrors(): string[]` with a count, keep line numbers for highlighting as a separate value.**
`App.vue` no longer renders an itemized list; it derives a `Set<number>` of bad line numbers (for the backdrop) and a `Map<number, string>` of line -> reason (for tooltips) from the parse/resolve results, plus a count for the summary message. `formatPipelineErrors` either goes away or is repurposed to build these structures instead of message strings — an implementation detail for tasks.md, not a spec concern.

**Generation gate: run parse + resolve to completion, then branch on error count — no early return.**
`generateAndDownload` keeps calling `parseDecklist` and `resolveDecklist` exactly as it does today (both already iterate every line/entry without stopping on the first failure — nothing changes there). What changes is the step immediately after: today it renders/builds the PDF whenever `resolveResult.resolved.length > 0`, even with some `unparseableLines`/`unresolved` present alongside. Now it checks total error count (`unparseableLines.length + unresolved.length`) first — a nonzero count sets the highlight/tooltip/summary state (per `decklist-error-display`) and returns without touching `renderCardImages`/`buildPrintPdf` at all; only a zero count proceeds to rendering.
- *Alternative considered*: aborting resolution early at the first error to save Scryfall lookups — rejected per explicit instruction to finish processing all names so every error can be highlighted in one pass instead of forcing the user through a fix-one-rerun-fix-next loop.

## Risks / Trade-offs

- **Backdrop drift if font metrics change** (e.g. a browser zoom level or font substitution alters `line-height` px value differently between the real textarea and the backdrop) → Mitigation: derive `line_height` from `getComputedStyle` on the textarea itself at render time rather than hardcoding a px value, and share the exact same font/line-height CSS declarations between the two elements via one shared class.
- **Horizontal scroll from disabled wrapping hurts readability of long lines** → Mitigation: decklist lines are short in practice (card names, short flavor names); accepted as a minor trade-off already agreed with the user.
- **A single bad line now blocks output for an otherwise-large valid decklist** (previously the valid entries would still render) → Mitigation: this is the explicit intent of the change — the in-textarea highlight plus hover tooltip is meant to make the exact problem line(s) fast to spot and fix, since all errors surface together in one pass instead of one rerun at a time.
- **`100dvh` grid frame could clip content on unusually short desktop viewports** (e.g. a laptop with a small browser window) → Mitigation: the options column and textarea both get `min-height`/`overflow: auto` fallbacks so content scrolls within its own panel rather than being clipped outright, consistent with the "contained overflow" requirement already in the layout spec.

## Migration Plan

No data migration. This is a UI-only change to one page; ships as a normal deploy. `DecklistEntry`/unparseable-line/unresolved-entry shape changes are internal to this app (not a published API), so the **BREAKING** note in the proposal is about internal call sites, not external consumers — every internal caller is updated in the same change.
