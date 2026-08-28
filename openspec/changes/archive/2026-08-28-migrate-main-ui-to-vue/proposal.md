## Why

`main.ts` builds the entire UI via one hand-written `innerHTML` template plus manual `querySelector` wiring, DOM-read helper functions, and imperative `createElement`/`appendChild` loops for the error list. This is hard to extend and duplicates typography styling across many inline `style` attributes. Moving the UI shell to Vue single-file components makes the form state, option reading, and error rendering declarative and easier to read, while the generation status text gets a real per-card count during rendering (the one phase where the existing orchestration loop already knows "card N of M") instead of a single opaque "Rendering cards…" sentence.

## What Changes

- Replace `main.ts`'s manual DOM template/wiring with a single Vue 3 SFC, `App.vue` (decklist textarea, rendering/print option fieldsets, generate button, status, error list, static legal/attribution footer, orchestration logic). `main.ts` shrinks to a `createApp(App).mount('#app')` bootstrap.
- `src/lib/*` (decklist parsing, Scryfall client, card layout/rendering, print sheet, PDF) is unchanged — it stays plain, framework-agnostic TS with its existing tests.
- Add `vue`, `@vitejs/plugin-vue`, and `vue-tsc` to the project; wire the Vite plugin and swap `vue-tsc` into the `build` script's typecheck step (plain `tsc` cannot check `.vue` templates); add a `.vue` type declaration shim.
- The generation flow keeps reporting progress as an updating status message per phase (`"Parsing decklist…"`, `"Looking up card data on Scryfall…"`, `"Rendering cards…"`, `"Building PDF…"`), but the rendering phase's message now includes a live `card N of M` count, since `App.vue`'s own render loop already iterates one card at a time and knows the total. No overall percentage is computed or shown — the other phases (parse, lookup, PDF build) have no natural count available without changing `src/lib/*`, so they stay as plain phase-name text, not fabricated numbers.

## Capabilities

### New Capabilities
- `generation-progress`: reports proxy-card generation progress as an updating phase-status message, with a live `N of M` card count during the rendering phase specifically (the only phase with a natural, lib-unmodified count available).

### Modified Capabilities
(none — the four existing capabilities describe decklist parsing, card lookup, card rendering, and print/PDF export behavior, none of which changes)

## Impact

- `src/main.ts`, new `src/App.vue`
- `package.json` (new deps: `vue`, `@vitejs/plugin-vue`, `vue-tsc`; `build` script), `vite.config.ts` (Vue plugin), `tsconfig.json` (`.vue` support), new `src/env.d.ts` (or similar) shim for `.vue` module types
- No changes to `src/lib/*` or its tests
- No changes to the four existing spec capabilities (`decklist-parsing`, `card-data-lookup`, `proxy-card-rendering`, `print-sheet-export`)
