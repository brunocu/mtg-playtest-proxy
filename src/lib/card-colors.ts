// Frame colors ported from bwproxy's projectConstants.py FRAME_COLORS.

export const FRAME_COLORS: Record<string, string> = {
  W: '#fcf4a3',
  U: '#127db4',
  B: '#692473',
  R: '#e13c32',
  G: '#0f7846',
  C: '#919799',
  M: '#d4af37',
  default: '#000000',
};

export type BorderPaint = { type: 'solid'; color: string } | { type: 'gradient'; colors: string[] };

/**
 * Resolves a card's border paint from its mana color identity: colorless/no-identity and
 * five-color both render as a flat color, one-to-four colors render as a gradient across
 * those colors (mirrors bwproxy's per-pixel color-interpolation border, using a canvas
 * gradient instead of pixel-by-pixel blending).
 */
export function resolveBorderPaint(colorIdentity: string[]): BorderPaint {
  if (colorIdentity.length === 0) return { type: 'solid', color: FRAME_COLORS.C };
  if (colorIdentity.length === 1) return { type: 'solid', color: FRAME_COLORS[colorIdentity[0]] };
  if (colorIdentity.length >= 5) return { type: 'solid', color: FRAME_COLORS.M };
  return { type: 'gradient', colors: colorIdentity.map((c) => FRAME_COLORS[c]) };
}

export function borderStrokeStyle(
  ctx: CanvasRenderingContext2D,
  paint: BorderPaint,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): string | CanvasGradient {
  if (paint.type === 'solid') return paint.color;
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  paint.colors.forEach((color, i) => {
    gradient.addColorStop(i / (paint.colors.length - 1), color);
  });
  return gradient;
}
