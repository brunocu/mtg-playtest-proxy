## Purpose

Reports proxy-card PDF generation progress to the user as an updating phase-status message, with a live card count during rendering, so the user can see what the system is doing and, while cards are being rendered, roughly how far along it is.

## ADDED Requirements

### Requirement: Report the current generation phase as a status message
The system SHALL display an updating status message naming the current phase of a decklist-to-PDF generation run (decklist parsing, card data lookup, per-card rendering, PDF assembly) for the duration between the user starting generation and the PDF being ready for download.

#### Scenario: Generation starts
- **WHEN** the user starts generating a PDF from a decklist
- **THEN** the system displays a status message for the first phase (decklist parsing)

#### Scenario: Phase transitions
- **WHEN** generation moves from one phase to the next (e.g. from card data lookup to rendering)
- **THEN** the displayed status message updates to name the new phase

#### Scenario: Generation completes successfully
- **WHEN** the PDF has finished building and is ready to download
- **THEN** the system displays a completion message before or as the download begins

### Requirement: Show a live card count during rendering
The system SHALL include a live "card N of M" count in the status message while the rendering phase is in progress, updating as each card finishes rendering, since the total card count and per-card completion are both known without requiring any change to card data lookup or rendering internals.

#### Scenario: Decklist with many cards being rendered
- **WHEN** a decklist resolves to many cards and the system is rendering them one at a time
- **THEN** the displayed card count increases as each card finishes rendering, rather than remaining unchanged until all cards are done

#### Scenario: Decklist with a single card
- **WHEN** a decklist resolves to a single card
- **THEN** the rendering-phase status message still shows a card count (e.g. "card 1 of 1")

### Requirement: No fabricated overall percentage
The system SHALL NOT display an overall numeric percentage or progress fraction for phases where no natural count is available (decklist parsing, card data lookup, PDF assembly), since those phases complete in a single step without incremental data to report.

#### Scenario: Card data lookup in progress
- **WHEN** the system is looking up card data on Scryfall
- **THEN** the displayed status message names the phase without an accompanying percentage or fraction

### Requirement: Reflect failure without a stuck or misleading status
The system SHALL stop updating and clearly report an error state, distinct from the phase-status message, when generation fails, rather than leaving the status message on a stale or ambiguous phase.

#### Scenario: Card lookup fails entirely
- **WHEN** no decklist entries can be resolved during card data lookup
- **THEN** the system stops showing phase-status text and reports an error state instead
