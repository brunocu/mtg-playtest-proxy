## MODIFIED Requirements

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
