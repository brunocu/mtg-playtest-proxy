## Why

Card resolution currently issues one serialized `/cards/named` (or `/cards/search`) request per unique card name with a fixed 100ms gap between requests, so a decklist with N unique cards takes N sequential round trips (multiple seconds for a typical deck). Batching card lookups through Scryfall's `POST /cards/collection` endpoint (up to 75 identifiers per request) collapses this to `ceil(N/75)` requests, and switching to a proper sliding-window rate limiter lets those (and the remaining token/emblem `/cards/search` requests) run without an unconditional per-request sleep.

## What Changes

- Replace per-entry `/cards/named?fuzzy=` lookups with batched `POST /cards/collection` requests (chunked at 75 identifiers) for regular card entries.
- **BREAKING**: Drop fuzzy name matching. `/cards/collection` only supports exact name matches; a decklist entry with a typo or near-miss name now reports as unresolved instead of being auto-corrected. This is an accepted tradeoff.
- Token and emblem entries continue to use `/cards/search` with `type:` filters (unsupported by `/cards/collection`), unchanged in matching behavior.
- Replace the existing serial `enqueue()`/fixed-100ms-delay throttle with a sliding-window rate limiter (via the `p-throttle` package) shared across `/cards/collection` and `/cards/search` calls, respecting Scryfall's published 2 requests/second limit for both endpoints.
- Rewrite `src/lib/scryfall.ts`; the existing per-entry `ScryfallClient.lookup()`/serial-queue implementation is not preserved.
- Add `p-throttle` as a new runtime dependency.

## Capabilities

### Modified Capabilities
- `card-data-lookup`: replaces fuzzy name matching with exact-match batched lookup via `/cards/collection`; replaces the per-entry serial request queue with a shared sliding-window rate limiter across `/cards/collection` and `/cards/search`. (Currently defined only as a delta spec under the not-yet-archived `port-bwproxy-to-web` change; this change's delta is written against that spec's content.)

## Impact

- `src/lib/scryfall.ts`: full rewrite of the request/resolution logic (batching, rate limiting, response mapping); type definitions (`ScryfallCard`, `ScryfallCardFace`, etc.) largely retained.
- `src/lib/decklist.ts` / entry point (`main.ts`): `resolveDecklist` call shape may change from per-entry iteration to batch-oriented resolution; caller updated accordingly.
- `src/lib/scryfall.test.ts`: existing "sequential request queue" test no longer applies and is replaced with tests for batching and rate-limit behavior.
- `package.json`: adds `p-throttle` as a dependency.
- No changes to rendering, PDF export, or decklist parsing.
