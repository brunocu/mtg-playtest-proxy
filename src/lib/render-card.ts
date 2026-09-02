import { computeCardLayout, BASE_CARD_W, BASE_CARD_H, type CardLayout } from './card-layout';
import { fitMultiLine, fitOneLine, type MeasureWidth } from './text-fit';
import { tokenizeManaText, symbolGlyphs, splitRuns, registerCompoundGlyph, compoundGlyphPair } from './mana-symbols';
import { resolveBorderPaint, borderStrokeStyle } from './card-colors';
import { basicLandColor } from './basic-lands';
import { selectFaces, isIgnorableBasicLand, type FaceToRender, type RenderPlan } from './render-faces';
import type { DecklistEntry } from './decklist';
import type { ScryfallCard } from './scryfall';

export interface RenderOptions {
  /** Render mana symbols as Mana-font icons (true) or bracketed text like `{W}` (false). */
  useIconSymbols: boolean;
  /** Color card borders by mana identity instead of plain black. */
  coloredBorders: boolean;
  /** 1 = full size, 0.75 = small size (bwproxy SMALL_CARD_SIZE ratio). */
  scale: number;
  /** Render basic lands without the large mana symbol overlay. */
  fullArtBasicLands: boolean;
  /** Drop basic land entries from the render output entirely. */
  ignoreBasicLands: boolean;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  useIconSymbols: true,
  coloredBorders: false,
  scale: 1,
  fullArtBasicLands: false,
  ignoreBasicLands: false,
};

const TITLE_FONT_FAMILY = "'Roboto Slab', serif";
const BODY_FONT_FAMILY = "'Lora', serif";
const ICON_FONT_FAMILY = 'Mana';

// Mana font PUA codepoints for the front/back double-faced-card indicators (mana-font's
// ms-dfc-front/back and ms-dfc-modal-face/back glyphs — see design.md).
const DFC_GLYPH: Record<'transform' | 'modal', Record<'front' | 'back', string>> = {
  transform: { front: '', back: '' },
  modal: { front: '', back: '' },
};

let fontsLoaded: Promise<void> | null = null;

/**
 * Canvas text rendering does not itself trigger a webfont download the way DOM text does
 * (a bare `@font-face` import is not enough) — an unloaded font silently falls back to a
 * system font, and for the Mana icon font that means missing-glyph "tofu" boxes. Call this
 * once and await it before the first renderCardImages() call.
 */
export function ensureFontsLoaded(): Promise<void> {
  if (!fontsLoaded) {
    fontsLoaded = Promise.all([
      document.fonts.load(`16px ${ICON_FONT_FAMILY}`),
      document.fonts.load(`bold 16px 'Roboto Slab'`),
      document.fonts.load(`16px 'Lora'`),
      document.fonts.load(`italic 16px 'Lora'`),
    ])
      .then(() => document.fonts.ready)
      .then(() => undefined);
  }
  return fontsLoaded;
}

/**
 * Substitutes `{...}` symbol tokens with Mana glyph characters, leaving unmapped tokens as text.
 * A two-glyph resolution (hybrid, two-hybrid, or Phyrexian) is registered as a single compound
 * sentinel character rather than emitted as two adjacent glyphs, so it draws as one diagonal-
 * offset compound symbol instead of two full-size glyphs side by side (see design.md).
 */
function resolveManaText(text: string, useIcons: boolean): string {
  if (!text) return text;
  return tokenizeManaText(text)
    .map((part) => {
      if (part.type === 'text') return part.value;
      if (!useIcons) return part.value;
      const glyphs = symbolGlyphs(part.value);
      if (!glyphs) return part.value;
      if (glyphs.length === 2) return registerCompoundGlyph(glyphs[0], glyphs[1]);
      return glyphs.join('');
    })
    .join('');
}

function fontStack(family: string, useIcons: boolean): string {
  return useIcons ? `${ICON_FONT_FAMILY}, ${family}` : family;
}

function makeMeasurer(ctx: CanvasRenderingContext2D, family: string, bold = false): MeasureWidth {
  return (text, fontSize) => {
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${family}`;
    return ctx.measureText(text).width;
  };
}

/** A compound (hybrid/Phyrexian) glyph pair draws at one normal glyph's advance width. */
function compoundAdvanceWidth(ctx: CanvasRenderingContext2D, sentinel: string, fontSize: number): number {
  const pair = compoundGlyphPair(sentinel);
  ctx.font = `${fontSize}px ${ICON_FONT_FAMILY}`;
  return ctx.measureText(pair ? pair[0] : sentinel).width;
}

/**
 * Measures `text` run-by-run (icon glyphs / compound pairs / everything else), matching how
 * drawMixedText will actually paint it — see splitRuns for why this can't be a single
 * measureText() call against a combined font stack.
 */
function makeMixedMeasurer(
  ctx: CanvasRenderingContext2D,
  bodyFamily: string,
  bold = false,
): MeasureWidth {
  return (text, fontSize) => {
    let total = 0;
    for (const run of splitRuns(text)) {
      if (run.kind === 'compound') {
        for (const char of run.text) total += compoundAdvanceWidth(ctx, char, fontSize);
        continue;
      }
      ctx.font =
        run.kind === 'icon' ? `${fontSize}px ${ICON_FONT_FAMILY}` : `${bold ? 'bold ' : ''}${fontSize}px ${bodyFamily}`;
      total += ctx.measureText(run.text).width;
    }
    return total;
  };
}

/**
 * Draws one compound (hybrid/Phyrexian) sentinel as its two component glyphs at reduced size,
 * diagonally offset from each other, centered within one normal glyph's advance width — rather
 * than as two full-size glyphs side by side (see design.md).
 */
function drawCompoundGlyph(
  ctx: CanvasRenderingContext2D,
  sentinel: string,
  cursor: number,
  y: number,
  fontSize: number,
  baseline: CanvasTextBaseline,
): void {
  const pair = compoundGlyphPair(sentinel);
  if (!pair) return;
  const advance = compoundAdvanceWidth(ctx, sentinel, fontSize);
  const centerX = cursor + advance / 2;
  const centerY =
    baseline === 'middle' ? y : baseline === 'top' ? y + fontSize * 0.5 : y - fontSize * 0.35;
  const subSize = fontSize * 0.68;
  const offset = fontSize * 0.22;

  ctx.font = `${subSize}px ${ICON_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pair[0], centerX - offset, centerY - offset);
  ctx.fillText(pair[1], centerX + offset, centerY + offset);
}

/** Draws `text` run-by-run with an explicit font per run, at the given alignment/baseline. */
function drawMixedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  bodyFamily: string,
  options: { bold?: boolean; align?: 'left' | 'center' | 'right'; baseline?: CanvasTextBaseline } = {},
): number {
  const { bold = false, align = 'left', baseline = 'alphabetic' } = options;
  const runs = splitRuns(text);

  const runWidth = (run: { kind: string; text: string }): number => {
    if (run.kind === 'compound') {
      let w = 0;
      for (const char of run.text) w += compoundAdvanceWidth(ctx, char, fontSize);
      return w;
    }
    ctx.font =
      run.kind === 'icon' ? `${fontSize}px ${ICON_FONT_FAMILY}` : `${bold ? 'bold ' : ''}${fontSize}px ${bodyFamily}`;
    return ctx.measureText(run.text).width;
  };

  let totalWidth = 0;
  for (const run of runs) totalWidth += runWidth(run);

  let cursor = x;
  if (align === 'center') cursor = x - totalWidth / 2;
  else if (align === 'right') cursor = x - totalWidth;

  ctx.textAlign = 'left';
  ctx.textBaseline = baseline;
  for (const run of runs) {
    if (run.kind === 'compound') {
      for (const char of run.text) {
        drawCompoundGlyph(ctx, char, cursor, y, fontSize, baseline);
        cursor += compoundAdvanceWidth(ctx, char, fontSize);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = baseline;
      continue;
    }
    ctx.font =
      run.kind === 'icon' ? `${fontSize}px ${ICON_FONT_FAMILY}` : `${bold ? 'bold ' : ''}${fontSize}px ${bodyFamily}`;
    ctx.fillText(run.text, cursor, y);
    cursor += ctx.measureText(run.text).width;
  }

  return totalWidth;
}

/**
 * Renders one resolved decklist entry to canvases: one per face for single-faced cards and
 * transform/modal-DFC cards (always two, one per face, per the `proxy-card-rendering` spec),
 * or exactly one composited canvas for split/fuse/aftermath/flip/adventure layouts. Returns an
 * empty array when the entry is a basic land and ignoreBasicLands is enabled.
 */
export function renderCardImages(
  entry: DecklistEntry,
  card: ScryfallCard,
  options: RenderOptions = DEFAULT_RENDER_OPTIONS,
): HTMLCanvasElement[] {
  if (isIgnorableBasicLand(card, options.ignoreBasicLands)) return [];

  const plan = selectFaces(entry, card);
  return renderPlan(plan, options);
}

function renderPlan(plan: RenderPlan, options: RenderOptions): HTMLCanvasElement[] {
  switch (plan.kind) {
    case 'separate':
      return plan.faces.map((face) => renderFace(face, computeCardLayout(face.frameKind, options.scale), options));
    case 'split':
      return [renderSplitCard(plan.left, plan.right, plan.fuseText, options)];
    case 'aftermath':
      return [renderAftermathCard(plan.top, plan.bottom, options)];
    case 'flip':
      return [renderFlipCard(plan.front, plan.back, options)];
    case 'adventure':
      return [renderAdventureCard(plan.main, plan.secondary, options, plan.mirrored ?? false)];
  }
}

/** Shrinks the oracle-text box away from one or more edges, without moving the rules box's own
 * drawn boundary, to leave room for content an overlapping composite renderer draws separately. */
interface TextReserve {
  /** Leaves room below for an overlay drawn afterwards, e.g. a shared fuse-text bar. */
  bottom?: number;
  /** Leaves room to the left for an overlapping box, e.g. an adventure's secondary rules box. */
  left?: number;
  /** Leaves room to the right for an overlapping box, e.g. a prepare's mirrored secondary box. */
  right?: number;
}

/** Renders one face's full frame/title/type/text/PT content onto a canvas sized to `layout`. */
function renderFace(
  face: FaceToRender,
  layout: CardLayout,
  options: RenderOptions,
  textReserve?: TextReserve,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.cardW);
  canvas.height = Math.round(layout.cardH);
  const ctx = canvas.getContext('2d')!;
  drawFaceOnto(ctx, layout, face, options, textReserve);
  return canvas;
}

/**
 * Draws one face's full frame/title/type/text/PT content directly onto an existing context.
 * `textReserve` shrinks the oracle-text shrink-to-fit box (without moving the rules box's own
 * drawn boundary) to leave room for an overlay/overlap drawn separately — mirroring bwproxy's
 * SIZE.RULES_BOX_FUSE, which only affects text fitting, not frame geometry.
 */
function drawFaceOnto(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  face: FaceToRender,
  options: RenderOptions,
  textReserve?: TextReserve,
): string | CanvasGradient {
  const borderPaint = options.coloredBorders
    ? resolveBorderPaint(face.colorIdentity)
    : ({ type: 'solid', color: '#000000' } as const);
  const strokeStyle = borderStrokeStyle(ctx, borderPaint, 0, 0, layout.cardW, layout.cardH);

  drawFrame(ctx, layout, strokeStyle, face);
  drawTitleLine(ctx, layout, face, options);
  drawTypeLine(ctx, layout, face, options);
  if (face.frameKind !== 'land') {
    drawTextBox(ctx, layout, face, options, textReserve);
  } else if (!options.fullArtBasicLands) {
    drawBasicLandSymbol(ctx, layout, face);
  }
  if (hasStatBox(face)) {
    drawStatBox(ctx, layout, face, strokeStyle);
  }

  return strokeStyle;
}

/** Whether `face` has a power/toughness, loyalty, or defense value to show in a stat box. */
function hasStatBox(face: FaceToRender): boolean {
  return (face.power !== undefined && face.toughness !== undefined) || face.loyalty !== undefined || face.defense !== undefined;
}

function makeCanvas(width: number, height: number, scale: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, 5 * scale);
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function makeFinalCanvas(scale: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  return makeCanvas(BASE_CARD_W * scale, BASE_CARD_H * scale, scale);
}

/**
 * Draws `src` (a WxH canvas) rotated a quarter turn so it fills a (destW,destH) box at
 * (destX,destY) in the destination — where destW/destH are src's height/width swapped, i.e.
 * the box a 90-degree rotation of src produces.
 */
function drawRotatedQuarterTurn(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  clockwise: boolean,
): void {
  ctx.save();
  ctx.translate(destX + destW / 2, destY + destH / 2);
  ctx.rotate((clockwise ? 1 : -1) * (Math.PI / 2));
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  ctx.restore();
}

/** Draws `src` (a destW x destH canvas) rotated 180 degrees to fill the same box at (destX,destY). */
function drawRotatedHalfTurn(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
): void {
  ctx.save();
  ctx.translate(destX + destW, destY + destH);
  ctx.rotate(Math.PI);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
}

/**
 * Split/fuse cards: rendered as one landscape canvas — the shape the physical card actually
 * reads as once rotated 90 degrees — with both halves drawn upright, side by side, exactly as
 * they'd be read after that rotation. Fuse cards additionally get a shared fuse-text bar
 * spanning both halves, drawn across the bottom.
 */
function renderSplitCard(
  left: FaceToRender,
  right: FaceToRender,
  fuseText: string | undefined,
  options: RenderOptions,
): HTMLCanvasElement {
  const halfLayout = computeCardLayout(left.frameKind, options.scale);
  const { canvas, ctx } = makeCanvas(halfLayout.cardW * 2, halfLayout.cardH, options.scale);

  // Fuse cards reserve the bottom of each half's rules box (without moving its drawn boundary)
  // for the shared fuse-text bar, drawn on top afterwards — see drawFaceOnto's textReserve.
  const fuseBarHeight = 50 * options.scale;
  const textReserve: TextReserve | undefined = fuseText ? { bottom: fuseBarHeight } : undefined;

  ctx.save();
  drawFaceOnto(ctx, halfLayout, left, options, textReserve);
  ctx.restore();

  ctx.save();
  ctx.translate(halfLayout.cardW, 0);
  drawFaceOnto(ctx, halfLayout, right, options, textReserve);
  ctx.restore();

  if (fuseText) {
    const barTop = halfLayout.region.rulesBoxBottom - fuseBarHeight;
    drawFuseBar(ctx, canvas.width, barTop, fuseBarHeight, fuseText, options);
  }

  return canvas;
}

/** Draws the shared fuse-ability text bar spanning the full width, at `barTop`. */
function drawFuseBar(
  ctx: CanvasRenderingContext2D,
  cardW: number,
  barTop: number,
  barHeight: number,
  fuseText: string,
  options: RenderOptions,
): void {
  const border = 15 * options.scale;

  // Paint over the seam divider (each half's own frame border) where it crosses this row,
  // then draw one unbroken box spanning both halves.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, barTop, cardW, barHeight);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, 5 * options.scale);
  ctx.strokeRect(0, barTop, cardW, barHeight);

  const family = fontStack(BODY_FONT_FAMILY, false);
  const measure = options.useIconSymbols ? makeMixedMeasurer(ctx, BODY_FONT_FAMILY) : makeMeasurer(ctx, family);
  const resolved = resolveManaText(fuseText, options.useIconSymbols);
  const fontSize = fitOneLine(measure, resolved, cardW - 2 * border, 25 * options.scale);

  ctx.fillStyle = '#000000';
  drawMixedText(ctx, resolved, border, barTop + barHeight / 2, fontSize, BODY_FONT_FAMILY, {
    align: 'left',
    baseline: 'middle',
  });
}

/** Aftermath cards: top half upright, bottom half rotated 90 degrees like a split's half. */
function renderAftermathCard(top: FaceToRender, bottom: FaceToRender, options: RenderOptions): HTMLCanvasElement {
  const topLayout = computeCardLayout('aftermathTop', options.scale);
  const bottomLayout = computeCardLayout('aftermathBottom', options.scale);
  const bottomCanvas = renderFace(bottom, bottomLayout, options);

  const { canvas, ctx } = makeFinalCanvas(options.scale);
  drawFaceOnto(ctx, topLayout, top, options);
  drawRotatedQuarterTurn(ctx, bottomCanvas, 0, topLayout.cardH, canvas.width, canvas.height - topLayout.cardH, true);

  return canvas;
}

/** Flip cards: one face upright, the other rotated 180 degrees beneath it. */
function renderFlipCard(front: FaceToRender, back: FaceToRender, options: RenderOptions): HTMLCanvasElement {
  const halfLayout = computeCardLayout('flipHalf', options.scale);
  const backCanvas = renderFace(back, halfLayout, options);

  const { canvas, ctx } = makeFinalCanvas(options.scale);
  drawFaceOnto(ctx, halfLayout, front, options);
  drawRotatedHalfTurn(ctx, backCanvas, 0, halfLayout.cardH, canvas.width, canvas.height - halfLayout.cardH);

  return canvas;
}

/** Adventure cards: the creature's standard frame plus a compact secondary rules box below it. */
function renderAdventureCard(
  main: FaceToRender,
  secondary: FaceToRender,
  options: RenderOptions,
  mirrored: boolean,
): HTMLCanvasElement {
  const mainLayout = computeCardLayout('std', options.scale);
  const secondaryLayout = computeCardLayout('adventureSecondary', options.scale);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(mainLayout.cardW);
  canvas.height = Math.round(mainLayout.cardH);
  const ctx = canvas.getContext('2d')!;

  // The secondary box fully overlaps one side of the main rules box (same height) — the left by
  // default, or the right for a prepare card — so the main face's own oracle text is confined to
  // the free area on the other side.
  const strokeStyle = drawFaceOnto(
    ctx,
    mainLayout,
    main,
    options,
    mirrored ? { right: secondaryLayout.cardW } : { left: secondaryLayout.cardW },
  );

  const secondaryTop = mainLayout.region.rulesBoxTop;
  const secondaryLeft = mirrored ? mainLayout.cardW - secondaryLayout.cardW : 0;
  ctx.save();
  ctx.translate(secondaryLeft, secondaryTop);
  drawFaceOnto(ctx, secondaryLayout, secondary, options);
  ctx.restore();

  // The mirrored (prepare) secondary box sits in the same corner as the main face's stat box, so
  // re-draw the stat box on top once the secondary box has been composited.
  if (mirrored && hasStatBox(main)) {
    drawStatBox(ctx, mainLayout, main, strokeStyle);
  }

  return canvas;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  strokeStyle: string | CanvasGradient,
  face: FaceToRender,
): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, layout.cardW, layout.cardH);

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = Math.max(1, 5 * layout.scale);

  ctx.strokeRect(0, 0, layout.cardW, layout.cardH);

  const dividers = [
    layout.region.illustrationTop,
    layout.region.illustrationBottom,
    layout.region.typeLineBottom,
  ];
  if (face.frameKind !== 'land') dividers.push(layout.region.rulesBoxBottom);

  for (const y of dividers) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(layout.cardW, y);
    ctx.stroke();
  }
}

function drawTitleLine(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  face: FaceToRender,
  options: RenderOptions,
): void {
  const border = layout.border;
  const measure = options.useIconSymbols
    ? makeMixedMeasurer(ctx, TITLE_FONT_FAMILY, true)
    : makeMeasurer(ctx, TITLE_FONT_FAMILY, true);

  let nameRightEdge = layout.cardW - border;

  if (!face.isTokenOrEmblem && face.manaCost) {
    const manaText = resolveManaText(face.manaCost, options.useIconSymbols);
    const maxManaWidth = Math.max(layout.size.title * 4, layout.cardW * 0.5);
    const manaFontSize = fitOneLine(measure, manaText, maxManaWidth, layout.fonts.title);

    ctx.fillStyle = '#000000';
    const manaWidth = drawMixedText(
      ctx,
      manaText,
      layout.cardW - border,
      layout.region.titleTop + layout.size.title / 2,
      manaFontSize,
      TITLE_FONT_FAMILY,
      { bold: true, align: 'right', baseline: 'middle' },
    );

    nameRightEdge = layout.cardW - border - manaWidth - border;
  }

  let nameLeft = border;
  const titleMidY = layout.region.titleTop + layout.size.title / 2;

  if (face.dfcIndicator) {
    if (options.useIconSymbols) {
      const glyph = DFC_GLYPH[face.dfcIndicator.kind][face.dfcIndicator.position];
      ctx.font = `${layout.fonts.title}px ${ICON_FONT_FAMILY}`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, nameLeft, titleMidY);
      nameLeft += ctx.measureText(glyph).width + border;
    } else {
      const badge = `(${face.dfcIndicator.position})`;
      const badgeFontSize = layout.fonts.text;
      ctx.font = `${badgeFontSize}px ${fontStack(BODY_FONT_FAMILY, false)}`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge, nameLeft, titleMidY);
      nameLeft += ctx.measureText(badge).width + border;
    }
  }

  const nameFamily = fontStack(TITLE_FONT_FAMILY, false);
  const nameMeasure = makeMeasurer(ctx, nameFamily, true);
  const maxNameWidth = face.isTokenOrEmblem ? layout.cardW - 2 * border : nameRightEdge - nameLeft;
  const nameFontSize = fitOneLine(nameMeasure, face.displayName, maxNameWidth, layout.fonts.title);

  ctx.font = `bold ${nameFontSize}px ${nameFamily}`;
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';

  if (face.isTokenOrEmblem) {
    ctx.textAlign = 'center';
    ctx.fillText(face.displayName, layout.cardW / 2, layout.region.titleTop + layout.size.title / 2);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(face.displayName, nameLeft, layout.region.titleTop + layout.size.title / 2);
  }

  if (face.trueName) {
    const trueNameFontSize = layout.fonts.text;
    ctx.font = `bold ${trueNameFontSize}px ${nameFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(face.trueName, layout.cardW / 2, layout.region.illustrationTop + border);
  }
}

function drawTypeLine(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  face: FaceToRender,
  _options: RenderOptions,
): void {
  const border = layout.border;
  const family = fontStack(BODY_FONT_FAMILY, false);
  const measure = makeMeasurer(ctx, family);
  const maxWidth = layout.cardW - 2 * border;

  const fontSize = fitOneLine(measure, face.typeLine, maxWidth, layout.fonts.type);
  ctx.font = `${fontSize}px ${family}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(face.typeLine, border, layout.region.typeLineTop + layout.size.typeLine / 2);
}

function drawTextBox(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  face: FaceToRender,
  options: RenderOptions,
  textReserve?: TextReserve,
): void {
  if (!face.oracleText) return;

  const border = layout.border;
  const topGap = border * 2;
  const reservedLeft = textReserve?.left ?? 0;
  const reservedRight = textReserve?.right ?? 0;
  const reservedBottom = textReserve?.bottom ?? 0;
  const textLeft = border + reservedLeft;
  const maxWidth = layout.cardW - border - reservedRight - textLeft;
  const maxHeight = layout.size.rulesBox - border - topGap - reservedBottom;

  const measure = options.useIconSymbols
    ? makeMixedMeasurer(ctx, BODY_FONT_FAMILY)
    : makeMeasurer(ctx, BODY_FONT_FAMILY);

  const resolvedText = resolveManaText(face.oracleText, options.useIconSymbols);
  const { fontSize, paragraphs } = fitMultiLine(measure, resolvedText, maxWidth, maxHeight, layout.fonts.text);

  ctx.fillStyle = '#000000';

  const lineHeight = fontSize * 1.2;
  let y = layout.region.rulesBoxTop + topGap;
  paragraphs.forEach((lines, pIndex) => {
    for (const line of lines) {
      drawMixedText(ctx, line, textLeft, y, fontSize, BODY_FONT_FAMILY, { align: 'left', baseline: 'top' });
      y += lineHeight;
    }
    if (pIndex < paragraphs.length - 1) y += lineHeight;
  });
}

/**
 * Draws the single stat box shared by power/toughness, loyalty, and defense: an X/Y pair when
 * both power and toughness are present, otherwise a bare number for loyalty or defense.
 */
function drawStatBox(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  face: FaceToRender,
  strokeStyle: string | CanvasGradient,
): void {
  const { ptlBox } = layout;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ptlBox.left, ptlBox.top, ptlBox.right - ptlBox.left, ptlBox.bottom - ptlBox.top);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = Math.max(1, 5 * layout.scale);
  ctx.strokeRect(ptlBox.left, ptlBox.top, ptlBox.right - ptlBox.left, ptlBox.bottom - ptlBox.top);

  const text =
    face.power !== undefined && face.toughness !== undefined
      ? `${face.power}/${face.toughness}`
      : `${face.loyalty ?? face.defense}`;
  const family = fontStack(BODY_FONT_FAMILY, false);
  const measure = makeMeasurer(ctx, family);
  const maxWidth = ptlBox.right - ptlBox.left - 2 * layout.border;
  const fontSize = fitOneLine(measure, text, maxWidth, layout.fonts.title);

  ctx.font = `${fontSize}px ${family}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, ptlBox.centerX, ptlBox.centerY);
}

function drawBasicLandSymbol(ctx: CanvasRenderingContext2D, layout: CardLayout, face: FaceToRender): void {
  const color = basicLandColor(face.displayName);
  if (!color) return;

  const glyphs = symbolGlyphs(`{${color}}`);
  if (!glyphs) return;

  const size = layout.size.illustration * 0.7;
  ctx.font = `${size}px ${ICON_FONT_FAMILY}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    glyphs.join(''),
    layout.cardW / 2,
    (layout.region.illustrationTop + layout.region.illustrationBottom) / 2,
  );
}
