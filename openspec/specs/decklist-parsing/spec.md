# decklist-parsing Specification

## Purpose

Turns a user-pasted decklist (free text) into a structured list of card entries the rest of the app can look up and render, without requiring a strict or single input format.

## Requirements

### Requirement: Parse quantity-prefixed card lines
The system SHALL parse each non-empty line of a pasted decklist into a card entry consisting of a quantity and a card name, accepting lines with no quantity (implying 1), a bare number prefix, and an "Nx" prefix.

#### Scenario: Bare card name
- **WHEN** a line reads `Lightning Bolt`
- **THEN** the system produces one entry with quantity 1 and name "Lightning Bolt"

#### Scenario: Numeric prefix
- **WHEN** a line reads `4 Lightning Bolt`
- **THEN** the system produces one entry with quantity 4 and name "Lightning Bolt"

#### Scenario: "Nx" prefix
- **WHEN** a line reads `4x Lightning Bolt`
- **THEN** the system produces one entry with quantity 4 and name "Lightning Bolt"

### Requirement: Parse flavor names
The system SHALL support an optional alternate/flavor name for a card entry, distinct from the card's real name, so the rendered card can display the flavor name while still being looked up by its real name. This flavor-name syntax, delimited by `[` and `]`, applies only to card entries. On a token entry, `[...]` is not recognized as a flavor name — a trailing `<...>` is instead read as an ability hint list (see "Parse token and emblem entries").

#### Scenario: Entry with flavor name
- **WHEN** a decklist line specifies both a card's real name and a flavor name
- **THEN** the system produces an entry retaining both the real name (for lookup) and the flavor name (for display)

#### Scenario: Bracket on a token line is not a flavor name
- **WHEN** a line reads `(token) Bird [Big Bird]`
- **THEN** the system does not treat "Big Bird" as a flavor name on the resulting token entry

### Requirement: Parse token and emblem entries
The system SHALL recognize a line of the form `(token) <Token Name>` as a token entry and a line of the form `(emblem) <Planeswalker Name>` as an emblem entry, distinct from regular card entries, and SHALL accept the same quantity prefixes (bare, numeric, "Nx") on these lines as on regular card lines.

For token entries, the system SHALL accept optional disambiguation hints positioned between the `(token)` marker and the name, in a fixed order: a power/toughness hint (`<power>/<toughness>`, e.g. `2/2`), then a color hint (one or more of the letters W, U, B, R, G, C, e.g. `U` or `WU`). Both hints are optional and independent of each other. The system SHALL also accept an optional ability/keyword hint list after the name, delimited by `<` and `>` (e.g. `<flying, vigilance>`), with each comma-separated hint retained as a separate string. This ability-hint delimiter applies only to token entries.

#### Scenario: Token entry
- **WHEN** a line reads `(token) Soldier`
- **THEN** the system produces one token entry named "Soldier" with quantity 1 and no hints

#### Scenario: Emblem entry
- **WHEN** a line reads `(emblem) Elspeth, Sun's Champion`
- **THEN** the system produces one emblem entry named "Elspeth, Sun's Champion" with quantity 1

#### Scenario: Token entry with quantity
- **WHEN** a line reads `2x (token) Marit Lage`
- **THEN** the system produces one token entry named "Marit Lage" with quantity 2

#### Scenario: Token entry with power/toughness and color hints
- **WHEN** a line reads `(token) 2/2 U Bird`
- **THEN** the system produces one token entry named "Bird" with a power/toughness hint of "2/2" and a color hint of "U"

#### Scenario: Token entry with ability hints
- **WHEN** a line reads `(token) Bird <flying, vigilance>`
- **THEN** the system produces one token entry named "Bird" with ability hints `["flying", "vigilance"]`

#### Scenario: Token entry with quantity, stat, color, and ability hints together
- **WHEN** a line reads `2x (token) 2/2 U Bird <flying>`
- **THEN** the system produces one token entry named "Bird" with quantity 2, power/toughness hint "2/2", color hint "U", and ability hints `["flying"]`

### Requirement: Skip non-card lines without failing the whole parse
The system SHALL ignore blank lines and SHALL continue parsing the remaining lines when a single line cannot be parsed, rather than aborting the entire decklist.

#### Scenario: Blank line in the middle of a decklist
- **WHEN** the pasted decklist contains an empty line between two card lines
- **THEN** the system parses both surrounding card lines and produces no entry for the blank line

#### Scenario: One unparseable line among valid ones
- **WHEN** the pasted decklist contains one line that does not match any supported format alongside other valid lines
- **THEN** the system parses all valid lines into entries and reports the unparseable line back to the user instead of stopping

### Requirement: Associate a source line number with each entry and unparseable line
The system SHALL record the 1-based source line number for every parsed entry and every unparseable line, so downstream consumers can pinpoint the originating line.

#### Scenario: Entry from a specific line
- **WHEN** a decklist line at position N parses successfully into an entry
- **THEN** the entry retains line number N

#### Scenario: Unparseable line at a specific position
- **WHEN** a decklist line at position N cannot be parsed
- **THEN** the reported unparseable line retains line number N

#### Scenario: Blank lines do not shift numbering
- **WHEN** a decklist contains blank lines interspersed with card lines
- **THEN** each entry's recorded line number matches its actual position in the original pasted text, including blank lines in the count
