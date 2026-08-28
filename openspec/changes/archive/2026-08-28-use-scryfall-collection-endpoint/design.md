## Context

`src/lib/scryfall.ts` currently resolves each unique decklist entry with its own `/cards/named?fuzzy=` (cards) or `/cards/search?q=type:...` (tokens/emblems) request, chained through a single-file promise queue (`enqueue()`) with a fixed 100ms sleep (`delay()`) after every request. See proposal.md - Why for the motivating latency problem.

Scryfall's rate-limit docs (confirmed directly against `https://scryfall.com/docs/api/rate-limits`) classify `/cards/collection`, `/cards/named`, `/cards/search`, and `/cards/random` under a shared **2 requests/second** limit; all other endpoints allow 10/sec. `/cards/collection` accepts up to 75 identifiers per POST, matches by exact name only (no fuzzy), and returns `data` (found, in submission order modulo unmatched entries) plus `not_found` (unmatched identifiers, original shape preserved).

## Goals / Non-Goals

**Goals:**
- Batch all regular card lookups through `/cards/collection`.
- Replace the fixed-delay serial queue with a true sliding-window rate limiter shared across `/cards/collection` and `/cards/search`, since both share Scryfall's 2 req/sec bucket.
- Keep token/emblem resolution on `/cards/search` (unchanged matching behavior), participating in the same shared rate limit.
- Preserve the existing session-scoped in-memory cache behavior (dedup by `kind:lowercased-name` before issuing requests).

**Non-Goals:**
- No fuzzy-match fallback for unresolved/typo'd names (explicitly dropped, see proposal.md).
- No persistent (cross-session) cache — out of scope for this change.
- No change to rendering, PDF export, or decklist parsing.

## Decisions

**Batch via `POST /cards/collection`, chunked at 75 identifiers.** This is the only way to resolve many card names in few requests; the alternative (keep one `/cards/named` request per card) cannot be reduced below N requests for N unique names.

**Use `p-throttle` for the rate limiter instead of hand-rolling one.** Evaluated alternatives: `bottleneck` (token-bucket only, no true sliding-window support per an open upstream issue), `p-limit` (concurrency limiting only, not request-rate pacing — wrong primitive). `p-throttle` provides interval-based throttling (`{ limit, interval }`) matching Scryfall's 2 req/1000ms bucket directly, is ~8.7kB, ESM, and has no Node-only dependencies, so it works in this browser-only Vite app. Rejected building a custom limiter: the sliding-window edge cases (pruning, concurrent-caller races) are exactly what a maintained micro-library already handles correctly.

**Single shared throttle instance across `/cards/collection` and `/cards/search`.** Both endpoints share Scryfall's 2 req/sec bucket per the rate-limits doc, so gating them independently (e.g. 2/sec each) would double-count and risk 429s. All outbound requests — batched card lookups and per-token/emblem searches — go through one `p-throttle`-wrapped function.

**Drop fuzzy matching entirely rather than keep a fallback path.** `/cards/collection` only exact-matches; adding a fallback `/cards/named?fuzzy=` call for every `not_found` entry would reintroduce per-card serialized requests for exactly the failure case that's hardest to batch, undermining the performance goal. The user confirmed this tradeoff is acceptable.

**Rewrite `scryfall.ts` rather than patch incrementally.** The batching model changes the shape of resolution from "resolve one entry" to "resolve a set of entries as a batch, then zip results back," which doesn't fit cleanly on top of the existing per-entry `lookup()` API. No requirement to preserve the existing implementation (confirmed by user).

## Risks / Trade-offs

- **Typos silently fail instead of auto-correcting** → Accepted tradeoff (see proposal.md - BREAKING). Unresolved-entry reporting already exists and surfaces these by name.
- **`not_found` array from `/cards/collection` doesn't carry a reason/message** (unlike a 404 body from `/cards/named`) → synthesize a generic "no exact match" reason string per unresolved identifier rather than relying on a server-provided message.
- **Response ordering**: `/cards/collection` docs warn not to rely on positional index alignment between request identifiers and `data`/`not_found` — mitigate by matching results back to requested identifiers by name rather than by array position.
- **Shared rate limit across two endpoint types** means a decklist with both many unique cards and many unique tokens/emblems takes longer in total (they compete for the same 2/sec budget) — acceptable since it's still far fewer requests overall than today's per-entry approach.

## Migration Plan

No data migration. This is a client-side-only change: update `scryfall.ts`, its call site in `main.ts`, add `p-throttle` to `package.json`, update `scryfall.test.ts`. Ship as a normal deploy; no feature flag needed since there's no persisted state to migrate.
