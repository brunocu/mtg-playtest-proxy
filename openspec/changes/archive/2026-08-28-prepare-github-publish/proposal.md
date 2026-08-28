## Why

The project is currently named after its inspiration (`bwproxy`) and has no public-facing repo documentation. Before publishing on GitHub it needs a clear project identity and the standard docs contributors and users expect (README, license, contribution guide), plus a fix to an existing attribution inaccuracy.

## What Changes

- Rename the project from `bwproxy`/`mtg-playtest` to **`mtg-playtest-proxy`** (the slug used for `package.json`'s `name` field and the GitHub repo) with **"MTG Playtest Proxy"** as the human-readable display name used in `index.html`'s `<title>` and any on-page header.
- Add `"license": "MIT"` to `package.json`.
- Add a root `LICENSE` file with the MIT license text.
- Add a root `README.md` covering: what the tool is, an unofficial Fan Content / not-affiliated-with-Wizards disclaimer, a quick start (dev server + build), the feature set (B&W vs. colored borders, page formats, full-art lands, etc.), and links to `CONTRIBUTING.md`, `LICENSE`, and `ATTRIBUTIONS.md`.
- Add a root `CONTRIBUTING.md` covering dev setup, the test command, PR expectations, and a note that this is a small hobby tool not seeking large scope expansion.
- Fix `ATTRIBUTIONS.md`: it currently implies both bundled fonts (Lora, Roboto Slab) are OFL-licensed; `@fontsource/roboto-slab`'s `package.json` declares `Apache-2.0`, not OFL. Correct the license attributed to Roboto Slab.

No CI badges, issue templates, or CODE_OF_CONDUCT.md — scope is intentionally minimal per explicit user preference.

## Capabilities

### New Capabilities

None — this change adds repository documentation and metadata only; it does not add, modify, or remove any application behavior or requirement.

### Modified Capabilities

None.

## Impact

- **Affected files**: `package.json`, `index.html`, `ATTRIBUTIONS.md` (edited); `README.md`, `LICENSE`, `CONTRIBUTING.md` (new).
- **No source code, build, or runtime behavior changes.**
- **External surface**: the npm package name and any published GitHub repo name/description should align with `mtg-playtest-proxy` (repo creation/renaming itself is an out-of-band GitHub action, not a file change, and is not part of this change's task list).
