# ChessgroundX upstream synchronization plan

Status: **Phase 0 merged (CI green); Phase 1 regression suite in progress; no upstream functional code merged**
Last reviewed: 2026-10-16  
Fork: <https://github.com/gbtami/chessgroundx>  
Upstream: <https://github.com/lichess-org/chessground>

## Goal and rules

Synchronize ChessgroundX with modern Lichess Chessground while preserving all
ChessgroundX features and compatibility with the PyChess client. Prefer a real
Git merge preserving ancestry over wholesale file replacement, unless a trial
merge establishes a compelling reason to take another approach.

**Non-negotiable rules**

1. **Before merging any upstream source changes, establish a substantial,
   passing regression suite against the existing ChessgroundX implementation.**
2. Define expected behavior from ChessgroundX's current documented contracts
   and PyChess call sites, **not from upstream's behavior**. Fix ambiguous
   behavior/specification before declaring a test authoritative.
3. Do not change public APIs, the npm package's published entry points, CSS
   class conventions, FEN conventions, coordinate encoding, or supported
   variants incidentally during the synchronization.
4. Separate testing/tooling changes, functional merge changes, and intentional
   behavior changes into reviewable commits or PRs.
5. Keep a known-good baseline (tag or commit) and work in feature branches.
6. Never test against the production pychess.org service. All automated
   integration tests must use local fixtures, mocks, or local test servers.
7. Record upstream commits, conflict resolutions, test results, and deferred
   changes in this document as work proceeds. A checked box requires evidence.

## Snapshot and starting evidence

Based on the source ZIP snapshots supplied on 2026-10-16; these snapshots do
not include `.git` histories, so the last common ancestor, ahead/behind commit
counts, and actual Git conflict counts are **not yet established**.

| Item | ChessgroundX snapshot | Upstream snapshot |
| --- | --- | --- |
| `package.json` version | `10.7.5` | `10.4.2` |
| Test runner | Mocha + Chai + jsdom-global | Vitest + jsdom |
| Existing test files | `tests/premove.spec.js` (4 cases) | `tests/fen.test.ts`, `tests/premove.test.ts` |
| TypeScript | `^4` | `^7.0.2` |
| Node CI | 14, 16 | 22, 24, 26 |
| Bundler | Rollup | esbuild |
| Lint/format | ESLint + Prettier | oxlint + oxfmt |
| Package manager | Yarn workflows | pnpm 12 |

The version numbers are independently maintained and do **not** establish the
relative freshness of the implementations. The fork has substantial changes
in geometry, roles, FEN, board interaction, pockets, SVG, and premoves.

## Phase 0 — Adopt upstream build and test tooling before regression coverage

### Decision and state (2026-10-16)

**Status: tooling migration merged with green GitHub Actions (maintainer report, 2026-10-16). PyChess consumer compatibility not yet independently verified.**

The earlier hybrid Vitest 3 / TypeScript 4 / Rollup / Yarn migration was
applied locally and passed 4 premove tests, lint, and Rollup bundle, but
`compile` and `typecheck` failed in `@types/chai` dependency declarations.
This replacement patch is **relative to the already-applied hybrid patch**.
It migrates the development stack to the uploaded Lichess Chessground baseline:
Node 24, pnpm 12, TypeScript 7, Vitest 4, jsdom 30, esbuild, oxlint, oxfmt.

**Compatibility exception:** Keep `chessgroundx` metadata, existing root
`*.js`/`*.d.ts` compile outputs, `module`/`typings` entries, and the historical
`dist/chessground.js` + `.min.js` IIFE bundles exposing callable global
`Chessground`. Upstream's ESM packaging is *not* silently adopted. Do not
format all `src/` files during Phase 0.

- [x] Preserve existing four Vitest premove tests and DOM setup.
- [x] Replace Yarn/Rollup/ESLint/Prettier with pnpm/esbuild/oxlint/oxfmt configuration.
- [x] Preserve the browser-global bundle contract in the new esbuild script.
- [x] Switch CI to Node 24 and pnpm 12 with isolated test/build checks.
- [x] Install pnpm 12.10.0 with Node 24 and commit generated `pnpm-lock.yaml` (maintainer report).
- [x] Run `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run dist`, and `pnpm pack` (lint has three pre-existing non-fatal warnings).
- [ ] Check JS/TS artifacts and test the `Chessground` global with a browser DOM, and verify use by the PyChess client.
- [x] Confirm CI / CodeQL pass (maintainer reported merged green PR).
- [ ] Record baseline and final commits, tool versions, lockfile and test evidence below.

### Phase 0 evidence log

| Check | Result / commit |
| --- | --- |
| Earlier hybrid `yarn test` | 4/4 passed (reported by maintainer, 2026-10-16) |
| Earlier hybrid `yarn lint`, `yarn dist` | Passed (reported by maintainer) |
| Earlier hybrid `yarn typecheck`, `yarn compile` | Failed in `@types/chai` (reported by maintainer) |
| Node 24 + pnpm 12 install / lockfile | Passed locally, merged PR (maintainer report) |
| TypeScript 7 / Vitest 4 / oxlint / esbuild | Green local checks + GitHub Actions (maintainer report) |
| PyChess consumer compatibility | Pending |
| Baseline and final commits | Pending |

**Gate 0:** successful frozen-lockfile install, typecheck, lint, existing tests,
bundling, package inspection, and PyChess compatibility verification. Proceed
to Phase 1 only after the gate is satisfied.

## Phase 1 — Build the ChessgroundX regression safety net

Prioritize pure behavior and edge cases first, then DOM interactions, then
PyChess compatibility. Use table-driven tests per variant/geometry wherever
possible. Avoid fragile snapshots of entire DOM trees or SVG strings; assert
semantic behavior, classes, coordinates, events, and stable attributes instead.

### Phase 1 baseline batch — 2026-10-16

- [x] Add `geometry-roles.test.ts`: encoded 10–16 ranks, board key sets, orientation transforms, letter/promoted roles, ally/enemy CSS, drop-orig ambiguity.
- [x] Add `fen-variants.test.ts`: 16×16 empty runs, Shogi `+` promotions, `~` promotions, mirror flags, counted pockets, full-FEN three-check counters.
- [x] Add `predrop-variants.test.ts`: house variants, Shogi rank restrictions, placement home ranks, occupied friendly squares, grandhouse restrictions.
- [x] Add `board-variants.test.ts`: headless capture, configurable king roles, Capablanca castling, inventory-consuming drops, rank-16 moves, state updates.
- [x] Verify first batch offline using uploaded wheelhouse: **40 tests in 5 files passed**; typecheck, lint (3 existing warnings), and formatting check passed.
- [ ] Add DOM-level tests for `Chessground` public API, mini-board pockets, SVG annotations, event timing, coordinates/rendering, orientation, and teardown.
- [x] Add `premove-matrix.test.ts`: 23 role/variant mobility scenarios across Chess, Capablanca, Seirawan, Ataxx, Xiangqi, Janggi, Shogi, Kyoto Shogi, Dobutsu, Makruk, and unknown roles.
- [x] Add `callback-regressions.test.ts`: 5 asynchronous move/capture/drop callback cases, order, rejection, and inventory accounting.
- [x] Verify the expanded suite offline: **78 tests in 8 files passed**; TS7 typecheck, new-file oxlint and oxfmt checks passed.
- [ ] Expand further variant premove and predrop cases, custom function injection, user-input/drag interactions and PyChess-local integration tests before attempting upstream merge.

This batch provides **partial coverage**, not completion of Gate 1. Test expectations are based on current ChessgroundX behavior. No source implementation changed.

### 1A. Geometry, coordinates, FEN, and roles — **P0**

- [ ] Default 8×8 and rectangular dimensions: 5×5, 9×9, 9×10, 10×8, 12×12,
      16×16; boundary files/ranks and orientation flips.
- [ ] All square/key helpers and round trips; especially rank 16 encoding,
      where `@` can occur in square notation.
- [ ] FEN parse/write round trips: multi-digit empty runs, promoted Shogi
      pieces (`+` prefix), pockets, turn and metadata as supported, and
      malformed-input handling; verify exact public parser contracts.
- [ ] Role mapping (e.g. `p-piece`, custom letters, promoted `pr-piece`),
      `ally`/`enemy` orientation styling, and color-dependent images/classes.
- [ ] Full-FEN-only three-check counters (`black+white` Fairy format, e.g.
      `3+2`); placement-only and non-FEN API calls must not silently recompute
      them. `set({ fen: fullFen })` must refresh them.

### 1B. Board moves, callbacks, and public API — **P0**

- [ ] Initialization, `set`, `getFen`, `move`, `newPiece`, `setPieces`, and
      destroy/recreate behavior, including documented callback order.
- [ ] Standard moves, captures, check markers for configurable `kingRoles`,
      turn updates, visibility/hidden pieces, last-move highlights, and
      orientation changes.
- [ ] Chess960 castling (including nonstandard rook/king origins); regression
      fixtures for variant-dependent castling and drop-related moves.
- [ ] `move('R@', 'c2')` pocket drop vs lowercase `a@` as an ordinary square on
      rank 16; verify ambiguous-looking origins are never conflated.
- [ ] Contract and type-level tests for public API/config entry points used by
      PyChess; preserve existing consumption/import behavior.

### 1C. Pockets, drops, and premoves — **P0**

- [ ] Pocket FEN reading and state/render updates; both player colors, pocket
      role configuration, mini-board pockets, and orientation reversal.
- [ ] Successful and rejected drops: occupied/out-of-bounds destinations,
      absent pocket pieces, promotion/role edge cases, and callbacks.
- [ ] Premove and predrop cancellation/replacement, playable turn changes,
      highlighting, allowed destinations, and custom `premoveFunc`/
      `predropFunc` injection.
- [ ] Representative variant fixtures: orthodox chess and Chess960,
      Crazyhouse, Shogi/Mini Shogi, Xiangqi, Janggi, Capablanca-family 10×8,
      and at least one 16×16/custom-piece setup.
- [ ] Add focused cases for each variant-specific branch in `src/premove.ts`
      and `src/predrop.ts`; prefer parameterized examples with explicit
      expected destination sets (not simply "does not throw").

### 1D. Rendering, input, and annotations — **P1**

- [ ] Board DOM construction, coordinate labels (`notation`, including
      Xiangqi/Chinese, Kanji, Thai as supported), resize, rotation, and
      dimensions-specific CSS classes/layout.
- [ ] Piece selection, mouse dragging, touch handling, click-to-move,
      off-board release, and cleanup of event listeners.
- [ ] Promotion-related roles and CSS selectors; orientation-based Shogi
      presentation and pocket UI on miniature boards.
- [ ] Arrows, circles, shapes, SVG positions/scaling on 8×8, rectangular,
      and 16×16 boards; orientation and redraw behavior.
- [ ] Animations, piece explosions, and visual state after consecutive updates;
      prefer deterministic frame-clock mocks to arbitrary sleeps.
- [ ] Mini boards, no-interaction modes, accessibility/keyboard behavior where
      currently implemented; test actual baseline before setting expectations.

### 1E. PyChess integration contract — **P0 before merge**

- [ ] Inventory imports, interfaces, config fields, CSS dependencies, and
      ChessgroundX methods used by the current `pychess-variants` client.
- [ ] Create fixtures from representative PyChess use cases: lobby mini
      boards, live game boards, analysis, Study annotations, practice,
      board editor, user-defined variant previews, and drop variants.
- [ ] Add contract tests in ChessgroundX and/or a local PyChess integration
      harness; confirm resulting library can be consumed by its actual build.
- [ ] Verify **no test invokes the production site**. Use a locally built
      ChessgroundX artifact with the corresponding PyChess branch.

**Gate 1 (hard stop):** Every applicable P0 item has tests, fixtures, and passing
CI results. Record branch coverage for high-risk modules (`fen.ts`, `board.ts`,
`premove.ts`, `predrop.ts`, `pocket.ts`, `wrap.ts`, `render.ts`, `svg.ts`), along
with any remaining untested branches and their rationale. Coverage numbers are
diagnostics, not substitutes for functional test quality. P1 items should be
completed before integration sign-off even if some are added after the initial
trial merge. Keep bug fixes in separate commits and demonstrate that their
regression tests fail before the fix where feasible.

## Phase 2 — Determine Git ancestry and assess a disposable merge

**Start only after Gate 1.**

- [ ] Fetch both official remotes using Git; document the exact fork HEAD,
      upstream HEAD, and merge base (if any):

      ```sh
      git remote add upstream https://github.com/lichess-org/chessground.git
      git fetch upstream
      git merge-base HEAD upstream/master
      git rev-list --left-right --count HEAD...upstream/master
      ```

      Adjust the upstream default branch only if verified; do not assume
      `upstream/master` exists before fetching/listing refs.
- [ ] From a clean, disposable branch, try `git merge --no-commit --no-ff`
      against the recorded upstream SHA, capturing status and conflicts.
- [ ] Classify conflicts by subsystem: pure utilities, types/config, FEN,
      board/move logic, pockets/drops, premoves, DOM/render, SVG/draw,
      styling/assets, exports, tests, package/build/CI.
- [ ] Record upstream-only features and fixes worth importing; flag behavior
      changes that conflict with ChessgroundX semantics.
- [ ] Abort the trial merge and publish the conflict inventory and proposed
      resolution order before beginning the real integration.

**Gate 2:** Documented SHA targets, reproducible merge report, explicit list of
high-risk conflicts, and an agreed strategy. No release or production deploy.

## Phase 3 — Integrate upstream, preserving ancestry

- [ ] Create dedicated integration branch from the green, tested fork baseline.
- [ ] Merge the pinned upstream SHA with Git, preserving the merge parents.
- [ ] Resolve low-risk shared modules before geometry/FEN/roles.
- [ ] Resolve config/state/public API, then board/moves, pockets/drops,
      premoves, render/wrap/drag, and finally SVG/draw and CSS.
- [ ] Preserve ChessgroundX-specific behavior where upstream assumes 8×8,
      orthodox roles, or lacks custom drop/premove features.
- [ ] Review *automatically merged* hunks as carefully as manually conflicted
      ones; a clean Git merge is not a compatibility guarantee.
- [ ] Run typecheck, lint, tests, and build after every meaningful subsystem.
- [ ] Add a regression test for every discovered merge regression before
      correcting the implementation.
- [ ] Document features intentionally deferred or not adopted, with reason.

**Gate 3:** Test suites and local PyChess integration pass; no unreviewed
high-risk file changes; merge commit has appropriate fork/upstream parents.

## Phase 4 — Integration verification and optional toolchain convergence

- [ ] Test representative variants and all supported board shapes manually in
      a local PyChess deployment, including Study and Practice annotations.
- [ ] Verify package publish output, imports, type declarations, minified and
      unminified builds, CSS classes, and performance on large boards.
- [ ] Compare representative interaction/performance cases with pre-merge
      baseline; investigate significant regressions rather than relying on
      subjective inspection alone.
- [ ] **Only now** consider TypeScript 7, pnpm 12, esbuild, oxlint, and oxfmt
      in independent, reviewable changes. Confirm compatibility with PyChess
      and avoid gratuitous formatting churn during functional reviews.
- [ ] Update `README-X.md` with any new differences and document future
      upstream synchronization commands.
- [ ] Record final upstream merge SHA, CI/build/test results, known limitations,
      and release/deployment outcome.

**Gate 4:** PyChess integration accepted; all critical tests green; artifacts
verified; documentation and change log complete.

## Progress ledger

| Date | Phase | Status | Commit / PR / evidence | Notes |
| --- | --- | --- | --- | --- |
| 2026-10-16 | Planning | Document drafted | ZIP snapshot comparison | No Git history available in archives; no upstream merge attempted |
| 2026-10-16 | Phase 0 | Merged; GitHub CI green | Maintainer report | pnpm 12.10.0, TS7, Vitest4, esbuild, oxlint, oxfmt |
| 2026-10-16 | Phase 1 baseline | 40/40 offline tests passing | New test files in this patch | Geometry, FEN, roles, drops, and headless board; DOM/API coverage pending |
| 2026-10-16 | Phase 1 DOM/API | 50/50 offline tests passing | `tests/dom-api-variants.test.ts` | 16x16 DOM, notation, pockets, orientation, CSS vars, full-FEN counters, drop API, annotations, callbacks, destruction; broader interaction testing pending |
| 2026-10-16 | Phase 1 premoves/callbacks | 78/78 offline tests passing | `tests/premove-matrix.test.ts`, `tests/callback-regressions.test.ts` | Variant premoves and deferred board event contracts; interaction coverage pending |
| 2026-10-16 | Phase 1 interaction extensions | 90/90 offline tests passing | `tests/interaction-extensions.test.ts` | Injected premove/predrop destinations, SVG drawing state and toggle semantics, view-only and context-menu safeguards. Full browser mouse/touch gestures and PyChess integration still pending |
| 2026-10-16 | Phase 1 DOM gestures | 97/97 offline tests passing | `tests/gesture-regressions.test.ts` | Actual right-button and modified drawing DOM events, document movement/end, touch safeguards, 10x10 mini-board pocket counts and orientation. jsdom cannot simulate trusted native piece dragging; real-browser/PyChess checks remain pending |
| 2026-10-16 | Phase 1 SVG rendering | 104/104 offline tests passing | `tests/svg-render-regressions.test.ts` | Seven SVG geometry, layers, brush definitions, and caching tests. Public API orientation redraw verified separately; direct renderer cache test was an incomplete lifecycle simulation |
| 2026-10-16 | Phase 1 SVG API orientation | 106/106 offline tests passing | `tests/svg-orientation-api.test.ts` | Both `toggleOrientation()` and `set({ orientation })` reposition existing arrows and restore their coordinates when flipped back, with realistic jsdom bounds; no PyChess workaround or production fix needed |

| 2026-10-16 | Phase 1 public API contracts | 114/114 offline tests passing | `tests/public-contract-extra.test.ts` | Eight standalone API regression cases: callable surface, partial setPieces/FEN, destination replacement, lastMove reset/drop, pocket deltas, selection, configurable check markers. Real PyChess consumer build remains pending |

### PyChess consumer inventory — 2026-10-16

Inspected `pychess-variants` client imports from the uploaded source ZIP. The
consumer imports the root package plus `types`, `util`, `fen`, `api`, `draw`,
`render`, `premove`, `predrop`, `chessground`, and `config` subpaths. Its runtime
uses custom movement functions, separate dimensions CSS variables for linked
boards, Alice mirror flags, pocket roles, and Study manual/automatic shapes.

- [x] Add eight standalone library contract tests grounded in those call sites
      (`tests/pychess-consumer-contracts.test.ts`); **122/122 tests green**.
- [x] Resolve root named/default export concern with a local package consumer
      smoke test. The package `module` entry points to `chessground.js`
      (named `Chessground` export); `index.js` separately provides the default
      export. Esbuild successfully bundles actual PyChess-style root and
      subpath imports. No source API change required.
- [x] Build the uploaded PyChess client in development and production mode using
      locally compiled ChessgroundX in its installed dependency location.
      Both esbuild commands completed successfully in the sandbox
      (2026-10-16). These are **bundling checks**, not end-to-end runtime tests.
- [x] Add `scripts/check-pychess-consumer.mjs` as a repeatable standalone
      import smoke check, run by Node.js CI after `dist`.
- [x] Complete the full PyChess TypeScript validation against the locally built
      package. Using the uploaded PyChess JavaScript wheelhouse and the
      locally compiled ChessgroundX package, the native TypeScript checker
      passed with zero diagnostics on 473 files (44.24 s, ~325 MB), using
      `--noEmit --incremental false`. No runtime source was modified.
- [ ] Verify representative runtime interactions in a local browser, including
      drag/drop and Study annotations. Do not contact production pychess.org.

| 2026-10-16 | Phase 1 local PyChess bundling | Development and production esbuild passed | Local uploaded PyChess client with compiled ChessgroundX | Named/subpath imports work; full TS check and browser interactions pending |
| 2026-10-16 | Phase 1 full TS attempt | Previously inconclusive | Offline PyChess JS wheelhouse + locally compiled ChessgroundX | Superseded by successful non-incremental typecheck below |
| 2026-10-16 | Phase 1 full TS check | **Passed: 0 errors, 473 files, 44.24 seconds** | Local PyChess client with compiled ChessgroundX | `tsc --noEmit --incremental false --extendedDiagnostics`; 325 MB used; real-browser interactions remain pending |
| 2026-10-16 | Phase 1 drag completion | **128/128 tests passing (15 files)** | `tests/drag-completion.test.ts` | Six jsdom regression cases for mouseup move completion, off-board behavior, optional delete-on-drop-off, temporary pocket drag cancellation, accepted and occupied-square rejected pocket drops; trusted browser drag initiation remains unverified |

### Merge issue log

Add entries as they are discovered:

| File or subsystem | Upstream change/SHA | Risk | Resolution | Regression test | Status |
| --- | --- | --- | --- | --- | --- |
| _Pending Git trial merge_ | — | — | — | — | Not started |

### Exit checklist

- [ ] Baseline and final upstream SHAs recorded
- [ ] Existing ChessgroundX features covered by tests and preserved
- [ ] No production-network calls by tests
- [ ] Library tests, typecheck, lint, packaging/build all pass
- [ ] PyChess client compatibility verified against locally built artifact
- [ ] README-X and progress ledger updated
