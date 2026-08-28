## 1. Rename the project

- [x] 1.1 Update `package.json` `name` to `mtg-playtest-proxy` and add `"license": "MIT"`; verify `npm run build` still succeeds
- [x] 1.2 Update `index.html` `<title>` from "bwproxy web" to "MTG Playtest Proxy" (readable display name, distinct from the `mtg-playtest-proxy` slug); verify by viewing page source or dev server tab title

## 2. Add license

- [x] 2.1 Add root `LICENSE` file with standard MIT license text, copyright line dated 2026 for the project author; verify file exists at repo root and matches the standard MIT template

## 3. Fix attribution accuracy

- [x] 3.1 In `ATTRIBUTIONS.md`, correct the font licensing section so Roboto Slab is attributed as Apache-2.0 (not OFL) while Lora remains OFL-1.1; verify against `node_modules/@fontsource/roboto-slab/package.json` and `node_modules/@fontsource/lora/package.json` `license` fields

## 4. Write README

- [x] 4.1 Draft `README.md` with: "MTG Playtest Proxy" as the title/one-line description (repo slug `mtg-playtest-proxy` used only for install/clone instructions), unofficial Fan Content / not affiliated with or endorsed by Wizards of the Coast disclaimer, quick start (`npm install`, `npm run dev`, `npm run build`), feature list (B&W vs. colored borders, page formats, full-art basic lands, ignore-lands, small/scale option), and links to `CONTRIBUTING.md`, `LICENSE`, and `ATTRIBUTIONS.md`; verify all internal links resolve to existing files

## 5. Write contributing guide

- [x] 5.1 Draft `CONTRIBUTING.md` covering dev setup (`npm install`, `npm run dev`), how to run tests (`npm test`), PR expectations, and a note that this is a small hobby project not actively seeking large scope expansions; verify it references the same commands as `package.json` scripts

## 6. Final check

- [x] 6.1 Run `npm run build` and `npm test` to confirm the rename and doc additions did not break anything; verify both commands exit successfully
