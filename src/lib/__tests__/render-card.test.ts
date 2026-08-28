import { describe, expect, it } from 'vitest';
import * as renderCard from '../render-card';

describe('render-card public API - no set/rarity/custom icon support', () => {
  it('exposes no option or export related to set icons, rarity icons, or custom icons', () => {
    const optionKeys = Object.keys(renderCard.DEFAULT_RENDER_OPTIONS);
    const exportNames = Object.keys(renderCard);
    const suspect = /icon(?!Symbols)|rarity|setIcon|customIcon/i;

    for (const key of [...optionKeys, ...exportNames]) {
      expect(key).not.toMatch(suspect);
    }
  });
});
