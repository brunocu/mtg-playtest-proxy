import { DPI } from './card-layout';

/**
 * Page-layout geometry for the print sheet: packs rendered card canvases (which can be portrait
 * std-shaped or landscape split/fuse-shaped, per render-card.ts) onto A4/US-Letter page(s) using
 * a shelf-packing algorithm — a plain uniform grid degenerates out of this for a same-size batch,
 * but it also handles a landscape split/fuse card mixed into an otherwise-portrait deck without
 * special-casing. Card canvases are always rendered at 300 DPI (card-layout.ts's DPI/BASE_CARD_*),
 * so px -> mm conversion is exact and needs no extra scale plumbing.
 */

export type PageFormat = 'a4' | 'letter';

export const PAGE_SIZE_MM: Record<PageFormat, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

/** Outer margin left on every page, clear of any card or crop mark. */
export const PAGE_MARGIN_MM = 5;

/** Default gap between adjacent cards; also where crop marks are drawn. */
export const DEFAULT_CARD_GAP_MM = 3;

export interface PrintSheetOptions {
  pageFormat: PageFormat;
  /** When true, cards are packed with zero gap between them (spec's "no-card-space" option). */
  noCardSpace: boolean;
}

export interface PlacedCard {
  canvas: HTMLCanvasElement;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
}

export interface PrintPage {
  cards: PlacedCard[];
}

/** A canvas's true physical size in mm, derived from its pixel dimensions at 300 DPI. */
export function canvasSizeMm(canvas: Pick<HTMLCanvasElement, 'width' | 'height'>): { wMm: number; hMm: number } {
  return {
    wMm: (canvas.width / DPI) * 25.4,
    hMm: (canvas.height / DPI) * 25.4,
  };
}

/**
 * Packs `canvases` onto as many pages as needed, filling each page before starting the next.
 * Uses shelf packing: cards are placed left-to-right, wrapping to a new row when a card would
 * overflow the page width, and starting a new page when a row would overflow the page height.
 */
export function layoutPages(
  canvases: HTMLCanvasElement[],
  options: PrintSheetOptions,
): PrintPage[] {
  const page = PAGE_SIZE_MM[options.pageFormat];
  const gap = options.noCardSpace ? 0 : DEFAULT_CARD_GAP_MM;
  const contentW = page.width - 2 * PAGE_MARGIN_MM;
  const contentH = page.height - 2 * PAGE_MARGIN_MM;

  const pages: PrintPage[] = [];
  let current: PlacedCard[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  const startNewPage = () => {
    if (current.length > 0) pages.push({ cards: current });
    current = [];
    cursorX = 0;
    cursorY = 0;
    rowHeight = 0;
  };

  for (const canvas of canvases) {
    const { wMm, hMm } = canvasSizeMm(canvas);

    if (cursorX > 0 && cursorX + wMm > contentW) {
      cursorX = 0;
      cursorY += rowHeight + gap;
      rowHeight = 0;
    }

    if (cursorY > 0 && cursorY + hMm > contentH) {
      startNewPage();
    }

    current.push({ canvas, xMm: PAGE_MARGIN_MM + cursorX, yMm: PAGE_MARGIN_MM + cursorY, wMm, hMm });
    cursorX += wMm + gap;
    rowHeight = Math.max(rowHeight, hMm);
  }

  if (current.length > 0) pages.push({ cards: current });
  return pages;
}
