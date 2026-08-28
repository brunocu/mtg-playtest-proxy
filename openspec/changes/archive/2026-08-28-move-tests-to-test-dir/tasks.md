## 1. Move test files

- [x] 1.1 Create `src/lib/__tests__/` and move all 11 `src/lib/*.test.ts` files into it, verifying `find src/lib -maxdepth 1 -name '*.test.ts'` returns no results afterward
- [x] 1.2 Update each moved test file's relative imports (e.g. `./card-colors` → `../card-colors`) to resolve to their corresponding modules in `src/lib/`

## 2. Verify

- [x] 2.1 Run `npm test` and verify all previously-passing tests still pass with no changed test count
- [x] 2.2 Run `npm run build` (tsc) and verify it completes with no new type errors
