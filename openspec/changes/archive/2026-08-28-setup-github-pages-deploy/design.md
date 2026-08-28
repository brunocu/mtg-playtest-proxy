## Context

No git repository, no GitHub remote, and no CI exist in this project yet (see proposal.md - Why). The app is a static Vite + Vue 3 SPA with no router and no server-side dependencies — all API calls (Scryfall) happen client-side and are CORS-friendly, so a purely static host is sufficient. `vite.config.ts` currently has no `base` set, so the existing `dist/` build emits root-absolute asset paths (`/assets/...`), which is correct for a custom domain or `<user>.github.io` root page but wrong for a project page.

The user will create the `mtg-playtest-proxy` repository on GitHub and provide the remote URL; repo creation itself (via GitHub UI) is out of scope for Claude to perform.

## Goals / Non-Goals

**Goals:**
- Get `git init` + first commit done locally, then push to the user-provided remote.
- Make production builds resolve correctly at `https://<username>.github.io/mtg-playtest-proxy/` without breaking local dev/preview.
- Automate build + deploy via GitHub Actions on push to the default branch, using the official `actions/upload-pages-artifact` + `actions/deploy-pages` flow (no `gh-pages` branch, no third-party action, no stored deploy tokens — these actions use the built-in `GITHUB_TOKEN` and OIDC-based Pages deployment).

**Non-Goals:**
- Custom domain / CNAME setup.
- Preview deployments for pull requests.
- Changing any application behavior under `src/`.
- Automating the one manual GitHub UI step (setting Pages source to "GitHub Actions") — GitHub does not expose this via an API call suitable for a first-time setup without additional auth scopes, so it's called out as a manual step instead.

## Decisions

- **Conditional `base` in `vite.config.ts`, not a static value.** Use the function form of `defineConfig(({ command }) => ({ base: command === 'build' ? '/mtg-playtest-proxy/' : '/' }))`. A static `base: '/mtg-playtest-proxy/'` would also change the dev server's serving path (`localhost:5173/mtg-playtest-proxy/`), which is an unwanted behavior change to local dev. Conditioning on `command` keeps `npm run dev` / `npm run preview` untouched.
- **GitHub Actions official Pages flow over a `gh-pages` branch.** `actions/upload-pages-artifact` + `actions/deploy-pages` is the current GitHub-recommended approach: no extra branch to manage, no `gh-pages` npm dependency, deployment permissions scoped via `permissions: pages: write, id-token: write` rather than a personal access token. Trade-off: requires the one-time manual switch of the repo's Pages source to "GitHub Actions" in Settings, since a brand-new repo defaults to no configured Pages source.
- **Build with `npm run build`** (already runs `vue-tsc && vite build` per package.json) rather than calling `vite build` directly in the workflow, so type-checking gates the deploy exactly as it does for local/PR builds.
- **Trigger on push to the default branch only** (no PR preview deploys), matching the Non-Goals above and keeping the workflow minimal.

## Risks / Trade-offs

- [First deploy will 404 until the Pages source is manually switched to "GitHub Actions" in repo Settings] → Document this as an explicit post-push step; the workflow run will otherwise succeed but Pages won't serve anything.
- [Hardcoding `/mtg-playtest-proxy/` as the base path ties the build to this exact repo name] → Acceptable since the repo name is fixed per the proposal; renaming the repo later would require updating `vite.config.ts` to match.
- [`vue-tsc` type-check failures block deploys] → Desired behavior (matches CONTRIBUTING.md's "run build and test before PR" expectation); not treated as a risk to mitigate.

## Migration Plan

1. `git init`, initial commit of the existing working tree.
2. User creates the `mtg-playtest-proxy` GitHub repo and shares the remote URL.
3. Add remote, push initial commit to the default branch.
4. Edit `vite.config.ts` for conditional `base`.
5. Add `.github/workflows/deploy.yml`.
6. Commit and push the workflow + config change — this triggers the first Actions run.
7. User manually sets repo Settings → Pages → Source → "GitHub Actions".
8. Verify the deployed site loads at `https://<username>.github.io/mtg-playtest-proxy/`.

No rollback complexity: reverting is deleting the workflow file / repo, or just not merging.
