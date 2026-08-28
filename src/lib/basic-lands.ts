// Ported from bwproxy's projectConstants.py BASIC_LANDS_NONSNOW / BASIC_LANDS.

const BASIC_LANDS_NONSNOW = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'];

export const BASIC_LANDS = [
  ...BASIC_LANDS_NONSNOW,
  ...BASIC_LANDS_NONSNOW.filter((l) => l !== 'Wastes').map((l) => `Snow-Covered ${l}`),
];

const BASIC_LAND_COLOR: Record<string, string> = {
  Plains: 'W',
  Island: 'U',
  Swamp: 'B',
  Mountain: 'R',
  Forest: 'G',
};

export function isBasicLand(name: string): boolean {
  return BASIC_LANDS.includes(name);
}

/** The mana color of a basic land's overlay symbol, or null for colorless Wastes. */
export function basicLandColor(name: string): string | null {
  const baseName = name.startsWith('Snow-Covered ') ? name.slice('Snow-Covered '.length) : name;
  return BASIC_LAND_COLOR[baseName] ?? null;
}
