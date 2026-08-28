import { describe, expect, it, vi } from 'vitest';
import type { DecklistEntry } from '../decklist';
import { ScryfallClient, resolveDecklist, type FetchLike } from '../scryfall';

function cardEntry(name: string, line = 1): DecklistEntry {
  return { kind: 'card', quantity: 1, name, line };
}

function tokenEntry(name: string, line = 1): DecklistEntry {
  return { kind: 'token', quantity: 1, name, line };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function collectionCardBody(name: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name,
    type_line: 'Creature',
    color_identity: [],
    layout: 'normal',
    ...overrides,
  };
}

describe('ScryfallClient.lookupCards - batched exact-match lookup', () => {
  it('resolves known card names via POST /cards/collection', async () => {
    const fetchFn = vi.fn<FetchLike>(async (url, init) => {
      expect(url).toBe('https://api.scryfall.com/cards/collection');
      expect(init?.method).toBe('POST');
      const body = JSON.parse(init!.body!) as { identifiers: Array<{ name: string }> };
      expect(body.identifiers).toEqual([{ name: 'Lightning Bolt' }]);
      return jsonResponse(200, {
        data: [collectionCardBody('Lightning Bolt', { mana_cost: '{R}', type_line: 'Instant' })],
        not_found: [],
      });
    });
    const client = new ScryfallClient({ fetchFn });

    const { found, notFound } = await client.lookupCards(['Lightning Bolt']);

    expect(found.get('lightning bolt')?.name).toBe('Lightning Bolt');
    expect(found.get('lightning bolt')?.type_line).toBe('Instant');
    expect(notFound).toEqual([]);
  });

  it('splits more than 75 unique names into multiple chunked requests', async () => {
    const names = Array.from({ length: 130 }, (_, i) => `Card ${i}`);
    const requestSizes: number[] = [];
    const fetchFn = vi.fn<FetchLike>(async (_url, init) => {
      const body = JSON.parse(init!.body!) as { identifiers: Array<{ name: string }> };
      requestSizes.push(body.identifiers.length);
      return jsonResponse(200, {
        data: body.identifiers.map((id) => collectionCardBody(id.name)),
        not_found: [],
      });
    });
    const client = new ScryfallClient({ fetchFn });

    const { found } = await client.lookupCards(names);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(requestSizes).toEqual([75, 55]);
    expect(found.size).toBe(130);
  });

  it('handles 0 and 1 unique names without error', async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(200, { data: [], not_found: [] }));
    const client = new ScryfallClient({ fetchFn });

    const empty = await client.lookupCards([]);
    expect(empty.found.size).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();

    const fetchOne = vi.fn<FetchLike>(async () =>
      jsonResponse(200, { data: [collectionCardBody('Solo Card')], not_found: [] }),
    );
    const clientOne = new ScryfallClient({ fetchFn: fetchOne });
    const single = await clientOne.lookupCards(['Solo Card']);
    expect(single.found.size).toBe(1);
    expect(fetchOne).toHaveBeenCalledTimes(1);
  });

  it('handles exactly 75 unique names as a single request', async () => {
    const names = Array.from({ length: 75 }, (_, i) => `Card ${i}`);
    const fetchFn = vi.fn<FetchLike>(async (_url, init) => {
      const body = JSON.parse(init!.body!) as { identifiers: Array<{ name: string }> };
      return jsonResponse(200, {
        data: body.identifiers.map((id) => collectionCardBody(id.name)),
        not_found: [],
      });
    });
    const client = new ScryfallClient({ fetchFn });

    const { found } = await client.lookupCards(names);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(found.size).toBe(75);
  });

  it('correlates data/not_found positionally against the request order, interleaving found and not-found', async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(200, {
        // data skips over the position that landed in not_found; not_found preserves
        // its own relative request order alongside data's.
        data: [collectionCardBody('Grizzly Bears'), collectionCardBody('Runeclaw Bear')],
        not_found: [{ name: 'Not A Real Card' }],
      }),
    );
    const client = new ScryfallClient({ fetchFn });

    const { found, notFound } = await client.lookupCards([
      'Grizzly Bears',
      'Not A Real Card',
      'Runeclaw Bear',
    ]);

    expect(found.get('grizzly bears')?.name).toBe('Grizzly Bears');
    expect(found.get('runeclaw bear')?.name).toBe('Runeclaw Bear');
    expect(notFound).toEqual(['Not A Real Card']);
  });

  it('resolves an ordinary (non-two-faced) card entry via positional correlation', async () => {
    const fetchFn = vi.fn<FetchLike>(async (_url, init) => {
      const body = JSON.parse(init!.body!) as { identifiers: Array<{ name: string }> };
      expect(body.identifiers).toEqual([{ name: 'Lightning Bolt' }]);
      return jsonResponse(200, {
        data: [collectionCardBody('Lightning Bolt', { type_line: 'Instant' })],
        not_found: [],
      });
    });
    const client = new ScryfallClient({ fetchFn });

    const { found, notFound } = await client.lookupCards(['Lightning Bolt']);

    expect(found.get('lightning bolt')?.name).toBe('Lightning Bolt');
    expect(notFound).toEqual([]);
  });

  it('extracts the front-face substring as the outgoing identifier for a two-faced entry name', async () => {
    const fetchFn = vi.fn<FetchLike>(async (_url, init) => {
      const body = JSON.parse(init!.body!) as { identifiers: Array<{ name: string }> };
      expect(body.identifiers).toEqual([{ name: 'Esper Origins' }]);
      return jsonResponse(200, {
        data: [
          collectionCardBody('Esper Origins // Summon: Esper Maduin', {
            layout: 'transform',
            card_faces: [{ name: 'Esper Origins' }, { name: 'Summon: Esper Maduin' }],
          }),
        ],
        not_found: [],
      });
    });
    const client = new ScryfallClient({ fetchFn });

    const { found } = await client.lookupCards(['Esper Origins // Summon: Esper Maduin']);

    expect(found.get('esper origins // summon: esper maduin')?.name).toBe(
      'Esper Origins // Summon: Esper Maduin',
    );
  });

  it('resolves a transform card entered under its combined name or its front-face name alone', async () => {
    const fetchFn = vi.fn<FetchLike>(async (_url, init) => {
      const body = JSON.parse(init!.body!) as { identifiers: Array<{ name: string }> };
      return jsonResponse(200, {
        data: body.identifiers.map((id) =>
          collectionCardBody('Esper Origins // Summon: Esper Maduin', {
            layout: 'transform',
            card_faces: [{ name: 'Esper Origins' }, { name: id.name }],
          }),
        ),
        not_found: [],
      });
    });
    const combined = await new ScryfallClient({ fetchFn }).lookupCards([
      'Esper Origins // Summon: Esper Maduin',
    ]);
    expect(combined.found.get('esper origins // summon: esper maduin')?.name).toBe(
      'Esper Origins // Summon: Esper Maduin',
    );

    const frontOnly = await new ScryfallClient({ fetchFn }).lookupCards(['Esper Origins']);
    expect(frontOnly.found.get('esper origins')?.name).toBe(
      'Esper Origins // Summon: Esper Maduin',
    );
  });

  it('resolves a split card entered under its combined name or its front-face name alone', async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(200, {
        data: [
          collectionCardBody('Fire // Ice', {
            layout: 'split',
            card_faces: [{ name: 'Fire' }, { name: 'Ice' }],
          }),
        ],
        not_found: [],
      }),
    );
    const client = new ScryfallClient({ fetchFn });

    const combined = await client.lookupCards(['Fire // Ice']);
    expect(combined.found.get('fire // ice')?.name).toBe('Fire // Ice');

    const clientTwo = new ScryfallClient({ fetchFn });
    const frontOnly = await clientTwo.lookupCards(['Fire']);
    expect(frontOnly.found.get('fire')?.name).toBe('Fire // Ice');
  });

  it('resolves an adventure card entered under its combined name or its front-face name alone', async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(200, {
        data: [
          collectionCardBody('Brazen Borrower // Petty Theft', {
            layout: 'adventure',
            card_faces: [{ name: 'Brazen Borrower' }, { name: 'Petty Theft' }],
          }),
        ],
        not_found: [],
      }),
    );
    const client = new ScryfallClient({ fetchFn });

    const combined = await client.lookupCards(['Brazen Borrower // Petty Theft']);
    expect(combined.found.get('brazen borrower // petty theft')?.name).toBe(
      'Brazen Borrower // Petty Theft',
    );

    const clientTwo = new ScryfallClient({ fetchFn });
    const frontOnly = await clientTwo.lookupCards(['Brazen Borrower']);
    expect(frontOnly.found.get('brazen borrower')?.name).toBe('Brazen Borrower // Petty Theft');
  });
});

describe('resolveDecklist - unresolved reason for not_found entries', () => {
  it('synthesizes a human-readable reason with no server-provided message', async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(200, { data: [], not_found: [{ name: 'Not A Real Card' }] }),
    );
    const client = new ScryfallClient({ fetchFn });

    const { unresolved } = await resolveDecklist([cardEntry('Not A Real Card', 5)], client);

    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].reason).toMatch(/no exact match/i);
    expect(unresolved[0].reason).toContain('Not A Real Card');
    expect(unresolved[0].entry.line).toBe(5);
  });
});

describe('ScryfallClient.lookupTokenOrEmblem - token/emblem type-based search', () => {
  it('resolves a known token name via the search endpoint, throttled alongside collection requests', async () => {
    const fetchFn = vi.fn<FetchLike>(async (url) => {
      expect(url).toContain('/cards/search?q=');
      return jsonResponse(200, {
        data: [
          {
            name: 'Soldier',
            type_line: 'Token Creature — Soldier',
            color_identity: [],
            layout: 'token',
          },
        ],
      });
    });
    const client = new ScryfallClient({ fetchFn });

    const card = await client.lookupTokenOrEmblem(tokenEntry('Soldier'));

    expect(card.name).toBe('Soldier');
    expect(card.layout).toBe('token');
  });
});

describe('resolveDecklist - session cache dedup', () => {
  it('issues only one network request for repeated entries of the same card', async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(200, {
        data: [collectionCardBody('Counterspell', { type_line: 'Instant', color_identity: ['U'] })],
        not_found: [],
      }),
    );
    const client = new ScryfallClient({ fetchFn });

    const entries = [cardEntry('Counterspell'), cardEntry('Counterspell'), cardEntry('counterspell')];
    const { resolved } = await resolveDecklist(entries, client);

    expect(resolved).toHaveLength(3);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('issues only one network request for repeated token/emblem entries', async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(200, {
        data: [{ name: 'Soldier', type_line: 'Token Creature — Soldier', color_identity: [], layout: 'token' }],
      }),
    );
    const client = new ScryfallClient({ fetchFn });

    const entries = [tokenEntry('Soldier'), tokenEntry('Soldier'), tokenEntry('soldier')];
    const { resolved } = await resolveDecklist(entries, client);

    expect(resolved).toHaveLength(3);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('resolveDecklist - unresolved entries', () => {
  it('resolves all other entries and reports the one with no matching card', async () => {
    const fetchFn = vi.fn<FetchLike>(async (_url, init) => {
      const body = JSON.parse(init!.body!) as { identifiers: Array<{ name: string }> };
      const data = body.identifiers
        .filter((id) => id.name !== 'Not A Real Card')
        .map((id) => collectionCardBody(id.name));
      return jsonResponse(200, {
        data,
        not_found: body.identifiers
          .filter((id) => id.name === 'Not A Real Card')
          .map((id) => ({ name: id.name })),
      });
    });
    const client = new ScryfallClient({ fetchFn });

    const entries = [cardEntry('Grizzly Bears'), cardEntry('Not A Real Card'), cardEntry('Runeclaw Bear')];
    const { resolved, unresolved } = await resolveDecklist(entries, client);

    expect(resolved.map((r) => r.entry.name)).toEqual(['Grizzly Bears', 'Runeclaw Bear']);
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].entry.name).toBe('Not A Real Card');
  });

  it('preserves original decklist order across mixed cards, tokens, and unresolved entries', async () => {
    const fetchFn = vi.fn<FetchLike>(async (url, init) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(init.body!) as { identifiers: Array<{ name: string }> };
        return jsonResponse(200, {
          data: body.identifiers
            .filter((id) => id.name !== 'Typo Card')
            .map((id) => collectionCardBody(id.name)),
          not_found: body.identifiers
            .filter((id) => id.name === 'Typo Card')
            .map((id) => ({ name: id.name })),
        });
      }
      expect(url).toContain('/cards/search?q=');
      return jsonResponse(200, {
        data: [{ name: 'Soldier', type_line: 'Token Creature — Soldier', color_identity: [], layout: 'token' }],
      });
    });
    const client = new ScryfallClient({ fetchFn });

    const entries = [cardEntry('Grizzly Bears'), tokenEntry('Soldier'), cardEntry('Typo Card')];
    const { resolved, unresolved } = await resolveDecklist(entries, client);

    expect(resolved.map((r) => r.entry.name)).toEqual(['Grizzly Bears', 'Soldier']);
    expect(unresolved.map((u) => u.entry.name)).toEqual(['Typo Card']);
  });
});

describe('rate limiting - shared throttle across collection and search calls', () => {
  it('paces combined collection and search requests at no more than 2 per 1000ms window', async () => {
    const callTimestamps: number[] = [];
    const fetchFn = vi.fn<FetchLike>(async (_url, init) => {
      callTimestamps.push(Date.now());
      if (init?.method === 'POST') {
        const body = JSON.parse(init.body!) as { identifiers: Array<{ name: string }> };
        return jsonResponse(200, {
          data: body.identifiers.map((id) => collectionCardBody(id.name)),
          not_found: [],
        });
      }
      return jsonResponse(200, {
        data: [{ name: 'Soldier', type_line: 'Token', color_identity: [], layout: 'token' }],
      });
    });
    const client = new ScryfallClient({ fetchFn });

    // 3 chunked collection requests (>150 unique names) + 2 distinct token searches = 5 calls total.
    const names = Array.from({ length: 151 }, (_, i) => `Card ${i}`);
    await Promise.all([
      client.lookupCards(names),
      client.lookupTokenOrEmblem(tokenEntry('Soldier')),
      client.lookupTokenOrEmblem(tokenEntry('Spirit')),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(5);

    // Assert no more than 2 calls fired within any rolling 1000ms window.
    const sorted = [...callTimestamps].sort((a, b) => a - b);
    for (let i = 0; i + 2 < sorted.length; i++) {
      expect(sorted[i + 2] - sorted[i]).toBeGreaterThanOrEqual(999);
    }
  }, 10000);
});
