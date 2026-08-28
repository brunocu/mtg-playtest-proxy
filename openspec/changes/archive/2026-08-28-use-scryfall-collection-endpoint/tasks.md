## 1. Dependencies

- [x] 1.1 Add `p-throttle` to `package.json` dependencies and verify `npm install` succeeds
- [x] 1.2 Import `p-throttle` in `src/lib/scryfall.ts` and verify TypeScript build (`tsc`) resolves types

## 2. Rate limiter

- [x] 2.1 Create a single shared throttled fetch wrapper using `p-throttle` configured for 2 requests/1000ms and verify a unit test asserts no more than 2 calls to the underlying fetch fire within any 1000ms window across mixed collection/search calls
- [x] 2.2 Remove the existing `enqueue()`/`delay()` serial-queue implementation

## 3. Batched card lookup via /cards/collection

- [x] 3.1 Implement chunking of unique card-entry names into groups of at most 75 and verify a unit test covers 0, 1, 75, and 76+ unique names
- [x] 3.2 Implement `POST /cards/collection` request/response handling (build `identifiers` array, parse `data`/`not_found`) and verify a unit test covers a successful batch response
- [x] 3.3 Match `not_found` identifiers back to originating decklist entries by name (not array position) and verify a unit test covers a batch with mixed found/not_found entries, including out-of-order responses
- [x] 3.4 Synthesize an unresolved reason string for `not_found` entries (no server-provided message) and verify a unit test asserts a human-readable reason is present

## 4. Token/emblem lookup

- [x] 4.1 Port `fetchTokenOrEmblem` (`/cards/search?q=type:...`) to route through the shared throttled fetch wrapper and verify a unit test confirms token/emblem requests are throttled alongside collection requests

## 5. Resolution orchestration

- [x] 5.1 Rewrite `resolveDecklist` to: dedupe entries via the session cache, split into card vs. token/emblem entries, batch-resolve cards via `/cards/collection`, resolve tokens/emblems via search, and zip all results back onto original decklist entries (preserving quantity/order) — verify a unit test covers a decklist mixing cards, tokens, and duplicate entries
- [x] 5.2 Preserve session-scoped in-memory cache dedup (`kind:lowercased-name`) so repeated entries for the same card issue no duplicate request — verify existing cache-dedup test still passes (or is ported) against the new implementation
- [x] 5.3 Preserve continue-past-failures behavior (other entries still resolve when some are unresolved) — verify existing unresolved-entry test still passes (or is ported)

## 6. Cleanup and call site

- [x] 6.1 Update `main.ts`'s call into `resolveDecklist`/`ScryfallClient` for the new API shape and verify `npm run build` succeeds
- [x] 6.2 Remove the fuzzy-match-specific tests in `scryfall.test.ts` (including the "sequential request queue" test) and add tests for batching, exact-match-only resolution, and rate-limit pacing — verify `npm test` passes
- [x] 6.3 Manually run a decklist with 80+ unique card names, at least one deliberate typo, and at least one token/emblem entry through the app; verify multiple `/cards/collection` requests fire, the typo reports unresolved, and the token/emblem resolves via `/cards/search`
