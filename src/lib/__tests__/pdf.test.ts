import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { createDocumentForFormat, cropMarksForCard, cropMarksForPage } from '../pdf';
import { PAGE_SIZE_MM, type PlacedCard, type PrintPage } from '../print-sheet';

describe('jspdf import', () => {
  it('imports without error and constructs a document', () => {
    const doc = new jsPDF();
    expect(typeof doc.save).toBe('function');
    expect(typeof doc.addImage).toBe('function');
  });
});

function mockCanvas(width: number, height: number): HTMLCanvasElement {
  return { width, height } as unknown as HTMLCanvasElement;
}

describe('createDocumentForFormat: physical page/document sizing', () => {
  it('sizes an A4 document to true A4 mm dimensions', () => {
    const doc = createDocumentForFormat('a4', 1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(PAGE_SIZE_MM.a4.width, 3);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(PAGE_SIZE_MM.a4.height, 3);
  });

  it('sizes a US Letter document to true Letter mm dimensions', () => {
    const doc = createDocumentForFormat('letter', 1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(PAGE_SIZE_MM.letter.width, 3);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(PAGE_SIZE_MM.letter.height, 3);
  });

  it('adds one PDF page per print-sheet page for a decklist exceeding one page', () => {
    const doc = createDocumentForFormat('a4', 2);
    expect(doc.internal.pages.length - 1).toBe(2); // jsPDF's internal pages array is 1-indexed
  });
});

describe('cropMarksForCard: crop-mark geometry', () => {
  it('produces 8 tick segments (2 per corner) for one card', () => {
    const segments = cropMarksForCard({ canvas: mockCanvas(750, 1050), xMm: 10, yMm: 10, wMm: 63.5, hMm: 88.9 });
    expect(segments).toHaveLength(8);
  });

  it('places every tick outside the card bounds, near a corner', () => {
    const card = { canvas: mockCanvas(750, 1050), xMm: 10, yMm: 10, wMm: 63.5, hMm: 88.9 };
    const segments = cropMarksForCard(card);
    for (const seg of segments) {
      for (const [x, y] of [
        [seg.x1, seg.y1],
        [seg.x2, seg.y2],
      ]) {
        const insideX = x > card.xMm && x < card.xMm + card.wMm;
        const insideY = y > card.yMm && y < card.yMm + card.hMm;
        expect(insideX && insideY).toBe(false);
      }
    }
  });
});

function overlapsCard(seg: { x1: number; y1: number; x2: number; y2: number }, card: PlacedCard): boolean {
  const epsilon = 1e-6;
  const minX = Math.min(seg.x1, seg.x2);
  const maxX = Math.max(seg.x1, seg.x2);
  const minY = Math.min(seg.y1, seg.y2);
  const maxY = Math.max(seg.y1, seg.y2);
  return (
    minX < card.xMm + card.wMm - epsilon &&
    maxX > card.xMm + epsilon &&
    minY < card.yMm + card.hMm - epsilon &&
    maxY > card.yMm + epsilon
  );
}

describe('cropMarksForPage: no crop marks overlapping a neighboring card', () => {
  it('drops the shared-edge ticks between two cards packed with no gap (no-card-space)', () => {
    const cardA: PlacedCard = { canvas: mockCanvas(750, 1050), xMm: 10, yMm: 10, wMm: 63.5, hMm: 88.9 };
    const cardB: PlacedCard = { canvas: mockCanvas(750, 1050), xMm: 10 + 63.5, yMm: 10, wMm: 63.5, hMm: 88.9 };
    const page: PrintPage = { cards: [cardA, cardB] };

    const segments = cropMarksForPage(page);
    expect(segments.length).toBeGreaterThan(0);
    for (const seg of segments) {
      expect(overlapsCard(seg, cardA)).toBe(false);
      expect(overlapsCard(seg, cardB)).toBe(false);
    }
  });

  it('still marks the outer boundary of an edge-to-edge card block', () => {
    const cardA: PlacedCard = { canvas: mockCanvas(750, 1050), xMm: 10, yMm: 10, wMm: 63.5, hMm: 88.9 };
    const cardB: PlacedCard = { canvas: mockCanvas(750, 1050), xMm: 10 + 63.5, yMm: 10, wMm: 63.5, hMm: 88.9 };
    const page: PrintPage = { cards: [cardA, cardB] };

    const segments = cropMarksForPage(page);
    // The outer-left corner ticks of cardA (unshared edge) should still be present.
    const hasOuterLeftTick = segments.some(
      (seg) => seg.x1 <= cardA.xMm && seg.x2 <= cardA.xMm && seg.y1 === seg.y2,
    );
    expect(hasOuterLeftTick).toBe(true);
  });

  it('keeps all ticks when cards are spaced far enough apart to never overlap', () => {
    const cardA: PlacedCard = { canvas: mockCanvas(750, 1050), xMm: 10, yMm: 10, wMm: 63.5, hMm: 88.9 };
    const cardB: PlacedCard = { canvas: mockCanvas(750, 1050), xMm: 200, yMm: 200, wMm: 63.5, hMm: 88.9 };
    const page: PrintPage = { cards: [cardA, cardB] };

    const segments = cropMarksForPage(page);
    expect(segments).toHaveLength(cropMarksForCard(cardA).length + cropMarksForCard(cardB).length);
  });
});

