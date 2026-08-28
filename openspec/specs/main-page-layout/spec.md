# main-page-layout Specification

## Purpose

Presents the app as a single fixed-height desktop screen with no page-level scrolling, while remaining a normal scrolling stacked layout on narrow/mobile viewports.

## Requirements

### Requirement: Fit the entire page within the viewport on desktop
The system SHALL fit all page content within the viewport height on a desktop-width viewport, without a page-level vertical scrollbar.

#### Scenario: Desktop viewport on load
- **WHEN** the page loads in a desktop-width viewport
- **THEN** all page content fits within the viewport height and no vertical scrollbar appears on the page

#### Scenario: Content overflow is contained to its own panel
- **WHEN** content inside the decklist textarea exceeds its visible area
- **THEN** only the textarea scrolls internally, and the surrounding page does not scroll

### Requirement: Two-column desktop layout
The system SHALL arrange the decklist textarea and the options/action controls into two columns on a desktop-width viewport, with the decklist textarea filling the remaining vertical space.

#### Scenario: Desktop layout arrangement
- **WHEN** the page is viewed on a desktop-width viewport
- **THEN** the decklist textarea appears in one column filling the remaining vertical space, and the rendering options, print options, guidance text, and generate action appear stacked in the other column

### Requirement: Stacked layout on narrow viewports
The system SHALL revert to a single stacked column, scrollable as needed, on narrow/mobile-width viewports.

#### Scenario: Narrow viewport
- **WHEN** the page is viewed on a narrow/mobile-width viewport
- **THEN** the layout is a single stacked column and the page may scroll vertically as needed

### Requirement: Condensed, attributed footer
The system SHALL show a condensed footer linking to the project's full attribution document on GitHub, the project's own license, and the project's GitHub repository.

#### Scenario: Footer content
- **WHEN** the footer is displayed
- **THEN** it shows condensed attribution text linking to `ATTRIBUTIONS.md` on GitHub for full detail, the project's own license, and a link back to the project's GitHub repository
