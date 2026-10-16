# ChessgroundX upstream synchronization plan

Status: **Planning — no upstream code merged**  
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

## Phase 0 — Test infrastructure, without functional changes

**Decision:** Adopt *the useful upstream testing approach* first: TypeScript
Vitest tests, jsdom, modern supported Node versions, and a reliable CI test
job. **Defer** the full TypeScript 7 / pnpm / esbuild / oxlint / oxfmt migration
until regression coverage is established. Updating all tooling up front adds
churn and may break the published package format before compatibility is
measured. Vitest 4 requires an adequately recent Node; use Node 22.12+ or 24+
for the test environment (verify exact resolved dependency engine constraints).

- [ ] Record the exact baseline commit, `node --version`, package-manager
      version, dependency lockfile, and currently passing build/test commands.
- [ ] Select and pin a current supported Node version for local testing and CI;
      retire legacy Node 14/16 CI jobs for the new runner.
- [ ] Add Vitest + jsdom and a deterministic lockfile with no library-runtime
      changes; keep the existing build/published exports intact.
- [ ] Port the existing four Mocha cases to TypeScript Vitest, preserving
      assertions; remove duplicate legacy tests only after the port passes.
- [ ] Add `test`, `test:watch`, and appropriate typecheck scripts; make the
      test process fail on assertion errors, unhandled rejections, and empty
      test discovery.
- [ ] Update CI to run install, typecheck, lint (existing tooling initially),
      unit tests, and build in separate steps; keep the security job working.
- [ ] Establish a clean headless jsdom test harness (DOM cleanup between tests,
      deterministic animation/frame scheduling, mocked geometry when needed).
- [ ] Confirm package entry points and generated declarations remain compatible
      with the PyChess consumer; document intentional environment requirements.

**Gate 0:** A CI-verified tooling-only change with all existing tests passing,
no intentional library behavior or API differences, and equivalent package
artifacts/exports. If Vitest migration has difficult compatibility issues,
retain Mocha temporarily and **still proceed with regression tests**; do not
let tooling block the main goal.

## Phase 1 — Build the ChessgroundX regression safety net

Prioritize pure behavior and edge cases first, then DOM interactions, then
PyChess compatibility. Use table-driven tests per variant/geometry wherever
possible. Avoid fragile snapshots of entire DOM trees or SVG strings; assert
semantic behavior, classes, coordinates, events, and stable attributes instead.

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
