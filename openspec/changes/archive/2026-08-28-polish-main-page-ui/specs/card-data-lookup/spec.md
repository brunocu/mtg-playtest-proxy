## ADDED Requirements

### Requirement: Retain source line number on unresolved entries
The system SHALL retain the originating decklist line number on each unresolved entry it reports, propagated from the parsed entry's recorded line number.

#### Scenario: Entry fails to resolve
- **WHEN** a parsed entry with a recorded line number fails to resolve against Scryfall
- **THEN** the reported unresolved entry retains that same line number
