## Purpose

Resolves parsed decklist entries into real card data (mana cost, type line, oracle text, power/toughness) by querying Scryfall client-side, so rendering has accurate source data without any bundled card database. Set and rarity information is not required by this capability.

## ADDED Requirements

### Requirement: Resolve card entries by fuzzy name match
The system SHALL resolve each parsed card entry to Scryfall card data using fuzzy name matching, tolerating minor spelling/case differences from the user's input.

#### Scenario: Exact name match
- **WHEN** a decklist entry's name exactly matches a real card name
- **THEN** the system resolves it to that card's Scryfall data

#### Scenario: Near-match name
- **WHEN** a decklist entry's name is a close but imperfect match to a real card name (e.g. minor typo or case difference)
- **THEN** the system resolves it to the intended card's Scryfall data via fuzzy matching

### Requirement: Resolve token and emblem entries
The system SHALL resolve decklist entries identified as tokens or emblems using a type-based lookup against Scryfall rather than a name-only lookup.

#### Scenario: Token entry
- **WHEN** a decklist entry is a token entry (e.g. parsed from `(token) Soldier`)
- **THEN** the system resolves it to matching token card data from Scryfall

### Requirement: Cache resolved lookups within a session
The system SHALL cache each resolved card's data client-side after first lookup and SHALL reuse the cached result for repeated entries of the same card within the same session instead of issuing a duplicate Scryfall request.

#### Scenario: Same card appears multiple times in a decklist
- **WHEN** a decklist contains multiple entries for the same card name
- **THEN** the system issues only one Scryfall lookup for that card name and reuses the cached result for the other entries

### Requirement: Report unresolved entries without blocking the rest
The system SHALL continue resolving the remaining decklist entries and SHALL report which entries could not be resolved when a given entry has no matching card on Scryfall, rather than failing the whole deck.

#### Scenario: One entry has no matching card
- **WHEN** a decklist contains one entry whose name matches no card on Scryfall alongside other valid entries
- **THEN** the system resolves all other entries successfully and reports the unresolved entry to the user
