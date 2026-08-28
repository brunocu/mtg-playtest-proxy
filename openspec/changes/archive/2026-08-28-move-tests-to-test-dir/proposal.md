## Why

All 11 TypeScript test files currently sit flat inside `src/lib/`, interleaved with the content files they test (e.g. `card-colors.ts` next to `card-colors.test.ts`). This makes the directory harder to scan and blurs the line between implementation and test code as the project grows.

## What Changes

- Move all `src/lib/*.test.ts` files into a new `src/lib/__tests__/` directory.
- Update relative imports inside each moved test file (`./foo` → `../foo`) to continue resolving to their corresponding source modules.
- No test runner configuration changes are needed: `vitest run` (via `npm test`) discovers `*.test.ts` files recursively by default, so it will pick up the new location without config edits.
- No production code, public APIs, or test behavior change — this is a pure file-organization refactor.

## Capabilities

No spec-level behavior changes; this change sets `skip_specs: true` in `.openspec.yaml`.

## Impact

- Affected files: the 11 files in `src/lib/*.test.ts` (moved to `src/lib/__tests__/`) and their internal relative import paths.
- No changes to `package.json`, `vite.config.ts`, or `tsconfig.json`.
- No changes to production source files themselves (only how tests import them).
