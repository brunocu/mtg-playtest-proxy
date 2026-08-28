import { describe, expect, it } from 'vitest';
import { computeCardLayout } from '../card-layout';

describe('computeCardLayout - std frame at full scale', () => {
  it('matches bwproxy STD_LAYOUT region boundaries', () => {
    const layout = computeCardLayout('std', 1);

    expect(layout.cardW).toBe(750);
    expect(layout.cardH).toBe(1050);
    expect(layout.region.titleTop).toBe(0);
    expect(layout.region.illustrationTop).toBe(90);
    expect(layout.region.illustrationBottom).toBe(460);
    expect(layout.region.typeLineTop).toBe(460);
    expect(layout.region.typeLineBottom).toBe(510);
    expect(layout.region.rulesBoxTop).toBe(510);
    expect(layout.region.rulesBoxBottom).toBe(1010);
    expect(layout.region.otherTop).toBe(1010);
    expect(layout.region.otherBottom).toBe(1050);
  });

  it('places the P/T box per bwproxy PTL_BOX_DIM/PTL_BOX_MARGIN', () => {
    const layout = computeCardLayout('std', 1);

    expect(layout.ptlBox.right).toBe(725);
    expect(layout.ptlBox.left).toBe(550);
    expect(layout.ptlBox.bottom).toBe(1045);
    expect(layout.ptlBox.top).toBe(975);
  });

  it('regions are contiguous with no gaps or overlaps', () => {
    const layout = computeCardLayout('std', 1);
    const { region } = layout;

    expect(region.illustrationTop).toBe(region.titleTop + layout.size.title);
    expect(region.typeLineTop).toBe(region.illustrationBottom);
    expect(region.rulesBoxTop).toBe(region.typeLineBottom);
    expect(region.otherTop).toBe(region.rulesBoxBottom);
    expect(region.otherBottom).toBe(layout.cardH);
  });
});

describe('computeCardLayout - small scale', () => {
  it('scales every dimension by 0.75 while preserving proportional layout', () => {
    const full = computeCardLayout('std', 1);
    const small = computeCardLayout('std', 0.75);

    expect(small.cardW).toBeCloseTo(full.cardW * 0.75);
    expect(small.cardH).toBeCloseTo(full.cardH * 0.75);
    expect(small.region.rulesBoxTop).toBeCloseTo(full.region.rulesBoxTop * 0.75);
    expect(small.ptlBox.left).toBeCloseTo(full.ptlBox.left * 0.75);
    expect(small.fonts.title).toBeCloseTo(full.fonts.title * 0.75);
  });
});

describe('computeCardLayout - token/emblem/land frames', () => {
  it('gives tokens a smaller rules box than emblems, and lands none', () => {
    const token = computeCardLayout('token', 1);
    const emblem = computeCardLayout('emblem', 1);
    const land = computeCardLayout('land', 1);

    expect(token.size.rulesBox).toBe(100);
    expect(emblem.size.rulesBox).toBe(250);
    expect(land.size.rulesBox).toBe(0);
    expect(land.region.rulesBoxTop).toBe(land.region.rulesBoxBottom);
  });
});

describe('computeCardLayout - composite multi-part sub-layouts', () => {
  it('sizes splitHalf as a mini portrait-card shape, placed upright side by side in a landscape final canvas', () => {
    const layout = computeCardLayout('splitHalf', 1);
    expect(layout.cardW).toBe(525);
    expect(layout.cardH).toBe(750);
  });

  it('sizes aftermathTop/aftermathBottom to compose into one full 750x1050 card', () => {
    const top = computeCardLayout('aftermathTop', 1);
    const bottom = computeCardLayout('aftermathBottom', 1);
    expect(top.cardW).toBe(750);
    expect(top.cardH).toBe(525);
    // bottom is rotated 90 degrees when composited, so its pre-rotation W/H swap to 750x525 too.
    expect(bottom.cardH).toBe(750);
    expect(bottom.cardW).toBe(525);
  });

  it('gives flipHalf the flip region ordering (illustration last, not right after title)', () => {
    const layout = computeCardLayout('flipHalf', 1);
    expect(layout.region.typeLineTop).toBe(layout.region.titleTop + layout.size.title);
    expect(layout.region.illustrationTop).toBeGreaterThan(layout.region.rulesBoxBottom);
    expect(layout.region.illustrationBottom).toBe(layout.cardH);
  });

  it('gives adventureSecondary no OTHER band, so the rules box runs to the very bottom', () => {
    const layout = computeCardLayout('adventureSecondary', 1);
    expect(layout.size.other).toBe(0);
    expect(layout.region.rulesBoxBottom).toBe(layout.cardH);
  });
});
