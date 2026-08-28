// Geometry ported from bwproxy's projectConstants.py (calcLayoutData, STD-shaped layouts).
// Base unit: pixels at 300 DPI, where a card is 2.5in x 3.5in -> 750 x 1050 px.

export const DPI = 300;
export const BASE_CARD_W = 750;
export const BASE_CARD_H = 1050;
export const SMALL_SCALE = 0.75;

const BASE = {
  titleSize: 90,
  typeLineSize: 50,
  otherSize: 40,
  ptlBoxW: 175,
  ptlBoxH: 70,
  ptlMarginX: 25,
  ptlMarginY: 5,
  border: 15,
  titleFont: 70,
  typeFont: 50,
  textFont: 40,
  otherFont: 25,
};

export const RULES_BOX_SIZE = {
  std: 500,
  token: 100,
  emblem: 250,
  land: 0,
} as const;

/**
 * Local sub-layout shapes for the composite multi-part frame kinds. Each is sized and drawn as
 * its own standalone canvas (origin at 0,0); the composite renderer in render-card.ts then
 * places that canvas onto the final composited canvas (rotated, for the kinds that need it).
 * `adventureMain` reuses the plain 'std' kind directly.
 *
 * `splitHalf`/`aftermathBottom` are ported directly from bwproxy's SPLIT_LAYOUT_LEFT/RIGHT: a
 * mini "portrait card" shape (525x750). Split/fuse cards place two of these UPRIGHT, side by
 * side, in a landscape final canvas (matching the physical card once rotated to read it — per
 * user confirmation, not bwproxy's own portrait-with-rotated-content output). Aftermath's bottom
 * face reuses the same mini-card shape but rotates it into a band at the bottom of a normal
 * portrait canvas, since only the top face needs to stay upright there. `aftermathTop`,
 * `flipHalf`, and `adventureSecondary` are ported directly from bwproxy's AFTERMATH_LAYOUT/
 * FLIP_LAYOUT/ADVENTURE_LAYOUT.
 */
const SUB_LAYOUTS = {
  splitHalf: { width: 525, height: 750, rulesBoxSize: 360, otherSize: 40, mode: 'normal' },
  aftermathTop: { width: 750, height: 525, rulesBoxSize: 175, otherSize: 40, mode: 'normal' },
  aftermathBottom: { width: 525, height: 750, rulesBoxSize: 360, otherSize: 40, mode: 'normal' },
  flipHalf: { width: 750, height: 525, rulesBoxSize: 200, otherSize: 40, mode: 'flip' },
  adventureSecondary: { width: 375, height: 500, rulesBoxSize: 360, otherSize: 0, mode: 'normal' },
} as const satisfies Record<string, SubLayoutParams>;

export type CardFrameKind = keyof typeof RULES_BOX_SIZE | keyof typeof SUB_LAYOUTS;

interface SubLayoutParams {
  width: number;
  height: number;
  rulesBoxSize: number;
  otherSize: number;
  mode: 'normal' | 'flip';
}

export interface CardLayout {
  scale: number;
  cardW: number;
  cardH: number;
  border: number;
  fonts: {
    title: number;
    type: number;
    text: number;
    other: number;
  };
  region: {
    left: number;
    right: number;
    titleTop: number;
    illustrationTop: number;
    illustrationBottom: number;
    typeLineTop: number;
    typeLineBottom: number;
    rulesBoxTop: number;
    rulesBoxBottom: number;
    otherTop: number;
    otherBottom: number;
  };
  size: {
    title: number;
    typeLine: number;
    rulesBox: number;
    other: number;
    illustration: number;
  };
  ptlBox: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
  };
}

export function computeCardLayout(frameKind: CardFrameKind, scale = 1): CardLayout {
  if (frameKind in RULES_BOX_SIZE) {
    return computeSubLayout(
      {
        width: BASE_CARD_W,
        height: BASE_CARD_H,
        rulesBoxSize: RULES_BOX_SIZE[frameKind as keyof typeof RULES_BOX_SIZE],
        otherSize: BASE.otherSize,
        mode: 'normal',
      },
      scale,
    );
  }
  return computeSubLayout(SUB_LAYOUTS[frameKind as keyof typeof SUB_LAYOUTS], scale);
}

function computeSubLayout(params: SubLayoutParams, scale: number): CardLayout {
  const s = (n: number) => n * scale;

  const cardW = s(params.width);
  const cardH = s(params.height);
  const titleSize = s(BASE.titleSize);
  const typeLineSize = s(BASE.typeLineSize);
  const otherSize = s(params.otherSize);
  const rulesBoxSize = s(params.rulesBoxSize);

  const left = 0;
  const right = cardW;
  const titleTop = 0;

  let illustrationTop: number;
  let illustrationBottom: number;
  let typeLineTop: number;
  let typeLineBottom: number;
  let rulesBoxTop: number;
  let rulesBoxBottom: number;
  let otherTop: number;
  const otherBottom = cardH;

  if (params.mode === 'flip') {
    // bwproxy's flip layout: TITLE, TYPE_LINE, RULES_BOX, OTHER, then ILLUSTRATION last,
    // occupying only the remaining space (the other flipped face fills the rest after rotation).
    typeLineTop = titleTop + titleSize;
    typeLineBottom = typeLineTop + typeLineSize;
    rulesBoxTop = typeLineBottom;
    rulesBoxBottom = rulesBoxTop + rulesBoxSize;
    otherTop = rulesBoxBottom;
    illustrationTop = otherTop + otherSize;
    illustrationBottom = cardH;
  } else {
    illustrationTop = titleTop + titleSize;
    otherTop = otherBottom - otherSize;
    rulesBoxBottom = otherTop;
    rulesBoxTop = rulesBoxBottom - rulesBoxSize;
    typeLineBottom = rulesBoxTop;
    typeLineTop = typeLineBottom - typeLineSize;
    illustrationBottom = typeLineTop;
  }

  const ptlBoxW = s(BASE.ptlBoxW);
  const ptlBoxH = s(BASE.ptlBoxH);
  const ptlBoxBottom = cardH - s(BASE.ptlMarginY);
  const ptlBoxTop = ptlBoxBottom - ptlBoxH;
  const ptlBoxRight = right - s(BASE.ptlMarginX);
  const ptlBoxLeft = ptlBoxRight - ptlBoxW;

  return {
    scale,
    cardW,
    cardH,
    border: s(BASE.border),
    fonts: {
      title: s(BASE.titleFont),
      type: s(BASE.typeFont),
      text: s(BASE.textFont),
      other: s(BASE.otherFont),
    },
    region: {
      left,
      right,
      titleTop,
      illustrationTop,
      illustrationBottom,
      typeLineTop,
      typeLineBottom,
      rulesBoxTop,
      rulesBoxBottom,
      otherTop,
      otherBottom,
    },
    size: {
      title: titleSize,
      typeLine: typeLineSize,
      rulesBox: rulesBoxSize,
      other: otherSize,
      illustration: illustrationBottom - illustrationTop,
    },
    ptlBox: {
      left: ptlBoxLeft,
      right: ptlBoxRight,
      top: ptlBoxTop,
      bottom: ptlBoxBottom,
      centerX: ptlBoxLeft + ptlBoxW / 2,
      centerY: ptlBoxTop + ptlBoxH / 2,
    },
  };
}
