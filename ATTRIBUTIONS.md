# Third-Party Assets & Attribution

This app bundles the following third-party assets at build time (via npm
dependencies, imported into the Vite build). Full license text for each is
included in its own npm package under `node_modules/<package>/LICENSE` (or
`README.md` where the project has no separate LICENSE file), and is also
summarized below.

## Mana symbol icons (`mana-font`)

- Project: [Mana](https://github.com/andrewgioia/mana) by Andrew Gioia
- Used for: rendering MTG mana cost symbols as icons
- License (mixed, per the project's own README):
  - The Mana **font** (glyphs) is licensed under the **SIL Open Font License 1.1** (http://scripts.sil.org/OFL)
  - The Mana **CSS/LESS/Sass** source is licensed under the **MIT License**
  - The underlying symbol imagery is copyright Wizards of the Coast, used here consistent with Wizards' Fan Content Policy (see below)

## Card fonts

- **Roboto Slab** (card titles): licensed under the **Apache License 2.0**
- **Lora** (type line & body text): licensed under the **SIL Open Font License 1.1**

Both are distributed via [Fontsource](https://fontsource.org/), which repackages the original Google Fonts releases unmodified; each package includes its own `LICENSE` file.

## Inspiration

This project is a web port of [bwproxy](https://github.com/a11ce/bwproxy). This app reproduces most of its option surface as a browser UI (no local Python/install required) and replaces its bundled fonts and mana glyphs with openly-licensed alternatives (see above); no code from bwproxy is reused directly.

## Scryfall / Wizards of the Coast Fan Content Policy

Card data is sourced from [Scryfall](https://scryfall.com) and is copyright of Wizards of the Coast. This app is unofficial Fan Content under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
