import { describe, expect, it } from 'vitest';
import { fitMultiLine, fitOneLine } from '../text-fit';

// A deterministic stand-in for CanvasRenderingContext2D.measureText: width scales
// linearly with character count and font size, like a monospace font would.
const monospaceWidth = (text: string, fontSize: number) => text.length * fontSize * 0.6;

describe('fitOneLine', () => {
  it('keeps the starting size when the text already fits', () => {
    const size = fitOneLine(monospaceWidth, 'Bolt', 1000, 40);
    expect(size).toBe(40);
  });

  it('shrinks the font size until the text fits maxWidth', () => {
    const text = 'A Very Long Card Name That Will Not Fit';
    const size = fitOneLine(monospaceWidth, text, 200, 40);
    expect(size).toBeLessThan(40);
    expect(monospaceWidth(text, size)).toBeLessThanOrEqual(200);
  });
});

describe('fitMultiLine', () => {
  it('wraps short oracle text at the starting size without shrinking', () => {
    const { fontSize, paragraphs } = fitMultiLine(monospaceWidth, 'Flying.', 400, 300, 40);
    expect(fontSize).toBe(40);
    expect(paragraphs).toEqual([['Flying.']]);
  });

  it('shrinks long oracle text so it remains within the text box bounds', () => {
    const longText =
      'When this creature enters the battlefield, draw a card for each land you control, then discard a card for each card you drew this way.\nFlying, vigilance, trample.';
    const maxWidth = 500;
    const maxHeight = 350;

    const { fontSize, paragraphs } = fitMultiLine(monospaceWidth, longText, maxWidth, maxHeight, 40);

    expect(fontSize).toBeLessThan(40);

    for (const lines of paragraphs) {
      for (const line of lines) {
        expect(monospaceWidth(line, fontSize)).toBeLessThanOrEqual(maxWidth);
      }
    }

    const totalLines = paragraphs.reduce((sum, lines) => sum + lines.length, 0) + (paragraphs.length - 1);
    expect(totalLines * fontSize * 1.2).toBeLessThanOrEqual(maxHeight + fontSize * 1.2);
  });

  it('splits paragraphs on newlines', () => {
    const { paragraphs } = fitMultiLine(monospaceWidth, 'Flying.\nVigilance.', 1000, 1000, 40);
    expect(paragraphs).toEqual([['Flying.'], ['Vigilance.']]);
  });
});
