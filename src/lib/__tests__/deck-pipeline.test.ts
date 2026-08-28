import { describe, expect, it } from 'vitest';
import { summarizePipelineErrors, expandByQuantity } from '../deck-pipeline';
import type { DecklistEntry } from '../decklist';
import type { ScryfallCard } from '../scryfall';

function card(name: string): ScryfallCard {
  return { name, type_line: 'Instant', color_identity: [], layout: 'normal' };
}

function entry(overrides: Partial<DecklistEntry> = {}): DecklistEntry {
  return { kind: 'card', quantity: 1, name: 'Lightning Bolt', line: 1, ...overrides };
}

describe('summarizePipelineErrors', () => {
  it('combines unparseable lines and unresolved entries into bad-line data, without dropping either', () => {
    const summary = summarizePipelineErrors(
      { entries: [], unparseableLines: [{ line: 2, text: '???not a card line' }] },
      {
        resolved: [],
        unresolved: [
          { entry: entry({ name: 'Not A Real Card', line: 4 }), reason: 'No matching card' },
        ],
      },
    );

    expect(summary.count).toBe(2);
    expect(summary.badLines).toEqual(new Set([2, 4]));
    expect(summary.reasons.get(2)).toBe('Could not parse line: "???not a card line"');
    expect(summary.reasons.get(4)).toBe('No matching card');
  });

  it('returns an empty summary when everything parsed and resolved', () => {
    const summary = summarizePipelineErrors(
      { entries: [entry()], unparseableLines: [] },
      { resolved: [{ entry: entry(), card: card('Lightning Bolt') }], unresolved: [] },
    );
    expect(summary.count).toBe(0);
    expect(summary.badLines.size).toBe(0);
    expect(summary.reasons.size).toBe(0);
  });
});

describe('expandByQuantity', () => {
  it('repeats an entry quantity times, preserving order', () => {
    const resolved = [
      { entry: entry({ name: 'Lightning Bolt', quantity: 3 }), card: card('Lightning Bolt') },
      { entry: entry({ name: 'Plains', quantity: 2 }), card: card('Plains') },
    ];
    const expanded = expandByQuantity(resolved);
    expect(expanded.map((e) => e.entry.name)).toEqual([
      'Lightning Bolt',
      'Lightning Bolt',
      'Lightning Bolt',
      'Plains',
      'Plains',
    ]);
  });

  it('drops an entry with quantity 0 entirely', () => {
    const resolved = [{ entry: entry({ quantity: 0 }), card: card('Lightning Bolt') }];
    expect(expandByQuantity(resolved)).toEqual([]);
  });
});
