import pThrottle from 'p-throttle';
import type { DecklistEntry } from './decklist';

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  image_uris?: Record<string, string>;
}

export interface ScryfallRelatedCard {
  id: string;
  component: string;
  name: string;
  type_line: string;
  uri: string;
}

export interface ScryfallCard {
  id?: string;
  oracle_id?: string;
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: string[];
  color_identity: string[];
  layout: string;
  card_faces?: ScryfallCardFace[];
  image_uris?: Record<string, string>;
  all_parts?: ScryfallRelatedCard[];
}

export interface ResolvedEntry {
  entry: DecklistEntry;
  card: ScryfallCard;
}

export interface UnresolvedEntry {
  entry: DecklistEntry;
  reason: string;
}

export interface ResolveResult {
  resolved: ResolvedEntry[];
  unresolved: UnresolvedEntry[];
}

export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export type FetchLike = (
  input: string,
  init?: FetchInit,
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

interface ScryfallErrorBody {
  object: 'error';
  details?: string;
}

interface ScryfallCollectionResponse {
  data: ScryfallCard[];
  not_found: Array<{ name?: string }>;
}

const SCRYFALL_API = 'https://api.scryfall.com';
const COLLECTION_CHUNK_SIZE = 75;
const RATE_LIMIT = { limit: 2, interval: 1000 };

/** Result of a batched card-name lookup, keyed by lowercased name. */
interface CardLookupResult {
  found: Map<string, ScryfallCard>;
  notFound: string[];
}

/**
 * Scryfall's collection endpoint only matches an individual face name for two-faced
 * layouts (transform, modal_dfc, split, aftermath, flip, adventure) — never the
 * combined "Front // Back" name. Extract the front-face substring to search with.
 */
function frontFaceName(name: string): string {
  const sepIndex = name.indexOf(' // ');
  return sepIndex === -1 ? name : name.slice(0, sepIndex);
}

export class ScryfallClient {
  private cache = new Map<string, ScryfallCard>();
  private readonly throttledFetch: FetchLike;

  constructor(options?: { fetchFn?: FetchLike }) {
    const fetchFn = options?.fetchFn ?? ((input: string, init?: FetchInit) => fetch(input, init));
    const throttle = pThrottle(RATE_LIMIT);
    this.throttledFetch = throttle(fetchFn);
  }

  private async fetchCollection(
    identifiers: Array<{ name: string } | { id: string }>,
  ): Promise<ScryfallCollectionResponse> {
    const url = `${SCRYFALL_API}/cards/collection`;
    const res = await this.throttledFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers }),
    });
    if (!res.ok) {
      const body = (await res.json()) as ScryfallErrorBody;
      throw new Error(body.details ?? `Card collection lookup failed (status ${res.status})`);
    }
    return (await res.json()) as ScryfallCollectionResponse;
  }

  /**
   * Resolves card ids to full card data, batching requests to `/cards/collection`
   * in groups of at most 75. Not cached (ids are only looked up once per derivation pass).
   */
  async lookupByIds(ids: string[]): Promise<ScryfallCard[]> {
    const cards: ScryfallCard[] = [];
    for (let i = 0; i < ids.length; i += COLLECTION_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + COLLECTION_CHUNK_SIZE);
      const response = await this.fetchCollection(chunk.map((id) => ({ id })));
      cards.push(...response.data);
    }
    return cards;
  }

  private async fetchTokenOrEmblem(entry: DecklistEntry): Promise<ScryfallCard> {
    const kind = entry.kind as 'token' | 'emblem';
    let query = `type:${kind} !"${entry.name}"`;
    if (kind === 'token') {
      if (entry.powerToughness) {
        query += ` pow=${entry.powerToughness.power} tou=${entry.powerToughness.toughness}`;
      }
      if (entry.colors) {
        query += entry.colors.includes('C') ? ' c=c' : ` c=${entry.colors.join('').toLowerCase()}`;
      }
      for (const hint of entry.abilityHints ?? []) {
        query += ` o:"${hint}"`;
      }
    }
    const url = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}`;
    const res = await this.throttledFetch(url);
    if (!res.ok) {
      const body = (await res.json()) as ScryfallErrorBody;
      throw new Error(body.details ?? `No ${kind} found matching "${entry.name}"`);
    }
    const body = (await res.json()) as { data: ScryfallCard[] };
    const card = body.data?.[0];
    if (!card) throw new Error(`No ${kind} found matching "${entry.name}"`);
    return card;
  }

  /**
   * Resolves unique card names by exact match, batching requests to `/cards/collection`
   * in groups of at most 75. Uses and populates the session cache.
   */
  async lookupCards(names: string[]): Promise<CardLookupResult> {
    const found = new Map<string, ScryfallCard>();
    const notFound: string[] = [];

    const toFetch: string[] = [];
    for (const name of names) {
      const key = `card:${name.toLowerCase()}`;
      const cached = this.cache.get(key);
      if (cached) {
        found.set(name.toLowerCase(), cached);
      } else {
        toFetch.push(name);
      }
    }

    for (let i = 0; i < toFetch.length; i += COLLECTION_CHUNK_SIZE) {
      const chunk = toFetch.slice(i, i + COLLECTION_CHUNK_SIZE);
      const response = await this.fetchCollection(chunk.map((name) => ({ name: frontFaceName(name) })));

      let dataIndex = 0;
      let notFoundIndex = 0;
      for (const name of chunk) {
        const lower = name.toLowerCase();
        const searchName = frontFaceName(name).toLowerCase();
        const nextNotFound = response.not_found[notFoundIndex];
        if (nextNotFound && (nextNotFound.name ?? '').toLowerCase() === searchName) {
          notFoundIndex++;
          notFound.push(name);
        } else {
          const card = response.data[dataIndex++];
          this.cache.set(`card:${lower}`, card);
          found.set(lower, card);
        }
      }
    }

    return { found, notFound };
  }

  /** Resolves one token/emblem decklist entry to Scryfall card data, using the session cache when possible. */
  async lookupTokenOrEmblem(entry: DecklistEntry): Promise<ScryfallCard> {
    const key = tokenEmblemCacheKey(entry);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const card = await this.fetchTokenOrEmblem(entry);
    this.cache.set(key, card);
    return card;
  }
}

function tokenEmblemCacheKey(entry: DecklistEntry): string {
  if (entry.kind !== 'token') return `${entry.kind}:${entry.name.toLowerCase()}`;
  const pt = entry.powerToughness ? `${entry.powerToughness.power}/${entry.powerToughness.toughness}` : '';
  const colors = entry.colors ? [...entry.colors].sort().join('') : '';
  const abilities = entry.abilityHints
    ? [...entry.abilityHints].map((h) => h.toLowerCase()).sort().join(',')
    : '';
  return `token:${entry.name.toLowerCase()}:${pt}:${colors}:${abilities}`;
}

/** Scans resolved cards' `all_parts` for token relationships and returns the unique ids to hydrate. */
function collectTokenIds(cards: ScryfallCard[]): string[] {
  const ids = new Set<string>();
  for (const card of cards) {
    for (const part of card.all_parts ?? []) {
      if (part.component === 'token') ids.add(part.id);
    }
  }
  return [...ids];
}

/**
 * Derives the set of tokens created by the given resolved cards: hydrates every unique
 * token id referenced via `all_parts`, then deduplicates by `oracle_id` (first occurrence
 * wins) so the same token design referenced by multiple cards appears once.
 */
export async function deriveTokens(
  cards: ScryfallCard[],
  client: ScryfallClient,
): Promise<ScryfallCard[]> {
  const ids = collectTokenIds(cards);
  if (ids.length === 0) return [];

  const hydrated = await client.lookupByIds(ids);

  const seen = new Set<string>();
  const deduped: ScryfallCard[] = [];
  for (const card of hydrated) {
    const key = card.oracle_id ?? card.id ?? card.name;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(card);
  }
  return deduped;
}

/** Whether a manual token entry's name and hints match a derived token candidate. */
function tokenEntryMatches(entry: DecklistEntry, card: ScryfallCard): boolean {
  if (entry.name.toLowerCase() !== card.name.toLowerCase()) return false;

  if (entry.powerToughness) {
    if (card.power !== entry.powerToughness.power || card.toughness !== entry.powerToughness.toughness) {
      return false;
    }
  }

  if (entry.colors) {
    const cardColors = card.colors ?? [];
    if (entry.colors.includes('C')) {
      if (entry.colors.length !== 1 || cardColors.length !== 0) return false;
    } else {
      const hintSet = new Set(entry.colors);
      const cardSet = new Set(cardColors);
      if (hintSet.size !== cardSet.size || [...hintSet].some((c) => !cardSet.has(c))) return false;
    }
  }

  if (entry.abilityHints) {
    const text = (card.oracle_text ?? '').toLowerCase();
    if (!entry.abilityHints.every((hint) => text.includes(hint.toLowerCase()))) return false;
  }

  return true;
}

/** Finds every derived-token candidate that matches a manual token entry's name and hints. */
function matchDerivedTokens(
  entry: DecklistEntry,
  derivedTokens: ScryfallCard[],
): Array<{ card: ScryfallCard; index: number }> {
  return derivedTokens
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => tokenEntryMatches(entry, card));
}

export interface ResolveDecklistOptions {
  /** When true, tokens are derived from resolved cards' Scryfall `all_parts` data. */
  generateTokens?: boolean;
}

/** Resolves every decklist entry, continuing past individual failures and reporting them. */
export async function resolveDecklist(
  entries: DecklistEntry[],
  client: ScryfallClient,
  options?: ResolveDecklistOptions,
): Promise<ResolveResult> {
  const resolved: ResolvedEntry[] = [];
  const unresolved: UnresolvedEntry[] = [];

  const uniqueCardNames = new Map<string, string>(); // lowercased -> first-seen original casing
  for (const entry of entries) {
    if (entry.kind !== 'card') continue;
    const lower = entry.name.toLowerCase();
    if (!uniqueCardNames.has(lower)) uniqueCardNames.set(lower, entry.name);
  }

  let cardResults: CardLookupResult = { found: new Map(), notFound: [] };
  if (uniqueCardNames.size > 0) {
    cardResults = await client.lookupCards([...uniqueCardNames.values()]);
  }

  let derivedTokens: ScryfallCard[] = [];
  if (options?.generateTokens) {
    derivedTokens = await deriveTokens([...cardResults.found.values()], client);
  }
  const derivedMatches = new Map<DecklistEntry, Array<{ card: ScryfallCard; index: number }>>();
  const derivedUsed = new Set<number>();

  const tokenEmblemResults = new Map<string, ScryfallCard | Error>();
  for (const entry of entries) {
    if (entry.kind === 'card') continue;

    if (entry.kind === 'token' && derivedTokens.length > 0) {
      const matches = matchDerivedTokens(entry, derivedTokens);
      derivedMatches.set(entry, matches);
      if (matches.length === 1) {
        derivedUsed.add(matches[0].index);
        continue;
      }
    }

    const key = tokenEmblemCacheKey(entry);
    if (tokenEmblemResults.has(key)) continue;
    try {
      const card = await client.lookupTokenOrEmblem(entry);
      tokenEmblemResults.set(key, card);
    } catch (err) {
      tokenEmblemResults.set(key, err instanceof Error ? err : new Error(String(err)));
    }
  }

  for (const entry of entries) {
    if (entry.kind === 'card') {
      const card = cardResults.found.get(entry.name.toLowerCase());
      if (card) {
        resolved.push({ entry, card });
      } else {
        unresolved.push({ entry, reason: `No exact match found for "${entry.name}"` });
      }
      continue;
    }

    const matches = derivedMatches.get(entry);
    if (matches && matches.length === 1) {
      resolved.push({ entry, card: matches[0].card });
      continue;
    }

    const key = tokenEmblemCacheKey(entry);
    const result = tokenEmblemResults.get(key)!;
    if (result instanceof Error) {
      unresolved.push({ entry, reason: result.message });
    } else {
      resolved.push({ entry, card: result });
    }
  }

  derivedTokens.forEach((card, index) => {
    if (derivedUsed.has(index)) return;
    resolved.push({
      entry: { kind: 'token', quantity: 1, name: card.name, line: 0 },
      card,
    });
  });

  return { resolved, unresolved };
}
