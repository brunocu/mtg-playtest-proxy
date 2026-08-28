import { describe, expect, it } from 'vitest';
import { layoutPages, canvasSizeMm, PAGE_SIZE_MM } from '../print-sheet';

function mockCanvas(width: number, height: number): HTMLCanvasElement {
  return { width, height } as unknown as HTMLCanvasElement;
}

const STD_CARD = mockCanvas(750, 1050); // full-scale std card at 300 DPI: 63.5mm x 88.9mm

describe('canvasSizeMm', () => {
  it('converts a full-scale std card to true physical mm', () => {
    const { wMm, hMm } = canvasSizeMm(STD_CARD);
    expect(wMm).toBeCloseTo(63.5, 1);
    expect(hMm).toBeCloseTo(88.9, 1);
  });

  it('converts a landscape split-card canvas proportionally', () => {
    const { wMm, hMm } = canvasSizeMm(mockCanvas(1050, 750));
    expect(wMm).toBeCloseTo(88.9, 1);
    expect(hMm).toBeCloseTo(63.5, 1);
  });
});

describe('layoutPages: N-up grid per page format', () => {
  it('fits a 3x3 grid of std cards on one A4 page', () => {
    const cards = Array.from({ length: 9 }, () => STD_CARD);
    const pages = layoutPages(cards, { pageFormat: 'a4', noCardSpace: false });
    expect(pages).toHaveLength(1);
    expect(pages[0].cards).toHaveLength(9);
  });

  it('overflows a 10th std card onto a second A4 page', () => {
    const cards = Array.from({ length: 10 }, () => STD_CARD);
    const pages = layoutPages(cards, { pageFormat: 'a4', noCardSpace: false });
    expect(pages).toHaveLength(2);
    expect(pages[0].cards).toHaveLength(9);
    expect(pages[1].cards).toHaveLength(1);
  });

  it('fits fewer std cards per US Letter page than A4 (shorter page height)', () => {
    const cards = Array.from({ length: 9 }, () => STD_CARD);
    const pages = layoutPages(cards, { pageFormat: 'letter', noCardSpace: false });
    expect(pages).toHaveLength(2);
    expect(pages[0].cards).toHaveLength(6);
    expect(pages[1].cards).toHaveLength(3);
  });

  it('uses the correct page dimensions per format', () => {
    expect(PAGE_SIZE_MM.a4).toEqual({ width: 210, height: 297 });
    expect(PAGE_SIZE_MM.letter).toEqual({ width: 215.9, height: 279.4 });
  });
});

describe('layoutPages: multi-page pagination fills each page before starting the next', () => {
  it('fully fills every page except the last for a large decklist', () => {
    const cards = Array.from({ length: 23 }, () => STD_CARD);
    const pages = layoutPages(cards, { pageFormat: 'a4', noCardSpace: false });
    expect(pages).toHaveLength(3);
    expect(pages[0].cards).toHaveLength(9);
    expect(pages[1].cards).toHaveLength(9);
    expect(pages[2].cards).toHaveLength(5);
  });
});

describe('layoutPages: configurable spacing', () => {
  it('leaves a nonzero gap between adjacent cards by default', () => {
    const pages = layoutPages([STD_CARD, STD_CARD], { pageFormat: 'a4', noCardSpace: false });
    const [first, second] = pages[0].cards;
    expect(second.xMm - (first.xMm + first.wMm)).toBeCloseTo(3, 5);
  });

  it('removes the gap between adjacent cards when noCardSpace is enabled', () => {
    const pages = layoutPages([STD_CARD, STD_CARD], { pageFormat: 'a4', noCardSpace: true });
    const [first, second] = pages[0].cards;
    expect(second.xMm - (first.xMm + first.wMm)).toBeCloseTo(0, 5);
  });

  it('fits more cards per page with no-card-space enabled than with default spacing', () => {
    const cards = Array.from({ length: 12 }, () => STD_CARD);
    const spaced = layoutPages(cards, { pageFormat: 'a4', noCardSpace: false });
    const tight = layoutPages(cards, { pageFormat: 'a4', noCardSpace: true });
    expect(tight[0].cards.length).toBeGreaterThanOrEqual(spaced[0].cards.length);
  });
});

describe('layoutPages: mixed card sizes (e.g. a landscape split/fuse card in the batch)', () => {
  it('packs a landscape card among portrait cards without overlap', () => {
    const cards = [STD_CARD, mockCanvas(1050, 750), STD_CARD];
    const pages = layoutPages(cards, { pageFormat: 'a4', noCardSpace: false });
    const placed = pages.flatMap((p) => p.cards);
    expect(placed).toHaveLength(3);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const overlapsX = a.xMm < b.xMm + b.wMm && b.xMm < a.xMm + a.wMm;
        const overlapsY = a.yMm < b.yMm + b.hMm && b.yMm < a.yMm + a.hMm;
        expect(overlapsX && overlapsY).toBe(false);
      }
    }
  });
});
