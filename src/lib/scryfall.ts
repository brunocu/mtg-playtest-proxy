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

export interface ScryfallCard {
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

  private async fetchCollection(names: string[]): Promise<ScryfallCollectionResponse> {
    const url = `${SCRYFALL_API}/cards/collection`;
    const res = await this.throttledFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: names.map((name) => ({ name })) }),
    });
    if (!res.ok) {
      const body = (await res.json()) as ScryfallErrorBody;
      throw new Error(body.details ?? `Card collection lookup failed (status ${res.status})`);
    }
    return (await res.json()) as ScryfallCollectionResponse;
  }

  private async fetchTokenOrEmblem(
    name: string,
    kind: 'token' | 'emblem',
  ): Promise<ScryfallCard> {
    const query = `type:${kind} !"${name}"`;
    const url = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}`;
    const res = await this.throttledFetch(url);
    if (!res.ok) {
      const body = (await res.json()) as ScryfallErrorBody;
      throw new Error(body.details ?? `No ${kind} found matching "${name}"`);
    }
    const body = (await res.json()) as { data: ScryfallCard[] };
    const card = body.data?.[0];
    if (!card) throw new Error(`No ${kind} found matching "${name}"`);
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
      const response = await this.fetchCollection(chunk.map(frontFaceName));

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
    const key = `${entry.kind}:${entry.name.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const card = await this.fetchTokenOrEmblem(entry.name, entry.kind as 'token' | 'emblem');
    this.cache.set(key, card);
    return card;
  }
}

/** Resolves every decklist entry, continuing past individual failures and reporting them. */
export async function resolveDecklist(
  entries: DecklistEntry[],
  client: ScryfallClient,
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

  const tokenEmblemResults = new Map<string, ScryfallCard | Error>();
  for (const entry of entries) {
    if (entry.kind === 'card') continue;
    const key = `${entry.kind}:${entry.name.toLowerCase()}`;
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
    } else {
      const key = `${entry.kind}:${entry.name.toLowerCase()}`;
      const result = tokenEmblemResults.get(key)!;
      if (result instanceof Error) {
        unresolved.push({ entry, reason: result.message });
      } else {
        resolved.push({ entry, card: result });
      }
    }
  }

  return { resolved, unresolved };
}
