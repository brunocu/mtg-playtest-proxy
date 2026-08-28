## ADDED Requirements

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
