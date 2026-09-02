# proxy-card-rendering Specification

## Purpose

Renders a single resolved card's data into a grayscale proxy card image in the browser, reproducing bwproxy's layout (frame, mana cost, type line, oracle text, power/toughness, loyalty, defense) and its full set of configurable rendering options. Set and rarity information is not required and is not fetched or displayed.

## Requirements

### Requirement: Render standard card layout
The system SHALL render a resolved card as a card-shaped image containing, at minimum, the card name, mana cost, type line, oracle text, and power/toughness (when applicable), laid out in the standard MTG card regions (title, type line, text box, P/T box).

#### Scenario: Render a creature card
- **WHEN** a resolved card entry is a creature with a mana cost, type line, oracle text, and power/toughness
- **THEN** the system renders all of those fields in their respective card regions

#### Scenario: Oracle text longer than the text box
- **WHEN** a card's oracle text does not fit the text box at the default text size
- **THEN** the system shrinks the text so the full oracle text remains visible within the text box

### Requirement: Render a single-stat box for loyalty and defense
The system SHALL render a card's loyalty or defense value in the same stat-box region used for power/toughness, showing a single number rather than an X/Y pair, for cards that have a loyalty or defense value instead of power and toughness.

#### Scenario: Planeswalker loyalty
- **WHEN** a resolved card entry is a planeswalker with a loyalty value
- **THEN** the system renders that loyalty value in the stat box

#### Scenario: Battle defense
- **WHEN** a resolved card entry is a battle with a defense value
- **THEN** the system renders that defense value in the stat box

### Requirement: Render mana symbols as icons or text
The system SHALL render mana costs and mana symbols in oracle text as icon images by default, and SHALL render them as bracketed text (e.g. `{W}`) instead when the user disables symbol rendering.

#### Scenario: Default symbol rendering
- **WHEN** a card has a mana cost and the user has not disabled symbol rendering
- **THEN** the system renders each mana symbol as its corresponding icon

#### Scenario: Text-only mana symbols
- **WHEN** the user disables symbol rendering
- **THEN** the system renders mana symbols as their bracketed text equivalents instead of icons

### Requirement: Color borders by mana identity
The system SHALL render each card's border in black by default, and SHALL render it in a color matching the card's mana color identity (including a multicolor and colorless treatment) when the user enables colored borders.

#### Scenario: Colored border enabled for a mono-color card
- **WHEN** the user enables colored borders and a card's color identity is a single color
- **THEN** the system renders that card's border in the color matching its identity

#### Scenario: Colored border enabled for a multicolor card
- **WHEN** the user enables colored borders and a card's color identity includes more than one color
- **THEN** the system renders that card's border using the multicolor treatment

### Requirement: Render at full or reduced scale
The system SHALL render cards at full standard card size by default, and SHALL render them at a reduced scale when the user selects the small-size option, without cropping or omitting any card content.

#### Scenario: Small scale selected
- **WHEN** the user selects the small-size rendering option
- **THEN** the system renders every card at the reduced scale with the same layout and content as the full-size rendering

### Requirement: Render basic lands per configured option
The system SHALL render basic land cards with their standard mana symbol overlay by default, SHALL render them without the large mana symbol overlay ("blank") when the user enables that option, and SHALL exclude basic lands from the output entirely when the user enables the ignore-basic-lands option.

#### Scenario: Blank basic lands enabled
- **WHEN** the user enables the blank basic lands option and the decklist includes a Plains
- **THEN** the system renders the Plains without the large mana symbol overlay

#### Scenario: Ignore basic lands enabled
- **WHEN** the user enables the ignore-basic-lands option and the decklist includes basic lands
- **THEN** the system omits those basic land entries from the rendered output entirely

### Requirement: Render double-faced cards as two separate cards
The system SHALL render each transform, modal-double-faced-card, or reversible-card entry as two independent standard-shaped card images, one per face, unconditionally (not gated by any option).

#### Scenario: Transform card
- **WHEN** a resolved decklist entry is a transform double-faced card
- **THEN** the system renders two card images, one for the front face and one for the back face, each in the standard card layout

#### Scenario: Modal double-faced card
- **WHEN** a resolved decklist entry is a modal double-faced card
- **THEN** the system renders two card images, one for each face, each in the standard card layout

#### Scenario: Reversible card
- **WHEN** a resolved decklist entry is a reversible card
- **THEN** the system renders two card images, one for each side, each in the standard card layout

### Requirement: Render split, fuse, aftermath, flip, adventure, and prepare cards as one composited card
The system SHALL render split, fuse, aftermath, flip, adventure, and prepare cards as a single card image using each layout's authentic physical composition, unconditionally (not gated by any option). Room cards SHALL be treated as split cards, and prepare cards SHALL be treated as adventure cards with the second rules box mirrored to the right side instead of the left. For adventure and prepare cards, the main face's power/toughness, loyalty, or defense stat box SHALL remain fully visible and SHALL NOT be obscured by the compositing of the secondary rules box, regardless of which side the secondary box is mirrored to.

#### Scenario: Split or fuse card
- **WHEN** a resolved decklist entry is a split or fuse card
- **THEN** the system renders one card image with both halves rotated 90 degrees and placed side by side, matching the card's physical printing

#### Scenario: Fuse card fuse text
- **WHEN** a resolved decklist entry is a fuse card
- **THEN** the rendered card image includes the fuse ability text in a bar spanning both halves

#### Scenario: Aftermath card
- **WHEN** a resolved decklist entry is an aftermath card
- **THEN** the system renders one card image with the first half upright on top and the second half rotated 90 degrees below it, matching the card's physical printing

#### Scenario: Flip card
- **WHEN** a resolved decklist entry is a flip card
- **THEN** the system renders one card image with one face upright and the other face rotated 180 degrees beneath it, matching the card's physical printing

#### Scenario: Adventure card
- **WHEN** a resolved decklist entry is an adventure card
- **THEN** the system renders one card image with the creature's standard frame and a compact second rules box for the adventure spell below it, both on the same face

#### Scenario: Room card
- **WHEN** a resolved decklist entry is a room card
- **THEN** the system renders it identically to a split card, per the split scenario above

#### Scenario: Prepare card
- **WHEN** a resolved decklist entry is a prepare card
- **THEN** the system renders one card image with the creature's standard frame and a compact second rules box for the prepared spell below it, mirrored to the right side of the frame instead of the left

#### Scenario: Prepare card stat box stays visible
- **WHEN** a resolved decklist entry is a prepare card whose creature face has power/toughness, loyalty, or defense
- **THEN** the rendered card image shows the creature's stat box on top of (not covered by) the mirrored secondary rules box

### Requirement: Render compound mana symbols with a diagonal-offset glyph pair
The system SHALL render hybrid, two-hybrid, and Phyrexian mana symbols in icon mode as their two component glyphs at reduced size, diagonally offset from each other, rather than as two full-size glyphs side by side. In text-only mode these symbols SHALL continue to render as bracketed text unchanged.

#### Scenario: Hybrid symbol in icon mode
- **WHEN** the user has not disabled symbol rendering and a mana cost includes a hybrid symbol (e.g. `{W/U}`)
- **THEN** the system renders the two component color glyphs at reduced size, diagonally offset, as a single compound symbol

#### Scenario: Phyrexian symbol in icon mode
- **WHEN** the user has not disabled symbol rendering and a mana cost includes a Phyrexian symbol (e.g. `{W/P}`)
- **THEN** the system renders the color glyph and the Phyrexian-oil glyph at reduced size, diagonally offset, as a single compound symbol

#### Scenario: Compound symbol in text-only mode
- **WHEN** the user disables symbol rendering and a mana cost includes a hybrid or Phyrexian symbol
- **THEN** the system renders that symbol as its bracketed text equivalent, unchanged from today's behavior

### Requirement: Render a front/back indicator on double-faced cards
The system SHALL render a small indicator on each transform or modal-double-faced-card face identifying it as the front or back face: the corresponding Mana font glyph immediately left of the title in icon mode, or a `(front)`/`(back)` text badge in text-only mode.

#### Scenario: Transform card front and back
- **WHEN** the user has not disabled symbol rendering and a decklist entry is a transform double-faced card
- **THEN** the system renders the transform-front glyph on the front face's card image and the transform-back glyph on the back face's card image

#### Scenario: Modal double-faced card front and back
- **WHEN** the user has not disabled symbol rendering and a decklist entry is a modal double-faced card
- **THEN** the system renders the modal-front glyph on the front face's card image and the modal-back glyph on the back face's card image

#### Scenario: Double-faced card in text-only mode
- **WHEN** the user disables symbol rendering and a decklist entry is a transform or modal double-faced card
- **THEN** the system renders a `(front)` or `(back)` text badge on each face's card image in place of the icon

### Requirement: No set, rarity, or custom icon
The system SHALL NOT fetch, display, or accept a user-supplied icon of any kind on rendered cards.

#### Scenario: Card rendered
- **WHEN** any card is rendered
- **THEN** the system displays no set icon, rarity icon, or custom icon on it
