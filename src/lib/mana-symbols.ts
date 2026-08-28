// Maps bracketed mana cost/oracle-text symbols (e.g. "{W}", "{2}", "{W/U}") to the
// Mana-font icon glyph codepoints (from mana-font's sass/_icons.scss). Compound symbols
// (hybrid, phyrexian) render as two adjacent single-color glyphs rather than reproducing
// mana-font's CSS-only two-layer "duo" overlay, which has no direct Canvas 2D equivalent.

const SINGLE_GLYPH: Record<string, string> = {
  W: '',
  U: '',
  B: '',
  R: '',
  G: '',
  C: '',
  S: '',
  X: '',
  Y: '',
  Z: '',
  T: '',
  Q: '',
  E: '',
  P: '',
  '0': '',
  '1': '',
  '2': '',
  '3': '',
  '4': '',
  '5': '',
  '6': '',
  '7': '',
  '8': '',
  '9': '',
  '10': '',
  '11': '',
  '12': '',
  '13': '',
  '14': '',
  '15': '',
  '16': '',
  '17': '',
  '18': '',
  '19': '',
  '20': '',
};

/** Every character the Mana icon font is ever asked to render (used to split mixed-font runs for drawing). */
export const ICON_GLYPH_CHARS = new Set(Object.values(SINGLE_GLYPH));

/**
 * Splits `text` into consecutive runs of icon-glyph characters vs. everything else.
 * Canvas `fillText` does not reliably fall back per-character across a mixed font stack
 * the way DOM text does (unlike `measureText`, which does compute correct advances via
 * fallback) — icon and non-icon runs must be drawn with an explicit font each.
 */
export function splitIconRuns(text: string): Array<{ isIcon: boolean; text: string }> {
  const runs: Array<{ isIcon: boolean; text: string }> = [];
  for (const char of text) {
    const isIcon = ICON_GLYPH_CHARS.has(char);
    const last = runs[runs.length - 1];
    if (last && last.isIcon === isIcon) {
      last.text += char;
    } else {
      runs.push({ isIcon, text: char });
    }
  }
  return runs;
}

// Compound (hybrid / two-hybrid / Phyrexian) symbols are rendered in icon mode as a single
// diagonal-offset glyph pair rather than two full-size glyphs side by side (see design.md).
// Each unique glyph pair is assigned one synthetic sentinel character outside both the Mana
// font's PUA range and any real Unicode text, so the existing string-based measure/fit/draw
// pipeline (built around plain characters) can carry the "this is one compound symbol" fact
// through unchanged, with the sentinel expanded back into its two component glyphs at draw time.
const COMPOUND_GLYPH = new Map<string, [string, string]>();
const COMPOUND_KEY_TO_SENTINEL = new Map<string, string>();
let nextCompoundCodepoint = 0xf100;

/** Registers (if needed) and returns the single sentinel character standing in for `[g1, g2]`. */
export function registerCompoundGlyph(g1: string, g2: string): string {
  const key = `${g1}|${g2}`;
  const existing = COMPOUND_KEY_TO_SENTINEL.get(key);
  if (existing) return existing;
  const sentinel = String.fromCodePoint(nextCompoundCodepoint++);
  COMPOUND_GLYPH.set(sentinel, [g1, g2]);
  COMPOUND_KEY_TO_SENTINEL.set(key, sentinel);
  return sentinel;
}

/** Returns the two component glyphs for a compound sentinel character, or undefined. */
export function compoundGlyphPair(char: string): [string, string] | undefined {
  return COMPOUND_GLYPH.get(char);
}

export type RunKind = 'text' | 'icon' | 'compound';

/**
 * Splits `text` into consecutive runs of plain text, single icon glyphs, and compound
 * (diagonal-offset pair) sentinel glyphs — the three ways drawMixedText/measureMixedText
 * need to treat a run differently.
 */
export function splitRuns(text: string): Array<{ kind: RunKind; text: string }> {
  const runs: Array<{ kind: RunKind; text: string }> = [];
  for (const char of text) {
    const kind: RunKind = COMPOUND_GLYPH.has(char) ? 'compound' : ICON_GLYPH_CHARS.has(char) ? 'icon' : 'text';
    const last = runs[runs.length - 1];
    if (last && last.kind === kind) {
      last.text += char;
    } else {
      runs.push({ kind, text: char });
    }
  }
  return runs;
}

const MANA_TOKEN_RE = /\{[^{}]+\}/g;

/** Splits a mana cost / oracle-text string into `{...}` symbol tokens and plain-text runs. */
export function tokenizeManaText(text: string): Array<{ type: 'symbol' | 'text'; value: string }> {
  const parts: Array<{ type: 'symbol' | 'text'; value: string }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(MANA_TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    parts.push({ type: 'symbol', value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts;
}

/**
 * Resolves a single `{...}` symbol token to one or more icon glyph characters to draw
 * side by side, or `null` if the token has no icon representation (caller should fall
 * back to rendering the bracketed text for it).
 */
export function symbolGlyphs(token: string): string[] | null {
  const inner = token.replace(/^\{|\}$/g, '').toUpperCase();

  const direct = SINGLE_GLYPH[inner];
  if (direct) return [direct];

  if (inner.includes('/')) {
    const parts = inner.split('/');
    const glyphs = parts.map((p) => SINGLE_GLYPH[p]);
    if (glyphs.every((g): g is string => Boolean(g))) return glyphs;
  }

  return null;
}
