# card-data-lookup Specification

## Purpose

Resolves parsed decklist entries into real card data (mana cost, type line, oracle text, power/toughness) by querying Scryfall client-side, so rendering has accurate source data without any bundled card database. Set and rarity information is not required by this capability.

## Requirements

### Requirement: Resolve card entries by exact name match, batched
The system SHALL resolve parsed card entries to Scryfall card data by exact name match, submitting entries in batches of at most 75 unique names per request to Scryfall's collection lookup endpoint. For a two-faced card (transform, modal double-faced, split, aftermath, flip, or adventure layout) entered under its full combined name (`"Front // Back"`), the system SHALL resolve it by matching on the front face's name, since Scryfall's collection lookup does not match the combined form.

#### Scenario: Exact name match
- **WHEN** a decklist entry's name exactly matches a real card name
- **THEN** the system resolves it to that card's Scryfall data

#### Scenario: More than 75 unique card names
- **WHEN** a decklist contains more than 75 unique card entries
- **THEN** the system splits the lookup into multiple batched requests and resolves all entries across those requests

#### Scenario: Typo or near-miss name
- **WHEN** a decklist entry's name does not exactly match any real card name
- **THEN** the system reports the entry as unresolved rather than attempting to correct it

#### Scenario: Two-faced card entered under its combined name
- **WHEN** a decklist entry's name is a two-faced card's full combined name (e.g. `"Esper Origins // Summon: Esper Maduin"`)
- **THEN** the system resolves it to that card's Scryfall data, including both faces

#### Scenario: Two-faced card entered under its front-face name alone
- **WHEN** a decklist entry's name matches only the front face of a two-faced card (e.g. `"Esper Origins"`)
- **THEN** the system resolves it to that card's Scryfall data, including both faces

### Requirement: Respect Scryfall rate limits across lookup endpoints
The system SHALL constrain its combined request rate to Scryfall's card-collection and card-search lookup endpoints to no more than 2 requests per second, since both endpoint types share the same published rate limit.

#### Scenario: Decklist requiring multiple batched and token/emblem requests
- **WHEN** resolving a decklist requires several batched card-collection requests and several token/emblem search requests
- **THEN** the system paces all of these requests, combined, at no more than 2 requests per second

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

### Requirement: Retain source line number on unresolved entries
The system SHALL retain the originating decklist line number on each unresolved entry it reports, propagated from the parsed entry's recorded line number.

#### Scenario: Entry fails to resolve
- **WHEN** a parsed entry with a recorded line number fails to resolve against Scryfall
- **THEN** the reported unresolved entry retains that same line number
