## MODIFIED Requirements

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
