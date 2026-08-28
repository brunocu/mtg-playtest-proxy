import { jsPDF } from 'jspdf';
import { layoutPages, PAGE_SIZE_MM, type PageFormat, type PlacedCard, type PrintPage } from './print-sheet';

export type { PageFormat };

export interface PrintPdfOptions {
  pageFormat: PageFormat;
  noCardSpace: boolean;
}

const CROP_MARK_LENGTH_MM = 4;
const CROP_MARK_INSET_MM = 1;

/** One crop-mark tick: a short line segment just outside one corner of a placed card. */
export interface CropMarkSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Computes the 8 crop-mark tick segments (2 per corner) for one placed card, in page mm. */
export function cropMarksForCard(card: PlacedCard): CropMarkSegment[] {
  const { xMm: x, yMm: y, wMm: w, hMm: h } = card;
  const inset = CROP_MARK_INSET_MM;
  const len = CROP_MARK_LENGTH_MM;
  const corners = [
    { cx: x, cy: y, dx: -1, dy: -1 },
    { cx: x + w, cy: y, dx: 1, dy: -1 },
    { cx: x, cy: y + h, dx: -1, dy: 1 },
    { cx: x + w, cy: y + h, dx: 1, dy: 1 },
  ];

  const segments: CropMarkSegment[] = [];
  for (const { cx, cy, dx, dy } of corners) {
    // Horizontal tick, offset outward from the corner along the card edge.
    segments.push({
      x1: cx + dx * inset,
      y1: cy + dy * inset,
      x2: cx + dx * (inset + len),
      y2: cy + dy * inset,
    });
    // Vertical tick, offset outward from the corner along the other card edge.
    segments.push({
      x1: cx + dx * inset,
      y1: cy + dy * inset,
      x2: cx + dx * inset,
      y2: cy + dy * (inset + len),
    });
  }
  return segments;
}

/** True when `seg` (an axis-aligned tick) overlaps `card`'s bounding box, e.g. because the mark's
 * reach exceeds a small/zero gap into a neighboring card. */
function segmentOverlapsCard(seg: CropMarkSegment, card: PlacedCard): boolean {
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

/**
 * Computes crop-mark ticks for every card on a page, dropping any tick that would land on or
 * inside a neighboring card — e.g. the shared edge between two abutting cards when the
 * no-card-space option removes the gap crop marks would otherwise sit in. Only ticks that fall in
 * genuinely open space (a page margin, or a gap wide enough for them) are kept, so cards packed
 * edge-to-edge only get crop marks at the outer boundary of the card block.
 */
export function cropMarksForPage(page: PrintPage): CropMarkSegment[] {
  const segments: CropMarkSegment[] = [];
  for (const card of page.cards) {
    const others = page.cards.filter((other) => other !== card);
    for (const seg of cropMarksForCard(card)) {
      if (!others.some((other) => segmentOverlapsCard(seg, other))) segments.push(seg);
    }
  }
  return segments;
}

/**
 * Split/fuse cards render as a landscape canvas (both halves upright, side by side — see
 * render-card.ts/design.md: this is the "already rotated to read" view). A real physical split
 * card, though, is cut to the same portrait card stock as every other card, with its content
 * sideways — so for the print sheet, a landscape input canvas is rotated 90 degrees clockwise
 * into a portrait canvas before layout/embedding, matching every other card's orientation and
 * true cut size. Portrait/square canvases pass through unchanged.
 */
function orientForPrintSheet(canvas: HTMLCanvasElement): HTMLCanvasElement {
  if (canvas.height >= canvas.width) return canvas;

  const rotated = document.createElement('canvas');
  rotated.width = canvas.height;
  rotated.height = canvas.width;
  const ctx = rotated.getContext('2d')!;
  ctx.translate(rotated.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(canvas, 0, 0);
  return rotated;
}

function drawPage(doc: jsPDF, page: PrintPage): void {
  for (const card of page.cards) {
    doc.addImage(card.canvas, 'PNG', card.xMm, card.yMm, card.wMm, card.hMm);
  }
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);
  for (const seg of cropMarksForPage(page)) {
    doc.line(seg.x1, seg.y1, seg.x2, seg.y2);
  }
}

/**
 * Creates a jsPDF document sized to `pageFormat`'s true mm dimensions with `pageCount` blank
 * pages. Split out from `buildPrintPdf` so page/document sizing (pure jsPDF document setup) is
 * unit-testable independent of `addImage`, which needs a real `HTMLCanvasElement` with actual
 * pixel data — unavailable in this project's headless test environment (see other render-*
 * modules: pixel-level output is verified manually via `npm run dev`, not by unit test).
 */
export function createDocumentForFormat(pageFormat: PageFormat, pageCount: number): jsPDF {
  const { width, height } = PAGE_SIZE_MM[pageFormat];
  const doc = new jsPDF({ unit: 'mm', format: [width, height] });
  for (let i = 1; i < pageCount; i++) doc.addPage([width, height]);
  return doc;
}

/**
 * Assembles rendered card canvases into a downloadable, print-accurate PDF: N-up per page (per
 * print-sheet.ts), each card embedded at its true physical size (in mm, derived from the canvas's
 * pixel size at 300 DPI — see canvasSizeMm), with crop marks around every card.
 */
export function buildPrintPdf(canvases: HTMLCanvasElement[], options: PrintPdfOptions): jsPDF {
  const oriented = canvases.map(orientForPrintSheet);
  const pages = layoutPages(oriented, { pageFormat: options.pageFormat, noCardSpace: options.noCardSpace });
  const doc = createDocumentForFormat(options.pageFormat, Math.max(pages.length, 1));

  pages.forEach((page, index) => {
    doc.setPage(index + 1);
    drawPage(doc, page);
  });

  return doc;
}
