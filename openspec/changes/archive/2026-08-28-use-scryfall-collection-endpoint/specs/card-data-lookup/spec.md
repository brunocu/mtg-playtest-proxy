## REMOVED Requirements

### Requirement: Resolve card entries by fuzzy name match
The system SHALL resolve each parsed card entry to Scryfall card data using fuzzy name matching, tolerating minor spelling/case differences from the user's input.

#### Scenario: Exact name match
- **WHEN** a decklist entry's name exactly matches a real card name
- **THEN** the system resolves it to that card's Scryfall data

#### Scenario: Near-match name
- **WHEN** a decklist entry's name is a close but imperfect match to a real card name (e.g. minor typo or case difference)
- **THEN** the system resolves it to the intended card's Scryfall data via fuzzy matching

**Reason**: Fuzzy matching required a per-card `/cards/named?fuzzy=` request, which cannot be batched. Switching to Scryfall's batched `/cards/collection` endpoint (exact-name only) is necessary to resolve many unique cards per request instead of one request per card.

**Migration**: None. Decklist entries with typos or near-miss names now resolve as unresolved (see "Report unresolved entries without blocking the rest") instead of being auto-corrected. Users must supply exact card names.

## ADDED Requirements

### Requirement: Resolve card entries by exact name match, batched
The system SHALL resolve parsed card entries to Scryfall card data by exact name match, submitting entries in batches of at most 75 unique names per request to Scryfall's collection lookup endpoint.

#### Scenario: Exact name match
- **WHEN** a decklist entry's name exactly matches a real card name
- **THEN** the system resolves it to that card's Scryfall data

#### Scenario: More than 75 unique card names
- **WHEN** a decklist contains more than 75 unique card entries
- **THEN** the system splits the lookup into multiple batched requests and resolves all entries across those requests

#### Scenario: Typo or near-miss name
- **WHEN** a decklist entry's name does not exactly match any real card name
- **THEN** the system reports the entry as unresolved rather than attempting to correct it

### Requirement: Respect Scryfall rate limits across lookup endpoints
The system SHALL constrain its combined request rate to Scryfall's card-collection and card-search lookup endpoints to no more than 2 requests per second, since both endpoint types share the same published rate limit.

#### Scenario: Decklist requiring multiple batched and token/emblem requests
- **WHEN** resolving a decklist requires several batched card-collection requests and several token/emblem search requests
- **THEN** the system paces all of these requests, combined, at no more than 2 requests per second
