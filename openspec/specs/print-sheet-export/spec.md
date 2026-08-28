# print-sheet-export Specification

## Purpose

Composes rendered proxy cards onto printable page(s) at accurate physical dimensions and produces a downloadable PDF the user can print and cut out for use with real sleeves.

## Requirements

### Requirement: Lay out cards N-up on a chosen page format
The system SHALL lay out rendered cards in a grid on page(s) sized for either A4 or US Letter, as selected by the user, filling as many cards per page as fit at the current card scale before starting a new page.

#### Scenario: Deck larger than one page
- **WHEN** the number of rendered cards exceeds how many fit on a single page at the current scale
- **THEN** the system distributes the cards across multiple pages, filling each page before starting the next

#### Scenario: Letter format selected
- **WHEN** the user selects US Letter as the page format
- **THEN** the system lays out and sizes pages according to US Letter dimensions instead of A4

### Requirement: Configurable spacing between cards
The system SHALL render a default gap between adjacent cards on a page, and SHALL remove that gap when the user enables the no-card-space option.

#### Scenario: No-card-space enabled
- **WHEN** the user enables the no-card-space option
- **THEN** the system lays out cards on the page with no gap between adjacent cards

### Requirement: Generate a print-accurate PDF
The system SHALL generate a downloadable PDF in which each card image is placed at the standard physical card size (63mm x 88mm, adjusted proportionally when the small-size option is selected) so that printing the PDF at 100% scale produces correctly sized cards.

#### Scenario: Download at default settings
- **WHEN** the user requests the PDF for a resolved, rendered decklist
- **THEN** the system produces a downloadable PDF file containing every rendered card, sized per the standard physical card dimensions

### Requirement: Include cut guides and print-scale guidance
The system SHALL include crop marks around each card in the generated PDF and SHALL present guidance to the user to print the PDF at 100% scale (not "fit to page"), so that printed card sizes match the intended physical dimensions despite browser/OS print-scaling defaults.

#### Scenario: PDF generated
- **WHEN** the system generates a PDF for download
- **THEN** the PDF includes crop marks around each card and the app displays instructions to print at 100% scale
