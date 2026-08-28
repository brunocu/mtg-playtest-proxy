## Context

`main.ts` currently owns three things at once: a hand-written `innerHTML` UI template, manual DOM wiring/reads, and the async orchestration of parse → resolve → render → build-PDF (see proposal.md - Why). `src/lib/*` is plain TS with no DOM or framework dependency and its own test suite; none of its function signatures currently expose incremental progress (`resolveDecklist` resolves via a single batched/throttled pass, `renderCardImages` is called once per expanded deck entry from the orchestration loop that already lives in `main.ts`, not inside `lib`).

## Goals / Non-Goals

**Goals:**
- Move UI structure/state out of imperative DOM code into a single Vue 3 SFC, per the minimal-split scope agreed with the user (`App.vue` only — footer stays inline, not its own component).
- Add an updating phase-status message with a live `N of M` card count during rendering, shown as text (no progress bar/animation, no overall percentage), satisfying `generation-progress` spec requirements (phase-name status, rendering-phase card count, no fabricated percentage, clear error state).
- Keep `src/lib/*` and its tests untouched, per proposal.md - Impact.

**Non-Goals:**
- Not introducing a state management library (Pinia/Vuex) — a single top-level component's reactive state is sufficient at this app's size.
- Not splitting the footer or any other section into its own component — explicitly rejected by the user; `App.vue` is the only new SFC.
- Not adding component-level tests for `App.vue` — the behavior worth testing already lives in and is tested at the `lib/` layer; the component is thin wiring.
- Not making card-data lookup, decklist parsing, or PDF assembly report any numeric count or percentage — none of those phases has a natural, lib-unmodified count available (see Decisions below), and the user explicitly asked not to fabricate one.
- Not building a router, multi-page flow, or persisted UI state (localStorage etc.) — out of scope for this change.
- Not building a graphical progress bar or animating anything visually — progress is plain text, explicitly rejected by the user.

## Decisions

**Vue setup**: Vue 3 with `<script setup lang="ts">` SFCs (Composition API) — matches the existing codebase's plain-function, no-class style better than the Options API. Add `@vitejs/plugin-vue` to `vite.config.ts`, add `vue-tsc` and run it in place of bare `tsc` in the `build` script (bare `tsc` cannot type-check `.vue` template bindings), add a `src/vite-env.d.ts` (or extend the existing one) with the standard `declare module '*.vue'` shim referenced by `vite/client` conventions.

**Component boundary**: a single `App.vue` (decklist textarea, both option fieldsets, generate button, text progress status, error list, static legal/attribution footer markup, orchestration `generateAndDownload`). Rejected splitting out either the footer or the options/error sections into their own SFCs (`AppFooter.vue`, `RenderOptions.vue`/`PrintOptions.vue`/`ErrorList.vue`) as premature for a ~160-line form — explicitly decided with the user.

**Progress model — phase-name status text, with a real card count only where one exists for free**: rejected computing any weighted percentage bands (the earlier design) as arbitrary/fabricated precision for phases that have no natural count. Instead, status is a plain per-phase message, upgraded to include a real `N of M` count only for the one phase where `App.vue`'s own orchestration loop already knows both numbers without touching `lib`:
  - Parse: `"Parsing decklist…"` — `parseDecklist` is synchronous and returns before/after this message; no count available.
  - Card lookup: `"Looking up card data on Scryfall…"` — `resolveDecklist` resolves all entries in one throttled pass with no progress callback; instrumenting it would mean changing `scryfall.ts` (out of scope, see alternative below). No count shown.
  - Per-card rendering: `"Rendering cards… (N of M)"`, updated after each `renderCardImages` call in the existing expand-and-render loop — both the running count and the total (`expandByQuantity(...)`'s length) are already known to `App.vue` before the loop starts, so this costs nothing beyond a ref increment.
  - PDF assembly: `"Building PDF…"` — `buildPrintPdf` is a single call with no natural subdivision; no count shown.
  - Completion: a distinct "done" message once `doc.save(...)` has been called.
  - On any thrown error, the status stops updating and the UI switches to a distinct error state (existing `errorsEl`-equivalent) rather than leaving a stale phase message.

  *Alternative considered*: add an `onBatchResolved` callback param to `resolveDecklist` so the lookup phase could show `batch N of M` for decks >75 unique cards (which need multiple batched requests). Rejected for this change to honor the proposal's "lib stays unchanged" boundary — most decklists are well under 75 unique names and hit this in a single batch anyway, so the phase-name-only message covers the common case; left as a natural follow-up if lookup-phase granularity turns out to matter.

**Presentation — text only, no fabricated percentage**: status is rendered as plain text (e.g. `Rendering cards… (12 of 40)`), reusing the existing status-line element/position. No `<progress>` element, no width-animated bar, no CSS transition, and no overall percentage — all explicitly rejected by the user, the latter because weighted phase bands would be arbitrary given lookup/parse/PDF have no natural count.

## Risks / Trade-offs

- [No overall sense of "how much is left" during parse/lookup/PDF phases, since only rendering shows a count] → Accepted trade-off: those phases are either instant (parse) or a single network/CPU step (lookup, PDF) with nothing meaningful to count without touching `lib`; a fabricated percentage there would be misleading rather than informative, which is exactly what the user asked to avoid.
- [Two behavior changes bundled in one change: UI framework migration and progress reporting] → Both were explicitly requested together by the user; kept as one change since the progress text naturally lives inside the same `App.vue` rewrite rather than being retrofitted onto the old imperative code twice.
- [`vue-tsc` adds build time and a second typechecker to reason about] → Standard/expected cost of adding Vue to a Vite+TS project; no simpler alternative exists for typechecking SFC templates.
