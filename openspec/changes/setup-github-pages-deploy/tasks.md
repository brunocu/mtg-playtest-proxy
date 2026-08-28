## 1. Local repository setup

- [x] 1.1 Run `git init` in the project root and verify `git status` shows a new repo with the existing working tree as untracked/uncommitted
- [ ] 1.2 Review `.gitignore` covers `node_modules`, `dist`, and local artifacts before staging, then create the initial commit and verify `git log` shows one commit containing the expected tracked files (no `node_modules`, no `dist`)

## 2. Connect to GitHub remote

- [ ] 2.1 Get the `mtg-playtest-proxy` GitHub repo URL from the user (repo created by them via GitHub UI)
- [ ] 2.2 Add it as `origin` and push the initial commit to the default branch, verifying the push succeeds and the branch appears on GitHub

## 3. Build configuration for GitHub Pages

- [ ] 3.1 Update `vite.config.ts` to set `base: '/mtg-playtest-proxy/'` only when `command === 'build'`, leaving dev/preview at `/`, and verify `npm run dev` still serves at `http://localhost:5173/` unchanged
- [ ] 3.2 Run `npm run build` and verify `dist/index.html` now references `/mtg-playtest-proxy/assets/...` and `/mtg-playtest-proxy/favicon.svg` paths instead of root-absolute paths

## 4. GitHub Actions deploy workflow

- [ ] 4.1 Add `.github/workflows/deploy.yml` triggered on push to the default branch, with `permissions: pages: write, id-token: write, contents: read` and a `concurrency` group for the `pages` environment
- [ ] 4.2 In the workflow: checkout, setup Node (matching an LTS version), `npm ci`, `npm run build`, then `actions/upload-pages-artifact` pointing at `dist/` followed by `actions/deploy-pages`
- [ ] 4.3 Commit and push the workflow + `vite.config.ts` change, then verify the Actions run appears on GitHub and completes successfully (build job and deploy job both green)

## 5. Manual Pages activation and verification

- [ ] 5.1 Instruct the user to set repo Settings -> Pages -> Source -> "GitHub Actions" (one-time manual step)
- [ ] 5.2 Verify the deployed site loads correctly at `https://<username>.github.io/mtg-playtest-proxy/` with no 404s in the browser console for assets, fonts, or the favicon
