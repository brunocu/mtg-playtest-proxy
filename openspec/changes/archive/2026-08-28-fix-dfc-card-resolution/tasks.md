## 1. Request construction

- [x] 1.1 In `lookupCards`, for each name being fetched, derive the outgoing Scryfall identifier by taking the substring before the first `" // "` (or the full name unchanged if no `" // "` is present), while keeping the original entry name as the key for cache/result tracking. Verify with a unit test that a two-faced entry name produces a front-face-only identifier in the request body sent to `fetchCollection`.

## 2. Response correlation

- [x] 2.1 Replace the `byLowerName`-based reconstruction in `lookupCards` with positional correlation against `response.data` and `response.not_found`, walking the request chunk in order and consuming from whichever array's next entry matches the current position. Verify with a unit test using a mocked response (built from the interleaved found/not-found shape confirmed against the live API) that resolved and unresolved entries end up in the correct buckets.
- [x] 2.2 Verify with a unit test that an ordinary (non-two-faced) card entry still resolves correctly through the new correlation logic (regression coverage for the existing exact-match path).

## 3. Two-faced card coverage

- [x] 3.1 Add unit tests covering resolution of a transform card (e.g. `Esper Origins // Summon: Esper Maduin`) entered under its combined name, and the same card entered as just `Esper Origins`, using mocked Scryfall responses shaped like the confirmed live-API behavior.
- [x] 3.2 Add unit tests covering the same two entry styles (combined name, front-face-only) for a split card and an adventure card, using mocked Scryfall responses.

## 4. Verification

- [x] 4.1 Run the full test suite (`npm test` or equivalent) and confirm it passes, including the existing `card-data-lookup` scenarios and the new two-faced cases.
- [x] 4.2 Manually enter `Esper Origins // Summon: Esper Maduin` and `Esper Origins` into the app's decklist input and confirm both resolve and render (both faces) without an unresolved-entry error.
