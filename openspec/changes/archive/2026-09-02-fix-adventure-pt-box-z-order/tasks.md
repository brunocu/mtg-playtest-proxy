## 1. Fix stat box z-order in adventure/prepare rendering

- [x] 1.1 In `renderAdventureCard` (`src/lib/render-card.ts`), reorder the draw so the main face's stat box is composited after (on top of) the secondary rules box, for both mirrored (prepare) and non-mirrored (adventure) layouts, and verify by running the existing test suite plus manual reasoning about draw order in the diff.
- [x] 1.2 Verify non-mirrored adventure cards render unchanged (stat box already clear of the secondary box on the left) by running `npm test -- render-card render-faces` and confirming no existing adventure/prepare assertions regress.

## 2. Test coverage

- [x] 2.1 (Skipped) Pixel-level canvas assertions are not possible in this project's headless test environment (`document` is undefined under vitest, per the existing convention documented in `src/lib/pdf.ts` — "pixel-level output is verified manually ... not by unit test"). No canvas-rendering unit test is added for this fix.
- [x] 2.2 Manually verify in the browser (`npm run dev`) that a prepare card (e.g. a card with layout `prepare` and power/toughness) renders its stat box on top of, not obscured by, the mirrored secondary rules box.
