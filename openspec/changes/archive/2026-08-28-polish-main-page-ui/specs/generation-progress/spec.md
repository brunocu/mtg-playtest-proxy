## MODIFIED Requirements

### Requirement: Reflect failure without a stuck or misleading status
The system SHALL stop updating and clearly report an error state, distinct from the phase-status message, when generation fails, rather than leaving the status message on a stale or ambiguous phase.

#### Scenario: Card lookup fails entirely
- **WHEN** no decklist entries can be resolved during card data lookup
- **THEN** the system stops showing phase-status text and reports an error state instead

#### Scenario: Some entries fail while others succeed
- **WHEN** one or more decklist lines fail to parse or resolve during decklist parsing or card data lookup, while other lines succeed
- **THEN** the system stops showing phase-status text after that phase completes, without proceeding to rendering or PDF assembly, and reports an error state instead
