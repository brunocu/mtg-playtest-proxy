import type { DecklistEntry, EntryKind } from './decklist';
import { isBasicLand } from './basic-lands';
import type { ScryfallCard, ScryfallCardFace } from './scryfall';
import type { CardFrameKind } from './card-layout';

export interface DfcIndicator {
  kind: 'transform' | 'modal';
  position: 'front' | 'back';
}

export interface FaceToRender {
  /** Name shown in the title bar (the flavor name, if the entry specified one). */
  displayName: string;
  /** The card's real name, shown above the illustration area when a flavor name is in use. */
  trueName?: string;
  manaCost?: string;
  typeLine: string;
  oracleText: string;
  power?: string;
  toughness?: string;
  /** Planeswalker loyalty; rendered as a bare number in the same stat box as power/toughness. */
  loyalty?: string;
  /** Battle defense; rendered as a bare number in the same stat box as power/toughness. */
  defense?: string;
  colorIdentity: string[];
  frameKind: CardFrameKind;
  isTokenOrEmblem: boolean;
  isBasicLandFace: boolean;
  /** Transform/modal-DFC front/back badge; unset for every other layout (including reversible). */
  dfcIndicator?: DfcIndicator;
}

/**
 * Describes how many canvases a resolved entry renders to and what goes on each.
 * `separate`: one canvas per face (single-faced cards, and transform/modal-DFC/reversible's two
 * faces). The other variants each produce exactly one composited canvas from two source faces.
 * `adventure`'s secondary box sits on the left by default, or the right when `mirrored` (prepare).
 */
export type RenderPlan =
  | { kind: 'separate'; faces: FaceToRender[] }
  | { kind: 'split'; left: FaceToRender; right: FaceToRender; fuseText?: string }
  | { kind: 'aftermath'; top: FaceToRender; bottom: FaceToRender }
  | { kind: 'flip'; front: FaceToRender; back: FaceToRender }
  | { kind: 'adventure'; main: FaceToRender; secondary: FaceToRender; mirrored?: boolean };

/** Mirrors bwproxy's getLayoutInfoAndRotation frame-kind selection. */
export function selectFrameKind(name: string, entryKind: EntryKind, oracleText: string): CardFrameKind {
  if (isBasicLand(name)) return 'land';
  if (entryKind === 'token' && !oracleText) return 'token';
  if (entryKind === 'token' || entryKind === 'emblem') return 'emblem';
  return 'std';
}

interface FaceSource {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
}

function toFace(
  source: FaceSource,
  card: ScryfallCard,
  entry: DecklistEntry,
  overrides: { frameKind?: CardFrameKind; dfcIndicator?: DfcIndicator; oracleText?: string } = {},
): FaceToRender {
  const typeLine = source.type_line ?? card.type_line;
  const oracleText = overrides.oracleText ?? source.oracle_text ?? '';
  const frameKind = overrides.frameKind ?? selectFrameKind(source.name, entry.kind, oracleText);
  const usesFlavorName = source.name === card.name && Boolean(entry.flavorName);

  return {
    displayName: usesFlavorName ? entry.flavorName! : source.name,
    trueName: usesFlavorName ? source.name : undefined,
    manaCost: source.mana_cost,
    typeLine,
    oracleText,
    power: source.power,
    toughness: source.toughness,
    loyalty: source.loyalty,
    defense: source.defense,
    colorIdentity: card.color_identity ?? [],
    frameKind,
    isTokenOrEmblem: entry.kind !== 'card',
    isBasicLandFace: frameKind === 'land',
    dfcIndicator: overrides.dfcIndicator,
  };
}

/** True when the last non-empty line of `oracleText` is a Fuse ability line ("Fuse (...)"). */
function detectFuseText(oracleText: string | undefined): string | undefined {
  const lines = (oracleText ?? '').split('\n').filter((line) => line.length > 0);
  const lastLine = lines[lines.length - 1];
  if (lastLine && lastLine.trim().split(' ')[0] === 'Fuse') return lastLine;
  return undefined;
}

function stripFuseText(oracleText: string | undefined, fuseText: string): string {
  return (oracleText ?? '').replace(`\n${fuseText}`, '').replace(fuseText, '').trim();
}

/**
 * Selects the render plan for a resolved card: which face(s) to draw and how they compose into
 * one or more canvases. Driven entirely by Scryfall's `layout` field (plus a Fuse-text sniff,
 * since Scryfall reports fuse cards under the plain "split" layout) — see design.md.
 */
export function selectFaces(entry: DecklistEntry, card: ScryfallCard): RenderPlan {
  const faces: ScryfallCardFace[] | undefined = card.card_faces;

  if (!faces || faces.length !== 2) {
    return { kind: 'separate', faces: [toFace(card, card, entry)] };
  }

  switch (card.layout) {
    case 'transform':
    case 'modal_dfc': {
      const dfcKind = card.layout === 'transform' ? 'transform' : 'modal';
      return {
        kind: 'separate',
        faces: [
          toFace(faces[0], card, entry, { dfcIndicator: { kind: dfcKind, position: 'front' } }),
          toFace(faces[1], card, entry, { dfcIndicator: { kind: dfcKind, position: 'back' } }),
        ],
      };
    }
    case 'reversible_card':
      // Physically two-sided like transform/modal-DFC, so it joins the same "always two
      // canvases" bucket — but it isn't a front/back or modal mechanic, so no DFC indicator.
      return {
        kind: 'separate',
        faces: [toFace(faces[0], card, entry), toFace(faces[1], card, entry)],
      };
    case 'split': {
      const fuseText = detectFuseText(faces[1].oracle_text);
      const left = toFace(faces[0], card, entry, {
        frameKind: 'splitHalf',
        oracleText: fuseText ? stripFuseText(faces[0].oracle_text, fuseText) : undefined,
      });
      const right = toFace(faces[1], card, entry, {
        frameKind: 'splitHalf',
        oracleText: fuseText ? stripFuseText(faces[1].oracle_text, fuseText) : undefined,
      });
      return { kind: 'split', left, right, fuseText };
    }
    case 'aftermath':
      return {
        kind: 'aftermath',
        top: toFace(faces[0], card, entry, { frameKind: 'aftermathTop' }),
        bottom: toFace(faces[1], card, entry, { frameKind: 'aftermathBottom' }),
      };
    case 'flip':
      return {
        kind: 'flip',
        front: toFace(faces[0], card, entry, { frameKind: 'flipHalf' }),
        back: toFace(faces[1], card, entry, { frameKind: 'flipHalf' }),
      };
    case 'adventure':
      return {
        kind: 'adventure',
        main: toFace(faces[0], card, entry, { frameKind: 'std' }),
        secondary: toFace(faces[1], card, entry, { frameKind: 'adventureSecondary' }),
      };
    case 'prepare':
      // Structurally identical to adventure, mirrored: the secondary box sits on the right.
      return {
        kind: 'adventure',
        main: toFace(faces[0], card, entry, { frameKind: 'std' }),
        secondary: toFace(faces[1], card, entry, { frameKind: 'adventureSecondary' }),
        mirrored: true,
      };
    default:
      return { kind: 'separate', faces: [toFace(card, card, entry)] };
  }
}

/** True when a resolved card should be dropped entirely under the ignore-basic-lands option. */
export function isIgnorableBasicLand(card: ScryfallCard, ignoreBasicLands: boolean): boolean {
  return ignoreBasicLands && isBasicLand(card.name);
}
