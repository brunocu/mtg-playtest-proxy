## Why

bwproxy (https://github.com/a11ce/bwproxy) generates print-ready grayscale MTG proxy card PDFs from a decklist, but it's a Python CLI: it requires a local Python environment, package installs, and command-line flags, which is friction for casual playtesting use. Porting it to a static web app removes the install step entirely — paste a decklist, configure options in a UI, download a PDF — while keeping the same underlying capability set (Scryfall-backed rendering, configurable layout options, print-accurate output).

## What Changes

- New static, client-side-only web app (no backend/server) that reproduces bwproxy's full CLI option surface as UI controls except set icon handling: page format (A4/Letter), colored borders by mana identity, text-vs-symbol mana rendering, small/full card scale, card spacing, full-art basic lands, ignoring basic lands, and alternative frames for DFC/split cards. Set/rarity icons and custom icon replacement are out of scope entirely.
- Card data (names, mana costs, oracle text, type lines) and card art are fetched live from the Scryfall API client-side (confirmed CORS-enabled) rather than bundled, matching Scryfall's Fan Content Policy terms and avoiding the asset-bundling issue that drew a cease-and-desist against a comparable tool (CardConjurer). Set and rarity information is not required and is not fetched or displayed.
- Mana symbols are bundled from the MIT-licensed Mana project (with attribution), replacing bwproxy's approach.
- Card name/oracle-text fonts are replaced with open-license alternatives; bwproxy's bundled `matrixb.ttf` and `MPLANTIN.ttf` are not redistributable (Matrix Bold is personal-use-only, MPlantin is proprietary Monotype type) and will not be carried over.
- Card rendering moves from server-side PIL image composition to client-side Canvas/SVG rendering in the browser.
- PDF assembly moves from Python-side PDF writing to client-side generation via jsPDF, with crop marks and explicit "print at 100% scale" guidance in the UI to mitigate browser print-scaling inconsistency.
- Decklist parsing (quantity + card name formats, flavor names) is reimplemented in the browser instead of Python regex parsing.

## Capabilities

### New Capabilities
- `decklist-parsing`: Parsing pasted decklist text into structured entries (quantity, card name, optional flavor name), supporting the same input formats bwproxy accepts.
- `card-data-lookup`: Resolving decklist entries against the Scryfall API client-side (fuzzy name matching for cards, type-based search for tokens/emblems), with caching and graceful handling of unresolved entries. Does not fetch set or rarity information.
- `proxy-card-rendering`: Rendering a single proxy card face in-browser (frame, title line with mana cost symbols, type line, oracle text with shrink-to-fit sizing, power/toughness, mana-color border coloring, alternative frames for double-faced/split cards, full-art basic lands) according to configured options. Displays no set, rarity, or custom icon of any kind.
- `print-sheet-export`: Laying out rendered cards N-up onto page(s) sized for A4 or Letter with configurable spacing/scale, and generating a downloadable, print-accurate PDF with crop marks.

### Modified Capabilities
(none — this is a new project with no existing specs)

## Impact

- New static web app codebase (HTML/CSS/TypeScript or similar), deployable to any static host (e.g. GitHub Pages) — this *is* the mtg-playtest project.
- Runtime dependency on the Scryfall API (client-side fetch, no server-side proxy needed).
- New dependency: jsPDF (client-side PDF generation).
- Bundled assets: Mana project MIT-licensed mana symbol font/icons (with attribution), open-license replacement fonts for card text.
- No bundled WotC-copyrighted imagery (card frames beyond what's drawn programmatically, card art) — any such imagery used is fetched live from Scryfall at render time. Set and rarity icons are out of scope entirely; the app neither fetches nor displays them.
- No server-side component, no user accounts, no persistence beyond client-side caching (e.g. IndexedDB/localStorage) of Scryfall lookups.
