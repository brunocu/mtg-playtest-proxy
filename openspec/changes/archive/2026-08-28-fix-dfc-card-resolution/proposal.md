## Why

Decklist entries for double-faced, split, and adventure cards (e.g. `Esper Origins // Summon: Esper Maduin`, `Brazen Borrower // Petty Theft`) currently fail to resolve no matter how they're typed. Live testing against `POST /cards/collection` confirms two compounding causes: (1) Scryfall's `name` identifier never matches a card's own combined `"Front // Back"` name — only an individual face name resolves it — and (2) `lookupCards` in `src/lib/scryfall.ts` reconstructs its found/not-found split by re-matching each returned card's `name` field against the requested identifier string, which fails for every two-faced layout because the returned name (`"Front // Back"`) is never textually equal to either the combined name or a single face name that was searched for.

## What Changes

- Before sending a card-entry name to `/cards/collection`, split off the front-face substring (text before the first `" // "`) and search using that, while continuing to track the entry by its originally-typed name.
- Replace the found/not-found reconstruction in `lookupCards`: stop re-deriving results by comparing returned `card.name` against the requested identifier, and instead correlate Scryfall's `data`/`not_found` response arrays positionally against the request order (confirmed empirically: Scryfall preserves request order across both arrays, interleaving found and not-found in original sequence).
- **BREAKING**: none — this only fixes cases that are already completely broken (unresolvable) today; no previously-working resolution path changes behavior.

## Capabilities

### Modified Capabilities
- `card-data-lookup`: exact-name matching now accounts for two-faced card layouts (matches by front-face name when the full combined name doesn't match), and the found/not-found result reconstruction is positionally correlated against Scryfall's response instead of re-matching by name text.

## Impact

- `src/lib/scryfall.ts`: `lookupCards`/`fetchCollection` request construction (front-face extraction) and response reconstruction (positional correlation instead of name re-matching).
- `src/lib/scryfall.test.ts`: existing tests asserting found/not-found behavior via mocked responses need updating to reflect positional correlation; new tests for two-faced card name resolution (transform, modal_dfc, split, adventure).
- No changes to `decklist.ts` (parsing already preserves `//`-containing names correctly) or `render-faces.ts` (rendering already handles all two-faced layouts once given resolved card data).
