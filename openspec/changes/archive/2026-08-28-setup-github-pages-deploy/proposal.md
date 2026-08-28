## Why

The project has no git repository, no GitHub remote, and no build/deploy pipeline. To publish the app on GitHub Pages, the repo needs to exist, the Vite build needs to produce correct asset paths for a project-page URL, and a workflow needs to build and deploy `dist/` on every push.

## What Changes

- Initialize a git repository in the project and make an initial commit.
- Create the `mtg-playtest-proxy` GitHub repository (owner-provided) and wire it up as the `origin` remote; push the initial commit.
- Update `vite.config.ts` so `base` is `/mtg-playtest-proxy/` for production builds only, leaving `npm run dev` / `npm run preview` serving from `/` unchanged.
- Add a `.github/workflows/deploy.yml` GitHub Actions workflow that, on push to the default branch, installs dependencies, runs `npm run build`, and deploys `dist/` via `actions/upload-pages-artifact` + `actions/deploy-pages`.
- Document the one manual step that can't be scripted: switching the repo's Pages source to "GitHub Actions" in repository settings after the first push.

## Capabilities

No app-facing capability changes. This is deployment/build tooling only (`skip_specs: true`).

## Impact

- New files: `.github/workflows/deploy.yml`, `.git/` (repo init).
- Modified files: `vite.config.ts`.
- New GitHub remote/repo: `mtg-playtest-proxy` (created by the user, connected by Claude).
- Deployed URL: `https://<username>.github.io/mtg-playtest-proxy/`.
- No changes to application source under `src/`.
