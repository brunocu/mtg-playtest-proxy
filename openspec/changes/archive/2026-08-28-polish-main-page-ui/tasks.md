## 1. Line-number plumbing

- [x] 1.1 In `src/lib/decklist.ts`, add a `line: number` field to `DecklistEntry` and change `unparseableLines` from `string[]` to `{ line: number; text: string }[]`, computed from the 1-based position in `text.split(/\r?\n/)` (blank lines counted); verify `src/lib/__tests__/decklist.test.ts` covers line numbers surviving blank lines and matches `decklist-parsing`'s new scenarios.
- [x] 1.2 In `src/lib/scryfall.ts`, ensure `ResolveResult.unresolved` entries expose their originating line via `entry.line` (no new field needed if `entry` is retained as-is); verify `src/lib/__tests__/scryfall.test.ts` asserts an unresolved entry's `entry.line` matches its source line.
- [x] 1.3 Update `src/lib/deck-pipeline.ts`: replace or repurpose `formatPipelineErrors` to produce the data `App.vue` needs (a bad-line-number set, a line->reason map, and a count) instead of `string[]` messages; verify `src/lib/__tests__/deck-pipeline.test.ts` covers both unparseable and unresolved lines feeding into the same structures.

## 2. In-textarea error highlighting

- [x] 2.1 In `src/App.vue`, wrap the decklist textarea in a `position: relative` container with an absolutely-positioned, non-interactive backdrop `<div>` behind it; verify the textarea renders unchanged with no backdrop visible when there are no errors.
- [x] 2.2 Render one highlighted band per bad line in the backdrop, positioned at `line_height * (lineNumber - 1)` using `getComputedStyle` on the textarea for `line-height` (not a hardcoded value), each carrying a `title` attribute with that line's error reason and `pointer-events: auto`; verify hovering a highlighted line shows the correct tooltip text for both parse and lookup errors.
- [x] 2.3 Sync the backdrop's `scrollTop` to the textarea's on its `scroll` event; verify scrolling the textarea keeps highlighted bands aligned with their lines.
- [x] 2.4 Disable line-wrap on the textarea (`white-space: pre; overflow-x: auto`) and match the same font/line-height/white-space declarations on the backdrop via a shared CSS class; verify a long decklist line stays on one visual row and its highlight band stays aligned.
- [x] 2.5 Replace the itemized error list in `App.vue` with a single summary message showing the count of entries that could not be included, shown only when the count is greater than zero; verify manually with a decklist containing a mix of valid, unparseable, and unresolved lines.
- [x] 2.6 In `generateAndDownload`, after `parseDecklist` and `resolveDecklist` both complete (unchanged — still process every line/entry), branch on total error count: if `unparseableLines.length + unresolved.length > 0`, set the highlight/tooltip/summary state and return without calling `renderCardImages`/`buildPrintPdf`; only proceed to rendering when the count is zero; verify with a decklist containing both a valid entry and a bad line that no PDF download is triggered and the existing "no entries resolved" early-return path still works when everything fails.

## 3. Single-screen desktop layout

- [x] 3.1 In `src/style.css`, size `#app` as a grid filling `100dvh` with fixed header/footer rows and a `1fr` body row, removing the current `max-width`-centered block flow; verify the page shows no vertical scrollbar on a standard desktop viewport with an empty decklist.
- [x] 3.2 In `src/App.vue`, restructure the body into a two-column grid (decklist textarea column `1fr`, options/action column) inside the `1fr` grid row, moving the two `fieldset`s, guidance paragraph, button, and status text into the second column; verify the textarea visibly fills the remaining vertical space alongside the stacked options column.
- [x] 3.3 Add a media query collapsing the grid to a single stacked column (reverting to normal scrolling document flow) below a chosen desktop breakpoint; verify in a narrow/mobile viewport that the layout matches the pre-change stacked appearance and the page scrolls normally.
- [x] 3.4 Give the textarea and options column their own `overflow: auto` so an unusually short viewport scrolls within a panel instead of clipping content; verify by shrinking the browser window height and confirming no content is cut off without a scrollbar appearing.

## 4. Footer and attribution

- [x] 4.1 Add a placeholder project license file (e.g. `LICENSE`) if one does not already exist at the repo root, per the proposal's footer requirement; verify the file exists and is referenced correctly from the footer link.
- [x] 4.2 Condense the footer in `src/App.vue` to link to `ATTRIBUTIONS.md` on GitHub for full detail, plus the project's own license and a placeholder link back to the GitHub repo; verify the footer fits within its fixed-height row without wrapping past its allotted space at the standard desktop viewport used in task 3.1's check.

## 5. UI copy polish (requires explicit approval per entry)

- [x] 5.1 Draft proposed rewrites for all user-facing text (heading, intro paragraph, option labels, guidance note, button label, status/summary messages, footer) and present each proposed rewrite next to its current text for approval; do not edit any text until approved.
- [x] 5.2 Apply only the rewrites explicitly approved; verify each applied change against the approval record (no unapproved text changes present in the diff).

## 6. Verification

- [x] 6.1 Run `npm test` and confirm all suites pass, including the updated `decklist`, `scryfall`, and `deck-pipeline` tests.
- [x] 6.2 Manually exercise the page per the project's testing norm (start the dev server, check the golden path and edge cases — empty decklist, fully valid decklist, decklist mixing valid lines with parse errors, decklist mixing valid lines with unresolved cards, decklist with multiple simultaneous errors, narrow viewport) and report results, since this is a UI change that automated tests alone don't validate.
