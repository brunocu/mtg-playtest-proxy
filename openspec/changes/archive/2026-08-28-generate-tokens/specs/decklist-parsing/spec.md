## MODIFIED Requirements

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

### Requirement: Parse flavor names
The system SHALL support an optional alternate/flavor name for a card entry, distinct from the card's real name, so the rendered card can display the flavor name while still being looked up by its real name. This flavor-name syntax, delimited by `[` and `]`, applies only to card entries. On a token entry, `[...]` is not recognized as a flavor name — a trailing `<...>` is instead read as an ability hint list (see "Parse token and emblem entries").

#### Scenario: Entry with flavor name
- **WHEN** a decklist line specifies both a card's real name and a flavor name
- **THEN** the system produces an entry retaining both the real name (for lookup) and the flavor name (for display)

#### Scenario: Bracket on a token line is not a flavor name
- **WHEN** a line reads `(token) Bird [Big Bird]`
- **THEN** the system does not treat "Big Bird" as a flavor name on the resulting token entry
