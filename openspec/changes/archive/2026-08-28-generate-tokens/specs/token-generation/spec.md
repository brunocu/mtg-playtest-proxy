## Purpose

Automatically derives the tokens a decklist's cards create using Scryfall's card-relationship data, so the proxy sheet includes the exact token prints those cards reference without the user having to identify ambiguous tokens by hand.

## ADDED Requirements

### Requirement: Provide an option to generate tokens
The system SHALL provide a "Generate tokens" rendering option, disabled by default, that controls whether tokens are automatically derived from decklist cards.

#### Scenario: Option disabled
- **WHEN** "Generate tokens" is not enabled
- **THEN** no token entries are added to the resolved set beyond what the user explicitly listed

#### Scenario: Option enabled
- **WHEN** "Generate tokens" is enabled and the decklist resolves successfully
- **THEN** token entries derived from the resolved cards are added to the resolved set before rendering

### Requirement: Derive tokens from resolved cards' token relationships
When the "Generate tokens" option is enabled, the system SHALL inspect each resolved card's Scryfall token relationships (related-card entries whose component is "token") and SHALL resolve each referenced token to full Scryfall card data.

#### Scenario: Card that creates one token
- **WHEN** a resolved card's data lists one token relationship
- **THEN** the system resolves that token to full card data and includes it in the render set

#### Scenario: Card that creates no tokens
- **WHEN** a resolved card's data lists no token relationships
- **THEN** the system adds no derived token entries for that card

#### Scenario: Card with non-token relationships
- **WHEN** a resolved card's data lists relationships that are not token relationships (e.g. a combo-piece self-reference, a referenced card, or an emblem relationship)
- **THEN** the system does not treat those relationships as tokens to derive

### Requirement: Batch derived token hydration
The system SHALL resolve derived token ids to full Scryfall card data using the same batched collection lookup and combined rate limit as other card and token lookups, submitting at most 75 unique ids per request.

#### Scenario: More than 75 derived tokens
- **WHEN** token generation derives more than 75 unique token ids across the decklist
- **THEN** the system splits the hydration into multiple batched requests within the same combined rate limit as other lookups

### Requirement: Deduplicate derived tokens by design identity
The system SHALL deduplicate derived token entries by the token's Scryfall oracle identity, so that the same token design referenced by multiple different resolved cards, or represented by different specific token prints, is included only once.

#### Scenario: Same token design referenced by two different cards
- **WHEN** two resolved cards in the decklist each reference a token with the same design (same oracle identity) but different specific prints
- **THEN** the system includes only one instance of that token in the render set

#### Scenario: Same token referenced by multiple copies of a card
- **WHEN** a resolved card's token relationship recurs because multiple cards in the decklist reference the same token design
- **THEN** the system does not duplicate that token in the render set

### Requirement: Default to one copy of each derived token
The system SHALL include exactly one copy of each distinct derived token by default, regardless of how many cards in the decklist reference it or how many copies of the source card are in the decklist.

#### Scenario: Multiple copies of a token-making card
- **WHEN** the decklist contains multiple copies of a card that creates a token
- **THEN** the system still includes only one copy of that derived token by default

### Requirement: Emblems are not derived
The system SHALL NOT attempt to derive emblem entries automatically, since Scryfall does not distinguish emblem relationships from other non-token referenced cards in a way the system can rely on.

#### Scenario: Card that creates an emblem
- **WHEN** a resolved card's data lists a relationship to an emblem
- **THEN** the system does not add that emblem to the render set, and the user must add it manually with an `(emblem)` decklist line
