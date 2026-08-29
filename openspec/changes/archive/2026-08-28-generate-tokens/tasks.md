## 1. Decklist grammar for token hints

- [x] 1.1 Extend `DecklistEntry` (`src/lib/decklist.ts`) with optional hint fields for token entries: power/toughness (e.g. `{ power: string; toughness: string }`), color letters (`string[]` or normalized string), and ability hints (`string[]`)
- [x] 1.2 Update the token-line grammar/regex to parse, in order after `(token)`: an optional `P/T` hint, an optional color-letters hint, the required name, and an optional trailing `<ability, ability>` hint list — verify with unit tests covering each hint alone, combined, and absent (`src/lib/__tests__/decklist.test.ts`)
- [x] 1.3 Ensure `[...]` after a `(token)` line is no longer parsed as a flavor name (content ignored, not an error) and that `[...]` on `(card)` lines is unaffected — verify with a test asserting a token entry produced from `(token) Bird [Big Bird]` has no `flavorName`
- [x] 1.4 Ensure quantity prefixes (bare/numeric/"Nx") still parse correctly alongside the new hints — verify with a test for `2x (token) 2/2 U Bird <flying>`

## 2. Scryfall data model and id-based batched lookup

- [x] 2.1 Add `all_parts` (array of `{ id, component, name, type_line, uri }`) to the `ScryfallCard` type in `src/lib/scryfall.ts`
- [x] 2.2 Extend the batched `/cards/collection` lookup path to accept `{"id": ...}` identifiers alongside `{"name": ...}`, reusing the existing 75-per-batch, combined-rate-limited throttle — verify with a unit test mocking `FetchLike` and asserting id-based identifiers are sent and batched the same way as name-based ones
- [x] 2.3 Add an `oracle_id` field to the `ScryfallCard` type if not already present, since dedup and derived-set matching depend on it

## 3. Token derivation

- [x] 3.1 Implement a function that scans a list of resolved cards' `all_parts` for `component === "token"` entries and returns the deduplicated set of token ids to hydrate (dedup at the id-collection stage is just "unique ids to fetch"; design-level dedup happens after hydration in 3.3)
- [x] 3.2 Hydrate the collected token ids via the id-based batched lookup from 2.2 — verify with a test asserting a card with two `all_parts` token stubs results in both being fetched by id
- [x] 3.3 Deduplicate hydrated tokens by `oracle_id`, keeping the first occurrence, producing the final derived-token set (quantity 1 each) — verify with a test where two different resolved cards reference token stubs with different `id`s but the same `oracle_id`, asserting only one entry survives
- [x] 3.4 Verify a resolved card with no token relationships, or only non-token `all_parts` entries (e.g. `combo_piece`), contributes nothing to the derived set

## 4. Manual token-line resolution against the derived set

- [x] 4.1 Implement matching a manual token entry (name + hints) against the derived-token set: name must match; given power/toughness hint must equal candidate `power`/`toughness`; given color hint must equal candidate `colors` as a set; each given ability hint must substring-match (case-insensitive) candidate `oracle_text`
- [x] 4.2 On exactly one match, resolve the manual entry to that derived token's card data and use the manual entry's quantity in place of the derived entry's default quantity — verify with a test asserting the final resolved quantity reflects the manual line, not the default 1
- [x] 4.3 On zero or multiple matches, fall through to a Scryfall `type:token` search filtered by the given hints (`pow=`, `tou=`, `c=`, `o:"..."` as applicable) instead of the current blind `data[0]` — verify with tests for: no derived set at all, zero matches against a non-empty derived set, and multiple ties against the derived set (all three should hit the Scryfall path)
- [x] 4.4 Confirm emblem entry resolution is unchanged (name-based `type:emblem` search, no hint parsing applied)

## 5. Pipeline wiring

- [x] 5.1 Add a `deriveGeneratedTokenEntries`-style step in `src/lib/deck-pipeline.ts` (or `scryfall.ts`, per where `resolveDecklist` lives) that, when token generation is enabled, runs after card resolution and before `expandByQuantity`, merging derived tokens with manually resolved token entries per the matching/dedup rules above
- [x] 5.2 Verify end-to-end via a `resolveDecklist`/pipeline-level test: a decklist with one card that creates a token, no manual token line, generation enabled → one derived token in the final resolved set
- [x] 5.3 Verify end-to-end: same decklist plus a manual `2x (token) ...` line matching the derived token → final resolved set has that token at quantity 2, not 1
- [x] 5.4 Verify end-to-end: generation disabled → no derived tokens appear regardless of `all_parts` data

## 6. UI option

- [x] 6.1 Add a "Generate tokens" checkbox to the Advanced options fieldset in `src/App.vue`, disabled by default, following the existing checkbox pattern (`coloredBorders`, `ignoreLands`, etc.)
- [x] 6.2 Wire the checkbox into the generate pipeline call so `resolveDecklist`/the pipeline step from 5.1 receives whether generation is enabled
- [x] 6.3 Manually verify in the running dev app: paste a decklist containing a token-making card (e.g. Chatterfang, Squirrel General), enable "Generate tokens", generate the PDF, and confirm the derived token appears in the output

## 7. Regression check

- [x] 7.1 Run the full test suite (`npm run test`) and confirm all existing tests still pass, including existing decklist/scryfall/pipeline tests unrelated to this change
