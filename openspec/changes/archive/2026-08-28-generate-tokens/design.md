## Context

See `proposal.md` - Why. Today `ScryfallClient.fetchTokenOrEmblem` (`src/lib/scryfall.ts`) resolves every `(token)`/`(emblem)` decklist entry with a bare `type:<kind> !"<name>"` Scryfall search and takes `data[0]`, with no way to disambiguate between same-named token designs. Verified directly against the live Scryfall API while designing this change:

- `POST /cards/collection` accepts both `{"name": ...}` and `{"id": ...}` identifiers and returns full Card objects (including `all_parts`) either way — the existing batched/rate-limited card-name lookup path extends to id-based lookups with no new endpoint.
- A card's `all_parts` entry for a token it creates is a stub (`id`, `name`, `type_line`, `uri`, `component: "token"`) — it does not carry `oracle_id`, `power`, `toughness`, `colors`, or `oracle_text`. Those require hydrating the id via `/cards/collection`.
- Different cards that create "the same" token (by name and rules) can link to *different* printing ids with the *same* `oracle_id` (confirmed: Elspeth, Sun's Champion's Soldier token and Raise the Alarm's Soldier token are different ids, same `oracle_id`).
- Emblem relationships are tagged `component: "combo_piece"`, the same tag used for a card's self-reference and for unrelated referenced cards — there is no `component` value specific to emblems.

## Goals / Non-Goals

**Goals:**
- Derive token entries from decklist cards' `all_parts` data with no additional user input required.
- Let a manual `(token)` line reference an already-derived token (for extra copies) or an undiscovered token (for cards not in the decklist), using the same hint syntax either way.

**Non-Goals:**
- Modeling how many tokens a card actually creates in a real game (X-costs, conditional triggers, etc.) — the derived set is always one copy per distinct token design, full stop.
- Emblem derivation (see Context - no reliable signal).
- Changing how `(card)` lines are resolved or how the flavor-name bracket behaves on card lines.

## Decisions

### Dedup key: `oracle_id`, not printing `id`
`all_parts` stubs only give a printing id. Deduping on that id would show two "1/1 white Soldier" proxies for a deck containing both Elspeth, Sun's Champion and Raise the Alarm, even though they're the same design. Dedup happens *after* hydration (oracle_id isn't available before then), keyed on `oracle_id`, first-occurrence-wins. This same key is used to detect when a manual token line matches an already-derived token, so the "shares a name" collision case (a manual line and a derived token happening to share a display name but not a design) resolves correctly instead of being conflated.

Alternative considered: dedup by printing `id`. Rejected — produces redundant proxies for the common case of the same generic token (Soldier, Clue, etc.) being created by multiple different cards in one deck.

### Manual token line resolution order: derived set first, Scryfall fallback second
```
match(name, hints) against derived set
  exactly one match  -> use it; manual entry's quantity REPLACES the derived
                         entry's quantity (consistent with how quantity works
                         everywhere else in the app - it's "print this many",
                         not "print this many more")
  zero matches        -> Scryfall type:token search, filtered by the given
                         hints (pow=/tou=/c=/o=) instead of name-only
  multiple matches     -> same Scryfall fallback as zero matches
```
Tie-handling (multiple derived candidates survive the given hints) falls through to the Scryfall search rather than reporting an unresolved/ambiguous error. This keeps a single fallback code path instead of two different failure semantics, and is defensible because the same hints that failed to narrow the derived set get handed to Scryfall's own query, which is likely to converge on a sensible print independently.

Alternative considered: report ambiguous ties as unresolved, asking the user for more specific hints. Rejected for now to keep one fallback path; can be revisited if it proves confusing in practice (see Risks).

### Hint grammar and the `<...>` ability-hint delimiter
Token lines gain optional, fixed-order hints between `(token)` and the name (`P/T` then `Color`), and an optional ability-hint list after the name. The ability-hint list uses `<...>`, a delimiter not used anywhere else in the grammar, rather than reusing the existing `[...]` flavor-name delimiter:
- `{...}` was rejected outright — the app already uses curly braces for mana-symbol text notation (`{W}`), so reusing it here would collide with an existing meaning in the same domain.
- `[...]` was rejected — while there's no actual *parsing* ambiguity (entry kind is already known from the `(token)`/`(card)` prefix before the bracket is reached), the same visual delimiter meaning two unrelated things (flavor name vs. ability hints) depending on what's earlier in the line is a real readability cost for hand-typed/hand-read decklists. Tokens don't meaningfully use the flavor-name mechanic today, so nothing is lost by reserving `[...]` for card lines only.
- `<...>` was chosen as unused elsewhere and visually distinct from both.

This is a narrow **BREAKING** change: a decklist that previously put `[...]` after a `(token)` line (read as a flavor name) will have that bracket silently ignored going forward.

### Derived-token hydration reuses the existing batched collection lookup
No new Scryfall endpoint or rate-limit logic. `all_parts` token ids across all resolved cards are collected, deduplicated, and hydrated through the same `/cards/collection` batching (≤75 per request) and combined throttle (`p-throttle`, 2 req/s) that `lookupCards` already uses for card names — just with `{"id": ...}` identifiers instead of `{"name": ...}`.

### Emblems excluded, not approximated
`component: "combo_piece"` is shared by a card's own self-reference, meld/combo references, and emblems alike — there's no field-level signal to isolate emblems from unrelated referenced cards. A `type_line.startsWith("Emblem")` heuristic over the noisier `combo_piece` bucket was considered and rejected: it's a materially different, weaker filter than the clean `component === "token"` check used for tokens, and per the change's own scoping condition ("include emblems if it can be transparently extended using the same interface, if not, drop"), that disqualifies it. Emblems stay manual-only (`(emblem)` lines), unaffected by this change.

## Risks / Trade-offs

- **[Risk]** Falling through to Scryfall on ambiguous derived-set ties (rather than reporting unresolved) could occasionally render a print that matches neither of the actual candidates in the user's deck. → **Mitigation**: none needed at ship time per explicit product decision; revisit with an explicit ambiguous-match error if this proves confusing in practice.
- **[Risk]** The `[...]`→`<...>` delimiter change silently drops any pre-existing flavor-name-on-token-line content instead of erroring. → **Mitigation**: accepted as low-impact (tokens don't commonly carry flavor names today); no migration needed since this is a client-side text-input format, not stored data.
- **[Risk]** Hint matching against `oracle_text` for ability hints is a simple case-insensitive substring check, not real oracle-text parsing — a hint like `"can't block"` would match, but something oddly phrased might not. → **Mitigation**: this only affects precision of an optional, user-supplied disambiguator; worst case is falling through to the Scryfall fallback, which applies the same substring logic server-side via `o:"..."`.
