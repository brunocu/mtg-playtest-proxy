# decklist-error-display Specification

## Purpose

Surfaces decklist parse and card-lookup errors directly on the lines that caused them, inside the decklist textarea, instead of in a separate itemized list.

## Requirements

### Requirement: Highlight erroring lines in the decklist textarea
The system SHALL visually highlight, within the decklist textarea, any line that fails to parse or whose parsed entry fails to resolve against Scryfall.

#### Scenario: Line fails to parse
- **WHEN** a decklist line cannot be parsed
- **THEN** that line is visually highlighted within the textarea

#### Scenario: Line's card fails to resolve
- **WHEN** a decklist line parses successfully but its entry cannot be resolved against Scryfall
- **THEN** that line is visually highlighted within the textarea

#### Scenario: Valid line is not highlighted
- **WHEN** a decklist line parses and resolves successfully
- **THEN** that line is not highlighted

### Requirement: Whole-line highlight extent
The system SHALL highlight an erroring line across its full width rather than highlighting only a sub-string of the line.

#### Scenario: Line with an invalid portion
- **WHEN** a line is highlighted because it contains invalid content
- **THEN** the highlight covers the entire line rather than only the invalid portion of it

### Requirement: Error reason available on hover
The system SHALL show the specific reason a highlighted line could not be included when the user hovers over it.

#### Scenario: Hovering a highlighted line
- **WHEN** the user hovers over a highlighted line
- **THEN** a tooltip shows the specific reason that line could not be included

### Requirement: Generic summary message instead of an itemized list
The system SHALL show a single summary message stating how many decklist entries could not be included, instead of listing each failing entry individually.

#### Scenario: One or more entries fail
- **WHEN** one or more decklist entries could not be included
- **THEN** the system shows a single message stating the count of entries that could not be included, without listing each one individually

#### Scenario: No failures
- **WHEN** all decklist entries parse and resolve successfully
- **THEN** no error summary message is shown

### Requirement: Finish processing the whole decklist before evaluating for errors
The system SHALL parse and attempt to resolve every line of the decklist before determining whether any errors occurred, rather than stopping at the first parse or lookup failure.

#### Scenario: Multiple lines fail
- **WHEN** a decklist contains more than one line that fails to parse or resolve
- **THEN** the system finishes parsing and resolving every line and reports all of the failing lines, not just the first one encountered

### Requirement: Block rendering and PDF generation while any decklist errors remain
The system SHALL NOT proceed to card rendering or PDF generation when one or more decklist lines failed to parse or resolve, even if other lines succeeded, and SHALL proceed to rendering and PDF generation only when every line parsed and resolved successfully.

#### Scenario: Some lines fail while others succeed
- **WHEN** one or more decklist lines fail to parse or resolve while other lines succeed
- **THEN** the system does not render any cards or generate a PDF, and instead shows the error highlighting and summary message

#### Scenario: All lines succeed
- **WHEN** every decklist line parses and resolves successfully
- **THEN** the system proceeds to render the cards and generate the PDF

### Requirement: No line wrapping in the decklist textarea
The system SHALL disable soft line-wrapping in the decklist textarea so each logical line occupies exactly one visual row.

#### Scenario: Long decklist line
- **WHEN** a decklist line is long enough that it would otherwise soft-wrap
- **THEN** it remains on a single visual row and the textarea scrolls horizontally instead of wrapping
