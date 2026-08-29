import { describe, expect, it } from 'vitest';
import { parseDecklist } from '../decklist';

describe('parseDecklist - quantity-prefixed card lines', () => {
  it('parses a bare card name as quantity 1', () => {
    const { entries } = parseDecklist('Lightning Bolt');
    expect(entries).toEqual([{ kind: 'card', quantity: 1, name: 'Lightning Bolt', line: 1 }]);
  });

  it('parses a numeric prefix', () => {
    const { entries } = parseDecklist('4 Lightning Bolt');
    expect(entries).toEqual([{ kind: 'card', quantity: 4, name: 'Lightning Bolt', line: 1 }]);
  });

  it('parses an "Nx" prefix', () => {
    const { entries } = parseDecklist('4x Lightning Bolt');
    expect(entries).toEqual([{ kind: 'card', quantity: 4, name: 'Lightning Bolt', line: 1 }]);
  });
});

describe('parseDecklist - flavor names', () => {
  it('retains both real name and flavor name', () => {
    const { entries } = parseDecklist('3x Kird Ape [Growling Ape]');
    expect(entries).toEqual([
      { kind: 'card', quantity: 3, name: 'Kird Ape', flavorName: 'Growling Ape', line: 1 },
    ]);
  });
});

describe('parseDecklist - token and emblem lines', () => {
  it('parses a token entry', () => {
    const { entries } = parseDecklist('(token) Soldier');
    expect(entries).toEqual([{ kind: 'token', quantity: 1, name: 'Soldier', line: 1 }]);
  });

  it('parses an emblem entry', () => {
    const { entries } = parseDecklist("(emblem) Elspeth, Sun's Champion");
    expect(entries).toEqual([
      { kind: 'emblem', quantity: 1, name: "Elspeth, Sun's Champion", line: 1 },
    ]);
  });

  it('parses a quantity-prefixed token entry', () => {
    const { entries } = parseDecklist('2x (token) Marit Lage');
    expect(entries).toEqual([{ kind: 'token', quantity: 2, name: 'Marit Lage', line: 1 }]);
  });
});

describe('parseDecklist - token hints', () => {
  it('parses a power/toughness and color hint', () => {
    const { entries } = parseDecklist('(token) 2/2 U Bird');
    expect(entries).toEqual([
      {
        kind: 'token',
        quantity: 1,
        name: 'Bird',
        line: 1,
        powerToughness: { power: '2', toughness: '2' },
        colors: ['U'],
      },
    ]);
  });

  it('parses an ability hint list', () => {
    const { entries } = parseDecklist('(token) Bird <flying, vigilance>');
    expect(entries).toEqual([
      { kind: 'token', quantity: 1, name: 'Bird', line: 1, abilityHints: ['flying', 'vigilance'] },
    ]);
  });

  it('parses quantity, stat, color, and ability hints together', () => {
    const { entries } = parseDecklist('2x (token) 2/2 U Bird <flying>');
    expect(entries).toEqual([
      {
        kind: 'token',
        quantity: 2,
        name: 'Bird',
        line: 1,
        powerToughness: { power: '2', toughness: '2' },
        colors: ['U'],
        abilityHints: ['flying'],
      },
    ]);
  });

  it('parses a token line with no hints', () => {
    const { entries } = parseDecklist('(token) Soldier');
    expect(entries).toEqual([{ kind: 'token', quantity: 1, name: 'Soldier', line: 1 }]);
  });

  it('does not treat a trailing bracket on a token line as a flavor name', () => {
    const { entries } = parseDecklist('(token) Bird [Big Bird]');
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Bird');
    expect(entries[0].flavorName).toBeUndefined();
  });

  it('leaves flavor names on card lines unaffected', () => {
    const { entries } = parseDecklist('3x Kird Ape [Growling Ape]');
    expect(entries).toEqual([
      { kind: 'card', quantity: 3, name: 'Kird Ape', flavorName: 'Growling Ape', line: 1 },
    ]);
  });
});

describe('parseDecklist - blank lines and unparseable lines', () => {
  it('skips blank lines between valid lines and produces no entry for them', () => {
    const { entries, unparseableLines } = parseDecklist('Lightning Bolt\n\nCounterspell');
    expect(entries).toEqual([
      { kind: 'card', quantity: 1, name: 'Lightning Bolt', line: 1 },
      { kind: 'card', quantity: 1, name: 'Counterspell', line: 3 },
    ]);
    expect(unparseableLines).toEqual([]);
  });

  it('reports an unparseable line and still parses the surrounding valid lines', () => {
    const { entries, unparseableLines } = parseDecklist(
      'Lightning Bolt\nKird Ape [Growling Ape\nCounterspell',
    );
    expect(entries).toEqual([
      { kind: 'card', quantity: 1, name: 'Lightning Bolt', line: 1 },
      { kind: 'card', quantity: 1, name: 'Counterspell', line: 3 },
    ]);
    expect(unparseableLines).toEqual([{ line: 2, text: 'Kird Ape [Growling Ape' }]);
  });

  it('keeps line numbers accurate when blank lines precede an unparseable line', () => {
    const { unparseableLines } = parseDecklist('\n\nKird Ape [Growling Ape');
    expect(unparseableLines).toEqual([{ line: 3, text: 'Kird Ape [Growling Ape' }]);
  });
});
