## 1. Tooling setup

- [x] 1.1 Add `vue`, `@vitejs/plugin-vue`, and `vue-tsc` to `package.json` and verify `npm install` succeeds
- [x] 1.2 Register `@vitejs/plugin-vue` in `vite.config.ts` and verify `npm run dev` serves without config errors
- [x] 1.3 Add a `.vue` module type shim (e.g. `src/vite-env.d.ts` with `/// <reference types="vite/client" />` plus a `declare module '*.vue'` block if not already covered) and confirm no `.vue` import type errors
- [x] 1.4 Update the `build` script in `package.json` to run `vue-tsc` (in place of, or alongside, bare `tsc`) and verify `npm run build` still produces `dist/`

## 2. Progress state

- [x] 2.1 Add a reactive progress model in `App.vue` (status message string, current/total card count for the rendering phase, error state flag) per design.md's phase-status scheme (parse/lookup/PDF are name-only messages, rendering shows "N of M")
- [x] 2.2 Wire the existing parse → resolve → render-loop → build-PDF orchestration (moved from `main.ts`'s `generateAndDownload`) to set the status message at each phase transition and increment the card count after each per-card render, and verify via a manual run that the message updates at each phase and the count updates per card for a multi-card decklist
- [x] 2.3 On a thrown error at any phase, stop updating status and set the error state instead of leaving a stale phase message, and verify by triggering an unresolved-entry error and a total-lookup-failure error

## 3. App.vue UI

- [x] 3.1 Build `src/App.vue` `<script setup>` containing: decklist textarea state, the five rendering-option checkboxes and two print-option controls as reactive refs, `currentRenderOptions`/`currentPrintOptions` equivalents as `computed`, and the generate handler from `main.ts`
- [x] 3.2 Build `App.vue`'s `<template>`: decklist textarea, rendering-options fieldset, print-options fieldset, generate button (disabled while running), text status bound to the status-message/count state, error list (`v-for` over errors), static legal/attribution footer markup, and verify visually against the current app's layout
- [x] 3.3 Move typography/layout rules currently inline (`style="font-family: ..."` etc.) into `App.vue`'s `<style scoped>` and verify no visual regression
- [x] 3.4 Render status as plain text — phase name alone for parse/lookup/PDF (e.g. `Looking up card data on Scryfall…`), phase name plus count for rendering (e.g. `Rendering cards… (12 of 40)`) — with no progress bar element, no CSS animation, and no overall percentage, and verify the text updates correctly at each phase and per card during a manual generation run

## 4. Bootstrap and cleanup

- [x] 4.1 Reduce `src/main.ts` to `createApp(App).mount('#app')` (plus the existing top-level CSS/font imports, moved here or into `App.vue` as appropriate) and verify the app still boots via `npm run dev`
- [x] 4.2 Remove the now-dead manual DOM template/wiring/error-rendering code from `main.ts`
- [x] 4.3 Run `npm run test` and confirm all existing `src/lib/__tests__/*` still pass unchanged
- [x] 4.4 Run `npm run build` and confirm it succeeds end-to-end (`vue-tsc` + `vite build`)

## 5. Manual verification

- [x] 5.1 Manually generate a PDF for a small decklist (1-2 cards) and confirm output PDF is unchanged from pre-migration behavior
- [x] 5.2 Manually generate a PDF for a larger decklist (20+ cards, several unique names with quantity > 1) and confirm the "N of M" card count visibly updates per card during rendering, per `generation-progress` spec scenario "Decklist with many cards being rendered"
- [x] 5.3 Manually trigger an unresolvable decklist (e.g. all-typo entries) and confirm the error state displays clearly and the status message does not appear stuck at a stale phase, per `generation-progress` spec scenario "Card lookup fails entirely"
