import { describe, expect, it } from 'vitest';
import { FRAME_COLORS, resolveBorderPaint } from '../card-colors';

describe('resolveBorderPaint', () => {
  it('renders a solid color for a colorless card', () => {
    expect(resolveBorderPaint([])).toEqual({ type: 'solid', color: FRAME_COLORS.C });
  });

  it('renders a solid color for a mono-color card', () => {
    expect(resolveBorderPaint(['R'])).toEqual({ type: 'solid', color: FRAME_COLORS.R });
  });

  it('renders a gradient for a multicolor card', () => {
    const paint = resolveBorderPaint(['U', 'B']);
    expect(paint).toEqual({ type: 'gradient', colors: [FRAME_COLORS.U, FRAME_COLORS.B] });
  });

  it('renders the multicolor/gold treatment for a five-color card', () => {
    expect(resolveBorderPaint(['W', 'U', 'B', 'R', 'G'])).toEqual({
      type: 'solid',
      color: FRAME_COLORS.M,
    });
  });
});
