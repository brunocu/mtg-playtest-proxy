## MODIFIED Requirements

### Requirement: Resolve token and emblem entries
The system SHALL resolve a manual token decklist entry by first attempting to match it, by name and any given power/toughness, color, and ability hints, against the set of tokens already derived for the decklist (when token generation has produced such a set). When exactly one derived token matches, the system SHALL resolve the entry to that derived token's data and SHALL use the manual entry's quantity in place of the derived entry's default quantity. When zero or more than one derived token matches, the system SHALL instead resolve the entry using a type-based lookup against Scryfall, filtered by any given power/toughness, color, and ability hints, rather than a name-only lookup. The system SHALL resolve emblem entries using a type-based lookup against Scryfall by name; hint parsing does not apply to emblem entries.

#### Scenario: Token entry
- **WHEN** a decklist entry is a token entry (e.g. parsed from `(token) Soldier`) and no derived token set matches it
- **THEN** the system resolves it to matching token card data from a Scryfall type:token search

#### Scenario: Token entry matches a derived token
- **WHEN** a manual token entry's name and hints match exactly one already-derived token
- **THEN** the system resolves the entry to that derived token's data instead of issuing a new Scryfall search

#### Scenario: Manual quantity replaces derived quantity
- **WHEN** a manual token entry matches an already-derived token and specifies a quantity
- **THEN** the resolved entry's quantity is the manual entry's quantity, not the derived token's default quantity

#### Scenario: Ambiguous hints among derived tokens fall through to Scryfall
- **WHEN** a manual token entry's name and hints match more than one already-derived token
- **THEN** the system resolves the entry using a hint-filtered Scryfall search instead of picking among the tied derived tokens

#### Scenario: Hint-filtered Scryfall search
- **WHEN** a manual token entry includes power/toughness, color, or ability hints and does not match the derived set
- **THEN** the Scryfall search used to resolve it is filtered by those hints rather than matching on name alone

#### Scenario: Emblem entry resolved by name
- **WHEN** a decklist entry is an emblem entry (e.g. parsed from `(emblem) Elspeth, Sun's Champion`)
- **THEN** the system resolves it using a type-based Scryfall search by name, unaffected by token hint parsing
