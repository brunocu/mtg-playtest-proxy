## Context

See proposal.md - Why. Two independent, confirmed-live-against-`api.scryfall.com` facts drive this design:

1. `POST /cards/collection`'s `name` identifier only ever matches an individual face name for two-faced layouts (transform, modal_dfc, split, aftermath, flip, adventure). It never matches the card's own combined `name` field (`"Front // Back"`), even though that's the literal value Scryfall stores and returns.
2. `data` (matched cards) and `not_found` (unmatched identifiers) in the response each preserve the original request order among themselves, with `data` skipping over positions that landed in `not_found`. Confirmed by sending an interleaved found/not-found/found sequence and checking both arrays reproduce that order.

The current `lookupCards` in `src/lib/scryfall.ts` ignores `response.not_found` entirely and instead rebuilds found/not-found by indexing `response.data` under each returned `card.name.toLowerCase()` and looking that up by the *requested* identifier string. That only works when the returned name equals the requested identifier — true for ordinary cards, never true for two-faced ones.

## Goals / Non-Goals

**Goals:**
- Resolve two-faced cards regardless of whether the decklist entry uses the combined name or just the front face.
- Stop relying on returned-name-equals-requested-name for correlating results; use Scryfall's actual `data`/`not_found` split instead.

**Non-Goals:**
- Fuzzy/typo correction — out of scope, unchanged from the exact-match-only behavior established in `use-scryfall-collection-endpoint`.
- Changing token/emblem lookup (`/cards/search`-based), which is unaffected by this bug.
- Changing anything in `decklist.ts` or `render-faces.ts` — both already handle `//`-containing names and two-faced render plans correctly once given resolved card data.

## Decisions

**Send the front-face substring, not the full combined name, as the Scryfall identifier.**
For any entry name containing `" // "`, extract the substring before the first occurrence and use that as the outgoing `name` identifier. Keep a mapping back to the original entry name so results still key against what the user typed (matching the existing `resolveDecklist` contract, which looks up `cardResults.found` by `entry.name.toLowerCase()`).

Alternative considered: try the combined name first and only retry with the front face on a miss. Rejected — adds a second request round-trip for every two-faced card even though we already know from live testing the combined form never matches, so the first attempt is guaranteed wasted work.

**Correlate `data`/`not_found` positionally instead of by name comparison.**
Walk the request `chunk` in order; walk `response.not_found` in parallel (also in order) as a lookahead — when the current chunk name matches the next `not_found` entry, consume it and mark that entry unresolved; otherwise consume the next item from `response.data` in order and mark that entry resolved. This works because both arrays are confirmed to preserve relative request order.

Alternative considered: keep matching by name but index `byLowerName` using every `card_faces[i].name` in addition to `card.name`, so a front-face-only request also matches. Rejected — this still leaves the local reconstruction dependent on undocumented/untested assumptions about how Scryfall's fuzzy-ish `name` identifier resolves any *other* not-yet-encountered case (e.g. a card with three faces, or future layout types), whereas trusting the response's own `not_found`/`data` split needs no per-layout special-casing at all.

**Cache under the original entry name, not the front-face-stripped search name.**
`ScryfallClient.cache` keys stay `card:${entry.name.toLowerCase()}` (unchanged) so repeated entries of the same two-faced card (typed identically) still hit cache; the front-face extraction is purely an outgoing-request detail, invisible to callers and to the cache.

## Risks / Trade-offs

- [Positional correlation assumes Scryfall's ordering guarantee holds] → Confirmed empirically across two independent live requests with distinct interleavings; if this ever proves wrong for some untested identifier shape, the failure mode is a misattributed unresolved entry (reported as unresolved when it isn't, or vice versa) rather than a crash — acceptable given the alternative (current behavior) is unconditionally broken for two-faced cards.
- [A two-faced card whose front face name collides with a different card's full name] → Scryfall's `name` identifier match on a bare front-face string returns its own best/newest-printing match for that name; this is the same ambiguity that already exists for any single-name lookup today and isn't introduced by this change.

## Migration Plan

No data migration. Ship as a single code change to `src/lib/scryfall.ts`; no feature flag needed since the new behavior is strictly a superset (every case that resolves today keeps resolving identically; only previously-unresolvable two-faced cases change outcome).
