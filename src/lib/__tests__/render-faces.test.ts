import { describe, expect, it } from 'vitest';
import type { DecklistEntry } from '../decklist';
import type { ScryfallCard } from '../scryfall';
import { isIgnorableBasicLand, selectFaces, selectFrameKind } from '../render-faces';

function cardEntry(overrides: Partial<DecklistEntry> = {}): DecklistEntry {
  return { kind: 'card', quantity: 1, name: 'Grizzly Bears', line: 1, ...overrides };
}

describe('selectFrameKind', () => {
  it('selects the land frame for a basic land', () => {
    expect(selectFrameKind('Plains', 'card', '')).toBe('land');
  });

  it('selects the token frame for a textless token', () => {
    expect(selectFrameKind('Soldier', 'token', '')).toBe('token');
  });

  it('selects the emblem frame for a token with oracle text', () => {
    expect(selectFrameKind('Zombie', 'token', 'Whenever this creature attacks...')).toBe('emblem');
  });

  it('selects the emblem frame for an emblem', () => {
    expect(selectFrameKind("Elspeth, Sun's Champion", 'emblem', 'You get an emblem...')).toBe(
      'emblem',
    );
  });

  it('selects the standard frame for a regular card', () => {
    expect(selectFrameKind('Lightning Bolt', 'card', 'Deal 3 damage.')).toBe('std');
  });
});

describe('selectFaces - single-faced cards', () => {
  it('produces exactly one face', () => {
    const card: ScryfallCard = {
      name: 'Grizzly Bears',
      mana_cost: '{1}{G}',
      type_line: 'Creature — Bear',
      oracle_text: '',
      power: '2',
      toughness: '2',
      color_identity: ['G'],
      layout: 'normal',
    };
    const plan = selectFaces(cardEntry(), card);
    expect(plan.kind).toBe('separate');
    if (plan.kind !== 'separate') throw new Error('expected separate plan');
    expect(plan.faces).toHaveLength(1);
    expect(plan.faces[0].displayName).toBe('Grizzly Bears');
  });

  it('uses the flavor name for display while keeping the true name', () => {
    const card: ScryfallCard = {
      name: 'Grizzly Bears',
      type_line: 'Creature — Bear',
      color_identity: ['G'],
      layout: 'normal',
    };
    const entry = cardEntry({ flavorName: 'Big Angry Bear' });
    const plan = selectFaces(entry, card);
    if (plan.kind !== 'separate') throw new Error('expected separate plan');
    expect(plan.faces[0].displayName).toBe('Big Angry Bear');
    expect(plan.faces[0].trueName).toBe('Grizzly Bears');
  });
});

describe('selectFaces - transform double-faced cards', () => {
  const dfcCard: ScryfallCard = {
    name: 'Delver of Secrets // Insectile Aberration',
    type_line: 'Creature — Human Wizard // Creature — Human Insect',
    color_identity: ['U'],
    layout: 'transform',
    card_faces: [
      { name: 'Delver of Secrets', mana_cost: '{U}', type_line: 'Creature — Human Wizard', power: '1', toughness: '1' },
      { name: 'Insectile Aberration', type_line: 'Creature — Human Insect', power: '3', toughness: '2' },
    ],
  };

  it('always renders both faces as two separate canvases', () => {
    const plan = selectFaces(cardEntry({ name: 'Delver of Secrets' }), dfcCard);
    expect(plan.kind).toBe('separate');
    if (plan.kind !== 'separate') throw new Error('expected separate plan');
    expect(plan.faces).toHaveLength(2);
    expect(plan.faces.map((f) => f.displayName)).toEqual(['Delver of Secrets', 'Insectile Aberration']);
  });

  it('tags each face with its front/back transform indicator', () => {
    const plan = selectFaces(cardEntry({ name: 'Delver of Secrets' }), dfcCard);
    if (plan.kind !== 'separate') throw new Error('expected separate plan');
    expect(plan.faces[0].dfcIndicator).toEqual({ kind: 'transform', position: 'front' });
    expect(plan.faces[1].dfcIndicator).toEqual({ kind: 'transform', position: 'back' });
  });
});

describe('selectFaces - modal double-faced cards', () => {
  const mdfcCard: ScryfallCard = {
    name: 'Bala Ged Recovery // Bala Ged Sanctuary',
    type_line: 'Sorcery // Land',
    color_identity: ['G'],
    layout: 'modal_dfc',
    card_faces: [
      { name: 'Bala Ged Recovery', mana_cost: '{2}{G}', type_line: 'Sorcery', oracle_text: 'Return target card.' },
      { name: 'Bala Ged Sanctuary', type_line: 'Land', oracle_text: '{T}: Add {G}.' },
    ],
  };

  it('always renders both faces as two separate canvases with modal indicators', () => {
    const plan = selectFaces(cardEntry({ name: 'Bala Ged Recovery' }), mdfcCard);
    expect(plan.kind).toBe('separate');
    if (plan.kind !== 'separate') throw new Error('expected separate plan');
    expect(plan.faces).toHaveLength(2);
    expect(plan.faces[0].dfcIndicator).toEqual({ kind: 'modal', position: 'front' });
    expect(plan.faces[1].dfcIndicator).toEqual({ kind: 'modal', position: 'back' });
  });
});

describe('selectFaces - split and fuse cards', () => {
  it('composites split cards from both halves', () => {
    const card: ScryfallCard = {
      name: 'Fire // Ice',
      type_line: 'Instant // Instant',
      color_identity: ['U', 'R'],
      layout: 'split',
      card_faces: [
        { name: 'Fire', mana_cost: '{1}{R}', type_line: 'Instant', oracle_text: 'Fire deals 2 damage.' },
        { name: 'Ice', mana_cost: '{1}{U}', type_line: 'Instant', oracle_text: 'Tap target permanent.' },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Fire // Ice' }), card);
    expect(plan.kind).toBe('split');
    if (plan.kind !== 'split') throw new Error('expected split plan');
    expect(plan.left.displayName).toBe('Fire');
    expect(plan.right.displayName).toBe('Ice');
    expect(plan.left.frameKind).toBe('splitHalf');
    expect(plan.fuseText).toBeUndefined();
  });

  it('detects fuse cards from the trailing Fuse ability line and extracts the shared fuse text', () => {
    const card: ScryfallCard = {
      name: 'Turn // Burn',
      type_line: 'Instant // Instant',
      color_identity: ['U', 'R'],
      layout: 'split',
      card_faces: [
        { name: 'Turn', mana_cost: '{U}', type_line: 'Instant', oracle_text: 'Target creature gets +2/-2.' },
        {
          name: 'Burn',
          mana_cost: '{R}',
          type_line: 'Instant',
          oracle_text: 'Burn deals 2 damage.\nFuse (You may cast one or both halves.)',
        },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Turn // Burn' }), card);
    if (plan.kind !== 'split') throw new Error('expected split plan');
    expect(plan.fuseText).toBe('Fuse (You may cast one or both halves.)');
    expect(plan.right.oracleText).toBe('Burn deals 2 damage.');
  });
});

describe('selectFaces - aftermath cards', () => {
  it('composites an upright top face and a rotated bottom face', () => {
    const card: ScryfallCard = {
      name: 'Dead // Gone',
      type_line: 'Sorcery // Sorcery',
      color_identity: ['B'],
      layout: 'aftermath',
      card_faces: [
        { name: 'Dead', mana_cost: '{B}', type_line: 'Sorcery', oracle_text: 'Target creature gets -2/-2.' },
        { name: 'Gone', mana_cost: '{1}{B}', type_line: 'Sorcery', oracle_text: 'Exile target creature.' },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Dead // Gone' }), card);
    expect(plan.kind).toBe('aftermath');
    if (plan.kind !== 'aftermath') throw new Error('expected aftermath plan');
    expect(plan.top.displayName).toBe('Dead');
    expect(plan.top.frameKind).toBe('aftermathTop');
    expect(plan.bottom.displayName).toBe('Gone');
    expect(plan.bottom.frameKind).toBe('aftermathBottom');
  });
});

describe('selectFaces - flip cards', () => {
  it('composites both faces using the flip half layout', () => {
    const card: ScryfallCard = {
      name: 'Bushi Tenderfoot // Kenzo the Hardhearted',
      type_line: 'Creature — Human Soldier // Legendary Creature — Human Samurai',
      color_identity: ['W'],
      layout: 'flip',
      card_faces: [
        { name: 'Bushi Tenderfoot', mana_cost: '{W}', type_line: 'Creature — Human Soldier', power: '1', toughness: '1' },
        { name: 'Kenzo the Hardhearted', type_line: 'Legendary Creature — Human Samurai', power: '3', toughness: '4' },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Bushi Tenderfoot' }), card);
    expect(plan.kind).toBe('flip');
    if (plan.kind !== 'flip') throw new Error('expected flip plan');
    expect(plan.front.frameKind).toBe('flipHalf');
    expect(plan.back.frameKind).toBe('flipHalf');
    expect(plan.front.dfcIndicator).toBeUndefined();
  });
});

describe('selectFaces - adventure cards', () => {
  it('composites the creature main face with the adventure secondary face', () => {
    const card: ScryfallCard = {
      name: 'Brazen Borrower // Petty Theft',
      type_line: 'Creature — Faerie Rogue // Instant — Adventure',
      color_identity: ['U'],
      layout: 'adventure',
      card_faces: [
        { name: 'Brazen Borrower', mana_cost: '{1}{U}{U}', type_line: 'Creature — Faerie Rogue', power: '3', toughness: '1' },
        { name: 'Petty Theft', mana_cost: '{1}{U}', type_line: 'Instant — Adventure', oracle_text: 'Return target nonland permanent.' },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Brazen Borrower' }), card);
    expect(plan.kind).toBe('adventure');
    if (plan.kind !== 'adventure') throw new Error('expected adventure plan');
    expect(plan.main.frameKind).toBe('std');
    expect(plan.main.displayName).toBe('Brazen Borrower');
    expect(plan.secondary.frameKind).toBe('adventureSecondary');
    expect(plan.secondary.displayName).toBe('Petty Theft');
    expect(plan.mirrored).toBeFalsy();
  });
});

describe('selectFaces - reversible cards', () => {
  it('always renders both sides as two separate canvases, with no DFC indicator', () => {
    const card: ScryfallCard = {
      name: 'Adrix and Nev, Twincasters // Adrix and Nev, Twincasters',
      type_line: 'Legendary Creature — Merfolk Wizard // Legendary Creature — Merfolk Wizard',
      color_identity: ['U', 'G'],
      layout: 'reversible_card',
      card_faces: [
        { name: 'Adrix and Nev, Twincasters', mana_cost: '{2}{G}{U}', type_line: 'Legendary Creature — Merfolk Wizard', power: '2', toughness: '2' },
        { name: 'Adrix and Nev, Twincasters', mana_cost: '{2}{G}{U}', type_line: 'Legendary Creature — Merfolk Wizard', power: '2', toughness: '2' },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Adrix and Nev, Twincasters' }), card);
    expect(plan.kind).toBe('separate');
    if (plan.kind !== 'separate') throw new Error('expected separate plan');
    expect(plan.faces).toHaveLength(2);
    expect(plan.faces[0].dfcIndicator).toBeUndefined();
    expect(plan.faces[1].dfcIndicator).toBeUndefined();
  });
});

describe('selectFaces - room cards', () => {
  it('renders identically to a split card (room is not a distinct layout on Scryfall)', () => {
    const card: ScryfallCard = {
      name: 'Bottomless Pool // Locker Room',
      type_line: 'Room // Room',
      color_identity: ['U'],
      layout: 'split',
      card_faces: [
        { name: 'Bottomless Pool', mana_cost: '{1}{U}', type_line: 'Room', oracle_text: 'When this Room enters, draw a card, then discard a card.' },
        { name: 'Locker Room', mana_cost: '{U}', type_line: 'Room', oracle_text: 'Creatures your opponents control get -1/-0.' },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Bottomless Pool // Locker Room' }), card);
    expect(plan.kind).toBe('split');
    if (plan.kind !== 'split') throw new Error('expected split plan');
    expect(plan.left.displayName).toBe('Bottomless Pool');
    expect(plan.left.frameKind).toBe('splitHalf');
    expect(plan.right.displayName).toBe('Locker Room');
  });
});

describe('selectFaces - prepare cards', () => {
  it('composites like adventure but with the secondary box mirrored to the right', () => {
    const card: ScryfallCard = {
      name: 'Ivy, Gleeful Spellthief // Ivy\'s Prank',
      type_line: 'Legendary Creature — Elf Rogue // Sorcery — Prepare',
      color_identity: ['U', 'B', 'G'],
      layout: 'prepare',
      card_faces: [
        { name: 'Ivy, Gleeful Spellthief', mana_cost: '{1}{U}{B}{G}', type_line: 'Legendary Creature — Elf Rogue', power: '2', toughness: '3' },
        { name: "Ivy's Prank", mana_cost: '{1}{B}', type_line: 'Sorcery — Prepare', oracle_text: 'Target player mills three cards.' },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Ivy, Gleeful Spellthief' }), card);
    expect(plan.kind).toBe('adventure');
    if (plan.kind !== 'adventure') throw new Error('expected adventure plan');
    expect(plan.main.displayName).toBe('Ivy, Gleeful Spellthief');
    expect(plan.secondary.frameKind).toBe('adventureSecondary');
    expect(plan.mirrored).toBe(true);
  });
});

describe('selectFaces - loyalty and defense', () => {
  it('carries a planeswalker loyalty value through to the rendered face', () => {
    const card: ScryfallCard = {
      name: 'Jace, the Mind Sculptor',
      type_line: 'Legendary Planeswalker — Jace',
      oracle_text: '+2: ...',
      loyalty: '3',
      color_identity: ['U'],
      layout: 'normal',
    };
    const plan = selectFaces(cardEntry({ name: 'Jace, the Mind Sculptor' }), card);
    if (plan.kind !== 'separate') throw new Error('expected separate plan');
    expect(plan.faces[0].loyalty).toBe('3');
    expect(plan.faces[0].power).toBeUndefined();
  });

  it('carries a battle defense value through to the rendered face', () => {
    const card: ScryfallCard = {
      name: 'Invasion of Gobakhan',
      type_line: 'Battle — Siege',
      oracle_text: 'When you cast this spell...',
      defense: '3',
      color_identity: ['W'],
      layout: 'transform',
      card_faces: [
        { name: 'Invasion of Gobakhan', type_line: 'Battle — Siege', oracle_text: 'When you cast this spell...', defense: '3' },
        { name: 'Yenna, Redtooth Regent', type_line: 'Legendary Creature — Dragon Rebel', power: '4', toughness: '4' },
      ],
    };
    const plan = selectFaces(cardEntry({ name: 'Invasion of Gobakhan' }), card);
    if (plan.kind !== 'separate') throw new Error('expected separate plan');
    expect(plan.faces[0].defense).toBe('3');
    expect(plan.faces[1].power).toBe('4');
  });
});

describe('isIgnorableBasicLand', () => {
  it('flags a basic land entry when ignoreBasicLands is enabled', () => {
    const plains: ScryfallCard = { name: 'Plains', type_line: 'Basic Land — Plains', color_identity: [], layout: 'normal' };
    expect(isIgnorableBasicLand(plains, true)).toBe(true);
    expect(isIgnorableBasicLand(plains, false)).toBe(false);
  });

  it('never flags a non-basic-land card', () => {
    const bolt: ScryfallCard = { name: 'Lightning Bolt', type_line: 'Instant', color_identity: ['R'], layout: 'normal' };
    expect(isIgnorableBasicLand(bolt, true)).toBe(false);
  });
});
