## Why

Many cards create tokens, and multiple distinct token designs commonly share the same name (e.g. "Bird" can be a 2/2 blue flying enchantment creature, a 1/1 black flying creature that can't block, or several other prints). Today, resolving a manual `(token) Bird` decklist line searches Scryfall by name only and takes whatever result comes back first, so the wrong Bird can silently get printed. Scryfall already records, on every card object, exactly which token(s) it creates via the `all_parts` field — this removes the guesswork entirely for any token whose source card is already in the decklist.

## What Changes

- Add a "Generate tokens" rendering option. When enabled, after decklist resolution the system inspects each resolved card's `all_parts` for `component: "token"` entries, batch-hydrates the referenced token ids via Scryfall's collection endpoint, deduplicates by `oracle_id` (so the same token design created by multiple different cards, or printed under different ids, only appears once), and includes one copy of each resulting token in the render set.
- Extend the manual `(token)` decklist line grammar to accept optional disambiguation hints between the `(token)` marker and the name: power/toughness (`2/2`), color letters (`U`, `WU`, `C`), and, after the name, an ability/keyword hint list in a **new delimiter**, `<flying, vigilance>`, distinct from the `[...]` flavor-name delimiter already used on card lines. **BREAKING**: any existing decklist that used `[...]` after a `(token)` line to mean a flavor name will now have that bracket content ignored, since `[...]` is not read on token lines going forward (only `<...>` is) — a narrow, low-likelihood break given tokens don't typically carry flavor names today.
- Change how manual `(token)` lines resolve: first attempt to match the line (by name plus any given hints) against the set of tokens already derived from `all_parts`; on exactly one match, use it and let the manual line's quantity replace the derived entry's quantity (this is how a user prints extra copies of an already-derived token). On zero or multiple matches, fall through to a Scryfall `type:token` search filtered by the same hints (power/toughness, color, oracle-text substrings) instead of blindly taking the first search result — this both covers tokens with no source card in the decklist and improves precision generally.
- Emblems are explicitly out of scope: Scryfall does not tag emblem relationships with `component: "token"` (they share the noisier `combo_piece` tag with unrelated referenced cards), so they cannot be derived through the same mechanism.

## Capabilities

### New Capabilities
- `token-generation`: derives token entries from resolved cards' Scryfall `all_parts` data, deduplicates by `oracle_id`, and gates the behavior behind a "Generate tokens" rendering option.

### Modified Capabilities
- `decklist-parsing`: token lines gain an optional power/toughness hint, color hint, and a new `<...>` ability-hint delimiter (replacing `[...]` for token lines specifically).
- `card-data-lookup`: manual token/emblem entry resolution now attempts a hint-filtered match against the derived token set before falling back to a hint-filtered Scryfall search, replacing the current blind name-only "take the first result" behavior.

## Impact

- `src/lib/decklist.ts`: line grammar/regex changes for token-line hints and the new ability delimiter; `DecklistEntry` gains optional hint fields.
- `src/lib/scryfall.ts`: `all_parts` added to the `ScryfallCard` type; new id-based batched collection lookup; token derivation, `oracle_id` dedup, and hint-based matching/query logic.
- `src/lib/deck-pipeline.ts`: new step to merge derived token entries into the resolved set ahead of `expandByQuantity`.
- `src/App.vue`: new "Generate tokens" checkbox in Advanced options, wired into the pipeline call.
- No new dependencies; reuses the existing Scryfall collection endpoint and rate-limiting.
