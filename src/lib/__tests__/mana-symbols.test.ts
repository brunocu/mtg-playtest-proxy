import { describe, expect, it } from 'vitest';
import {
  symbolGlyphs,
  tokenizeManaText,
  splitIconRuns,
  splitRuns,
  registerCompoundGlyph,
  compoundGlyphPair,
  ICON_GLYPH_CHARS,
} from '../mana-symbols';

describe('tokenizeManaText', () => {
  it('splits a mana cost into symbol tokens', () => {
    expect(tokenizeManaText('{2}{W}{U/B}')).toEqual([
      { type: 'symbol', value: '{2}' },
      { type: 'symbol', value: '{W}' },
      { type: 'symbol', value: '{U/B}' },
    ]);
  });

  it('preserves surrounding plain text runs in oracle text', () => {
    expect(tokenizeManaText('Tap: add {G}.')).toEqual([
      { type: 'text', value: 'Tap: add ' },
      { type: 'symbol', value: '{G}' },
      { type: 'text', value: '.' },
    ]);
  });
});

describe('symbolGlyphs', () => {
  it('resolves single-color symbols to one glyph', () => {
    expect(symbolGlyphs('{W}')).toHaveLength(1);
    expect(symbolGlyphs('{2}')).toHaveLength(1);
    expect(symbolGlyphs('{T}')).toHaveLength(1);
  });

  it('resolves hybrid symbols to two glyphs', () => {
    const glyphs = symbolGlyphs('{U/B}');
    expect(glyphs).toHaveLength(2);
    expect(glyphs?.[0]).not.toBe(glyphs?.[1]);
  });

  it('returns null for a token with no icon representation', () => {
    expect(symbolGlyphs('{NOTASYMBOL}')).toBeNull();
  });
});

describe('splitIconRuns', () => {
  it('keeps a plain-text string as a single non-icon run', () => {
    expect(splitIconRuns('Flying, vigilance.')).toEqual([{ isIcon: false, text: 'Flying, vigilance.' }]);
  });

  it('separates icon glyphs from surrounding text into distinct runs', () => {
    const [wGlyph] = symbolGlyphs('{W}')!;
    const text = `Tap: add ${wGlyph}.`;
    expect(splitIconRuns(text)).toEqual([
      { isIcon: false, text: 'Tap: add ' },
      { isIcon: true, text: wGlyph },
      { isIcon: false, text: '.' },
    ]);
  });

  it('groups adjacent icon glyphs (e.g. a resolved hybrid symbol) into one run', () => {
    const [g1, g2] = symbolGlyphs('{U/B}')!;
    expect(splitIconRuns(`${g1}${g2}`)).toEqual([{ isIcon: true, text: `${g1}${g2}` }]);
  });

  it('every resolvable glyph character is registered in ICON_GLYPH_CHARS', () => {
    const [glyph] = symbolGlyphs('{R}')!;
    expect(ICON_GLYPH_CHARS.has(glyph)).toBe(true);
    expect(ICON_GLYPH_CHARS.has('a')).toBe(false);
  });
});

describe('compound glyphs (hybrid/phyrexian diagonal-offset pairs)', () => {
  it('registers a hybrid pair and resolves it back to its two component glyphs', () => {
    const [w, u] = symbolGlyphs('{W/U}')!;
    const sentinel = registerCompoundGlyph(w, u);
    expect(compoundGlyphPair(sentinel)).toEqual([w, u]);
  });

  it('registers a Phyrexian pair and resolves it back to its two component glyphs', () => {
    const [g, p] = symbolGlyphs('{G/P}')!;
    const sentinel = registerCompoundGlyph(g, p);
    expect(compoundGlyphPair(sentinel)).toEqual([g, p]);
  });

  it('reuses the same sentinel character for the same pair', () => {
    const [w, u] = symbolGlyphs('{W/U}')!;
    expect(registerCompoundGlyph(w, u)).toBe(registerCompoundGlyph(w, u));
  });

  it('splitRuns puts a compound sentinel in its own "compound" run, distinct from plain icon runs', () => {
    const [w] = symbolGlyphs('{W}')!;
    const [g, p] = symbolGlyphs('{G/P}')!;
    const sentinel = registerCompoundGlyph(g, p);
    expect(splitRuns(`${w}${sentinel}text`)).toEqual([
      { kind: 'icon', text: w },
      { kind: 'compound', text: sentinel },
      { kind: 'text', text: 'text' },
    ]);
  });
});
