## Why

For prepare cards (adventure cards with the second rules box mirrored to the right), the creature's power/toughness stat box is drawn onto the main face before the secondary rules box is composited on top. Since the mirrored secondary box sits at the same bottom-right corner as the stat box, it paints over it, leaving the creature's power/toughness invisible on the rendered proxy.

## What Changes

- Fix `renderAdventureCard` in `src/lib/render-card.ts` so the main face's stat box (power/toughness, loyalty, or defense) is always visible above the secondary rules box, for both the default (left-mirrored) and prepare (right-mirrored) layouts.
- No change to non-mirrored adventure cards' visual output (their stat box already sits clear of the left-side secondary box).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `proxy-card-rendering`: the prepare-card rendering requirement is clarified so the main face's stat box remains visible (not obscured by the mirrored secondary rules box).

## Impact

- Affected code: `src/lib/render-card.ts` (`renderAdventureCard`, and possibly `drawFaceOnto`'s draw order).
- No API or data-model changes. Purely a rendering-order fix affecting prepare-card proxy output.
