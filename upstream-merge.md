# ChessgroundX upstream synchronization plan

Status: **All batches and final independent review approved; two-parent upstream merge, feature-branch push and PR authorized. All 34 conflicts resolved. GitHub CI and PR-diff review required before any merge into master.**
Last reviewed: 2026-10-17

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

The ZIP-era uncertainty below is historical. Exact Git evidence, the Phase 3
resolution plan, batch decisions, and current verification scope are recorded
under **Phase 3 execution record** below.

Historical ZIP-only inventory (before local Git inspection on 2026-10-16):
these archives omitted `.git`. Ancestry and conflict counts were unknown at
that point; the verified local SHAs and 34-path inventory now appear in the
Phase 3 execution record. The tooling table describes those original snapshots,
not the current fork toolchain.

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

**Status: tooling migration merged with green GitHub Actions (maintainer report, 2026-10-16). Local artifact/import checks, consumer development/production builds, full PyChess typechecks and the two requested Study/Practice browser acceptance tests passed; final independent review/commit approval remain pending.**

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
- [x] Check JS/TS artifacts, callable `Chessground` global in Chromium, PyChess imports/builds and full consumer typecheck (Phase 1 and cumulative Phase 3 evidence).
- [x] Confirm CI / CodeQL pass (maintainer reported merged green PR).
- [x] Record fork/upstream/base SHAs and local tool/test evidence in Phase 3; final merge commit is intentionally pending approval.

### Phase 0 evidence log

| Check | Result / commit |
| --- | --- |
| Earlier hybrid `yarn test` | 4/4 passed (reported by maintainer, 2026-10-16) |
| Earlier hybrid `yarn lint`, `yarn dist` | Passed (reported by maintainer) |
| Earlier hybrid `yarn typecheck`, `yarn compile` | Failed in `@types/chai` (reported by maintainer) |
| Node 24 + pnpm 12 install / lockfile | Passed locally, merged PR (maintainer report) |
| TypeScript 7 / Vitest 4 / oxlint / esbuild | Green local checks + GitHub Actions (maintainer report) |
| PyChess consumer compatibility | Local imports/dev/prod builds/full TS and requested Study/Practice browser acceptance passed; see final verification dated 2026-10-17 |
| Pinned baseline/upstream/base | See verified Git evidence in Phase 3; final merge commit not authorized |

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

**Gate 1 (production integration):** Every applicable P0 item has tests, fixtures, and passing
CI results. Record branch coverage for integration-sensitive modules (`board.ts`,
`wrap.ts`, `render.ts`, `svg.ts`) and boundary tests for fork-owned modules,
along with any remaining untested branches and their rationale. Coverage numbers are
diagnostics, not substitutes for functional test quality. P1 items should be
completed before integration sign-off even if some are added after the initial
trial merge. Keep bug fixes in separate commits and demonstrate that their
regression tests fail before the fix where feasible.

### Phase 1 coverage audit — 2026-10-16

Based on `README-X.md`, the fork-specific config/API declarations and the 16
Vitest test files in the uploaded master snapshot. This is a **behavioral test
inventory**, not measured statement or branch coverage. Do not interpret the
number of tests as a percentage of implementation covered.

| Fork-specific contract / subsystem | Existing protection | Remaining gap / next action |
| --- | --- | --- |
| 16x16 square encoding, coordinates, orientations, letter and promoted roles | Geometry/roles, FEN, DOM and Chromium tests | More rectangular sizes (5x5, 9x9, 12x12), boundary click mapping, alternative coordinate scripts |
| FEN placement, `+`/`~` promotions, mirrors, pocket notations, three-check | `fen-variants`, API and PyChess contract tests | Malformed FEN expectations, mixed special flags, large-board FEN round trips; establish explicit parser contract before adding tests |
| Drop origin `R@` vs board square `a@`, pocket inventory and mini pockets | Board/API, pocket, jsdom and Chromium tests | Both pocket colors and rejected touch drops on unusual board sizes |
| Predrop variant mobility | Original `predrop-variants` plus **16 new tests** in `predrop-additional-variants` | Cover rank restrictions on 9x9/10x10 and invalid inputs; verify variant allowlist/selection against actual PyChess use |
| Premove variant movement / configurable hooks | 27 existing premove tests plus injected hook tests | `premove.ts` is 1,411 lines; still requires explicit per-branch audit, chess960 castling alternatives, and special piece promotions |
| Public API exports and PyChess consumer contract | Public API tests; standalone consumer CI; PyChess dev/prod builds and full TS check | Real PyChess Study/Practice interactive browser workflows and publish-archive consumer verification |
| DOM/SVG, 16x16 arrow geometry, orientation/caching | SVG, gestures and public API orientation tests; 5 Chromium cases | SVG editing and touch; animation/explosion timing and resize cases |
| Package/build and CI | pnpm/TS7/Vitest/esbuild, import smoke CI | Browser harness not yet in CI; cross-browser/touch execution needs separate environment |

**Branch-coverage measurement is still outstanding** for `board.ts`,
`wrap.ts`, `render.ts`, and `svg.ts`; fork-owned `fen.ts`, `premove.ts`,
`predrop.ts`, and `pocket.ts` retain focused baseline and integration tests,
without requiring exhaustive internal branch coverage before the trial merge.
Vitest coverage instrumentation is not presently declared as a project
dependency. Introduce and lock the appropriate coverage provider in a separate
reviewable change rather than inventing metrics or silently changing the lockfile.

- [x] Inventory documented fork-specific behavior and test mapping.
- [x] Add and run 16 extra predrop regression cases for Sittuyin, Shogun,
      Synochess, Shinobi, Tori Shogi, Mansindam, and unrestricted variants;
      **144/144 Vitest tests passed**, TypeScript passed, oxlint reported only
      three existing source warnings.
- [ ] Measure branch coverage for the eight high-risk modules listed above.
- [x] Classify variant-specific internals of `premove.ts` and `predrop.ts` as
      fork-owned rather than a prerequisite for exhaustive coverage.
- [x] Exercise standalone Chromium touch movement, 16x16 movement, and pocket dragging (8/8 browser tests passed).
- [ ] Exercise representative local PyChess Study/Practice browser interactions.
- [ ] Reconcile remaining Gate 1 P0 checkboxes against test names and outcomes;
      do not check an entire subsystem as complete solely because some tests exist.

### Merge ownership policy — agreed 2026-10-16

The following implementations are **fork-owned**. During the Git merge keep
ChessgroundX's versions (including automatically merged hunks), then review
upstream changes for useful fixes *separately*. This is a merge policy, **not** a
claim that every behavior is a strict superset of upstream.

| Module | Policy | Why |
| --- | --- | --- |
| `src/premove.ts` | Preserve ChessgroundX | Variant-specific movement and 16x16 geometry; upstream's orthodox-only implementation is not a replacement |
| `src/predrop.ts` | Preserve ChessgroundX | Variant-specific placement restrictions and pocket role logic |
| `src/fen.ts` | Preserve ChessgroundX | Dimension-aware `BoardState` parser/writer, promoted and mirrored pieces, pockets; different API from upstream |
| `src/pocket.ts` | Preserve ChessgroundX | Variant pocket UI and inventory support |

**Integration boundaries still need protection:** `config.ts` supplies FEN,
board dimensions and custom move functions; `state.ts` owns the initialized
state; `board.ts` uses premove/predrop callbacks and pocket inventories;
`render.ts`, `wrap.ts`, and `drag.ts` consume the same state. Focus additional
regressions on these boundaries, not exhaustive internal branch coverage of
fork-owned implementations as a precondition for the trial merge.

During Phase 2, inspect upstream commits touching these four modules for
relevant fixes, and record the decision for each. During Phase 3, when resolving
these paths, explicitly select the fork-owned file contents and verify the
resulting diff, including automatic merges. **Do not use a blanket `git merge
-X ours`**, which could discard unrelated upstream improvements.

- [x] Agree on fork ownership of `premove.ts`, `predrop.ts`, `fen.ts`, and `pocket.ts`.
- [ ] Audit upstream-only bug fixes in the four files after Git ancestry is known.
- [x] Verify the merge preserves fork-owned contents at the pinned SHAs (index and worktree identity).


### Shared-module upstream reconciliation audit — 2026-10-16

Compared the uploaded upstream and ChessgroundX source snapshots. This is a
**source-level comparison**, not an ancestry-based change inventory: the ZIP
files do not contain `.git`, and a change visible in upstream cannot yet be
attributed to a particular post-fork commit. **No functional upstream changes
have been integrated.**

| Shared module | Upstream behavior / difference | ChessgroundX requirement | Merge policy | Existing safety net / remaining check |
| --- | --- | --- | --- | --- |
| `board.ts` | Upstream square hit-testing and snapping use fixed 8×8 geometry; move/premove paths use different drop and predrop representations | Dimension-aware `getKeyAtDomPos`/`getSnappedKeyAtDomPos`; encoded ranks 10–16; `BoardState` pockets; drop-origin handling | Preserve fork geometry and move/drop paths; inspect upstream bug fixes one by one | Geometry, headless board, browser 16×16 drag, pocket and shared-boundary tests; add snapped-target boundary test |
| `state.ts` | Upstream piece storage and interaction state use different shape; adds `touchIgnoreRadius`, `blockTouchScroll`, `trustAllEvents`, `jsHover`, `predroppable` | Preserve `boardState`, dimensions, pocket roles, injected `premoveFunc`/`predropFunc`, fork drawing state | Reconcile feature by feature; never copy upstream state layout | API/config and injected-hook tests; review touch/hover feature applicability |
| `config.ts` | Upstream configuration updates target its own state layout, predrop settings and event model | Preserve partial config merge, full-FEN counters, board dimensions, pocket configuration, custom hooks and selection state | Keep fork semantics; port compatible upstream fixes selectively | `fork-boundaries`, `shared-boundaries-extra`, FEN tests; add lifecycle integration cases if needed |
| `drag.ts` | Upstream differentiates `newPiece`/predrop with distinct flow; fork uses temporary `a0` drag origin and pocket inventory logic; upstream has touch-origin handling and hover logic | Existing actual pocket-drop semantics, rejected-drop accounting, proper touch gestures, encoded large-board hit tests | **Do not transplant upstream drag implementation wholesale**; review event handling improvements separately | 5 Chromium mouse scenarios, jsdom drag completion; genuine touch remains a gate |
| `render.ts` | Upstream uses 8×8 layout calculations and different piece state / castle-highlighting logic | Variable-size board, custom classes, mini-board pockets, dimension CSS variables and board orientation | Review upstream rendering fixes by hunk; retain dimensional transforms | DOM/API, 16×16 and SVG tests; add resize/animation cases |
| `wrap.ts` | Upstream coordinate generation uses fixed files/ranks and simplified board DOM; fork builds larger and variant-specific coordinates and pocket containers | Extended file/rank labels, variant notation, dynamic dimensions, pocket wrappers | Preserve fork construction and notation; selectively port improvements | DOM API/geometry/pockets; check notation cases and actual resize |

**Cross-cutting invariants during conflict resolution:** retain fork-owned
`premove.ts`, `predrop.ts`, `fen.ts`, and `pocket.ts` as-is unless a separately
reviewed bug fix is justified; maintain package import paths and public API;
keep all tests local (no requests to production). Automatically merged hunks
in these shared files require the same review as conflicts.

**Readiness:** The shared-module source comparison is complete for planning.
Gate 1 is **accepted for a disposable trial merge only**, by maintainer decision on
2026-10-16. Standalone browser mouse/touch tests, PyChess dev/prod bundles,
and full PyChess typechecking passed. Local PyChess Study/Practice browser
acceptance remains unverified and is a **hard gate before final integration**,
not before non-destructive conflict reconnaissance. No additional broad
regression suite is required before the trial merge.

## Phase 2 — Determine Git ancestry and assess a disposable merge

**Trial-merge exception approved 2026-10-16:** the existing 151 Vitest and
10 standalone Chromium tests, PyChess bundling/typecheck, and CI are sufficient
for non-destructive conflict reconnaissance. Full PyChess Study/Practice browser
acceptance remains required before integrating/deploying upstream changes.

Historical preparation: the ZIP snapshots omitted Git history and the earlier
analysis sandbox could not access GitHub. That limitation is superseded by the
local trial report and pinned history recorded in Phase 3. For future trials,
run `bash scripts/trial-upstream-merge.sh` in a clean local checkout and retain
the resulting report directory.
The script fetches upstream, uses a detached temporary worktree, attempts
`merge --no-commit --no-ff`, captures conflicts and auto-merges, and removes
the worktree; it never changes local `master`. It does not resolve conflicts
or modify fork-owned files. It requires ordinary Git network access.

**Phase 2 state:** completed using the local report and existing refs, without
a new fetch. The checklist below records the original reconnaissance steps;
Phase 3 provides their evidence and the approved resolution plan.

- [x] Inspect official remotes and already-present Git history; document the exact fork HEAD,
      upstream HEAD, and merge base (if any):

      ```sh
      git remote add upstream https://github.com/lichess-org/chessground.git
      git fetch upstream
      git merge-base HEAD upstream/master
      git rev-list --left-right --count HEAD...upstream/master
      ```

      Prefer the supplied trial script, which discovers the upstream default
      branch and records the SHAs. Do not assume `upstream/master` exists.
- [x] From a clean, disposable worktree, try `git merge --no-commit --no-ff`
      against the recorded upstream SHA, capturing status and conflicts.
- [x] Classify conflicts by subsystem: pure utilities, types/config, FEN,
      board/move logic, pockets/drops, premoves, DOM/render, SVG/draw,
      styling/assets, exports, tests, package/build/CI.
- [x] Record upstream-only features and fixes worth importing; flag behavior
      changes that conflict with ChessgroundX semantics.
- [x] Abort the trial merge and retain the conflict inventory and proposed
      resolution order before beginning the real integration.

**Gate 2:** Documented SHA targets, reproducible merge report, explicit list of
high-risk conflicts, and an agreed strategy. No release or production deploy.

## Phase 3 — Integrate upstream, preserving ancestry

- [x] Create dedicated integration branch from the green, tested fork baseline (`feature/upstream-chessground-merge`, `2cb6e695ba2c46553b8b2350d8b3ffd224177ffa`).
- [x] Start `git merge --no-commit --no-ff 69f3451c9d70`; `MERGE_HEAD` pins the upstream parent. All conflicts resolved for review; merge commit remains pending approval.
- [x] Resolve low-risk shared modules before geometry/FEN/roles (batch 1).
- [x] Keep fork-owned premove, predrop, FEN and pocket implementations;
      reconcile config/state/public API, board/moves, render/wrap/drag,
      and finally SVG/draw and CSS.
- [x] Preserve ChessgroundX-specific behavior where upstream assumes 8×8,
      orthodox roles, or lacks custom drop/premove features.
- [x] Review *automatically merged* hunks as carefully as manually conflicted
      ones; a clean Git merge is not a compatibility guarantee.
- [x] Run typecheck, lint, tests, and build after every meaningful subsystem (cumulative evidence below).
- [x] Add a regression test for discovered merge regressions before
      correcting the implementation.
- [x] Document features intentionally deferred or not adopted, with reason.

**Gate 3:** Test suites and local PyChess integration pass; no unreviewed
high-risk file changes; merge commit has appropriate fork/upstream parents.

### Phase 3 execution record — 2026-10-16

**Authorization and checkpoints:** The maintainer requested Phase 3 on the
integration branch, in manageable subsystem groups. Batch 1 was approved with
no blocking defects; batch 2 was authorized with a new review checkpoint before
batch 3. Do not commit or push without explicit approval. Stop on behavior
choices that could affect PyChess and cannot be determined from the fork's
established contracts. Batch 2's conditional approval required the FEN drawing
array correction; that correction and its revalidation are complete. The
maintainer authorized batch 3 afterward, with a review checkpoint before batch 4.
Batch 3 is now approved with no blocking findings. The maintainer explicitly
requested **batch 4 input and rendering integration**. This combines the
original batch 4 layout/assets group with the coupled batch 5 drag/events group;
SVG internals remain in original batch 6. Batch 4 was conditionally approved;
the requested hover-disable correction is now verified below. The maintainer
authorized **batch 5 drawing/SVG plus the remaining README conflict** (original
batches 6 and 7 conflict resolution). Stop for independent review once the
remaining conflicts are resolved. Batch 5 and the Batch 4 hover correction
were independently approved with no blocking findings. The maintainer then
authorized final staged-diff review, actual-tree checks, PyChess dev/prod
bundles and local Study/Practice acceptance. Final verification is recorded
below; stop for one final independent review. No commit or push is authorized.

#### Verified Git evidence

| Item | Verified value |
| --- | --- |
| Branch | `feature/upstream-chessground-merge` |
| Fork baseline / prospective first merge parent | `2cb6e695ba2c46553b8b2350d8b3ffd224177ffa` |
| Pinned upstream / prospective second merge parent | `69f3451c9d70d682d5421539f28d68a15cfda4cd` |
| Merge base | `fb399cc3240da2d997ee01a3cf238253aebde2a4` |
| Divergence | 345 fork-only / 448 upstream-only commits |
| Starting worktree | Clean; no user edits or existing merge |
| Remotes | `origin`: `gbtami/chessgroundx`; `upstream`: `lichess-org/chessground` |
| Local upstream checkout | `/home/tami/chessground`, HEAD matches pinned target |
| Trial evidence | `/home/tami/chessgroundx-upstream-trial/`: metadata, conflicts, automatic merges, index stages, upstream commit inventories |
| Trial versus real merge | Both report the same 34 conflicting paths |
| Network | No fetch needed: pinned history already local; no production PyChess access |

The earlier Phase 2 checklist is retained as historical planning. This checkout
and the existing report now establish ancestry and conflict counts directly;
the real merge was started only after documenting the subsystem plan and
rerunning baseline library checks.

#### Resolution plan and complete conflict inventory

Each batch must review upstream changes since the merge base, the fork's
implementation, and any automatically applied hunks. Resolve coupled changes
together; avoid stylistic rewrites. Compile, test, lint and build each batch in
an isolated fork-baseline snapshot while later subsystems remain conflicted.
After all batches, rerun checks on the actual merged working tree.

| Batch | Conflicting paths | Resolution strategy / verification |
| --- | --- | --- |
| 1 — Ownership, package/tooling, small modules (16 paths) | `.github/FUNDING.yml`, `.github/workflows/ci.yml`, `bin/publish`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vitest.config.ts`, `tests/premove.test.ts`, `src/index.ts`, `src/anim.ts`, `src/explosion.ts`, `src/autoPieces.ts`, `src/sync.ts`, `src/fen.ts`, `src/premove.ts` | Keep fork-owned implementations, package outputs and CI protections. Review small upstream fixes individually. Preserve dimension-aware animation and auto-piece classes. Full existing regression suite, typecheck, lint, build, browser checks, import smoke and package checks on isolated batch. |
| 2 — Geometry, roles, state/config/API (6 paths) | `src/types.ts`, `src/util.ts`, `src/state.ts`, `src/config.ts`, `src/api.ts`, `src/chessground.ts` | Preserve 16×16 files/ranks, `a@` versus `R@`, `BoardState`, variant roles/mirrors, pocket roles, injected functions, event/config partial updates and API signatures. Review prototype-safe config merging, custom highlights, touch/hover options and shape-array ownership separately. Check geometry, boundaries, declarations and PyChess imports. |
| 3 — Moves, pockets and drop integration (2 paths) | `src/board.ts`, `src/drop.ts` | Keep fork pocket inventory, unified premove/predrop flow, castling and configurable kings. Review selection and snapped-origin fixes with dimension-aware helpers. Do not resurrect the removed orthodox drop engine without reconciling fork contracts. Check callbacks, accepted/rejected drops, Chess960/variant castling, custom hooks and rank 16. |
| 4 — Rendering/layout/assets (5 paths) | `src/render.ts`, `src/wrap.ts`, `assets/chessground.base.css`, `assets/chessground.brown.css`, `demo.html` | Preserve dynamic dimensions/CSS variables, notation scripts, orientation/ally/enemy classes, mini pockets and three-check markers. Adapt upstream coordinate, resize and rendering additions without fixed 8×8 calculations. Check DOM, coordinates, rectangles/16×16, orientation and browser layout. |
| 5 — Input and lifecycle (2 paths) | `src/drag.ts`, `src/events.ts` | Preserve temporary pocket origin, inventory and callback behavior. Review touch radius, scroll blocking, hover, trusted events and teardown/resize observers. Check trusted mouse/touch on ordinary and large boards, pocket rejection and destruction. |
| 6 — Drawing and SVG (2 paths) | `src/draw.ts`, `src/svg.ts` | Preserve existing drawing API, geometry, annotations and Study update/rotation contracts. Review labels/glyphs, additional layers, pending erase and erase-option changes as coupled features. Revisit `sync.ts`/`autoPieces.ts` if adopting pending erase. Require explicit clarification for incompatible behavior. |
| 7 — Documentation and final acceptance (1 path) | `README.md` | Reconcile relevant upstream documentation with fork usage. Review every automatic merge, confirm public package contents and fork-owned file identity, run all actual-tree checks and local PyChess Study/Practice acceptance. Update this ledger and README-X only for actual contract changes. |

The 34 entries above exclude automatically merged additions. Those are tracked
explicitly below rather than treated as implicitly accepted.
The original numbering is retained for auditability: the maintainer's later
batch 4 instruction includes original batch 5's input/lifecycle files. That
subgroup is complete within batch 4. Maintainer batch 5 combines original
batches 6 and 7 conflict resolution; local integration acceptance and the
merge commit remain later gates.

#### Batch 1 decisions

| Path / change | Decision and reason |
| --- | --- |
| `src/premove.ts`, `src/fen.ts` | Resolve to exact fork HEAD bytes. |
| `src/predrop.ts`, `src/pocket.ts` (no conflicts) | Explicitly restore and stage fork HEAD bytes; verify both index and worktree identity for all four owned modules. |
| `package.json`, lockfile, workspace, TS and Vitest configs | Retain Phase 0 fork setup: root compiled JS/declarations, `module`/`typings`, callable global bundles, Node 24/pnpm 12, test setup, and PyChess consumer checks. Upstream exports/dist layout would break compatibility. No dependency or lockfile changes. |
| `src/index.ts` | Retain default-export entry point used by historical IIFE bundles and standalone consumers. |
| Existing premove tests | Retain fork cases. Upstream tests use incompatible roles/state and need selective adaptation in later batches; do not replace variant coverage. |
| Funding, CI, `bin/publish`, `rollup.config.js` | Preserve fork metadata, existing workflows/checks and historical files. Do not run publish scripts. No incidental release-process change. |
| `src/anim.ts` | Retain fork implementation: dimension-aware key iteration and `boardState.pieces`. Upstream's remaining differences are imports/shorthand/formatting; no distinct functional fix identified. |
| `src/explosion.ts` | Retain fork implementation. Upstream differs only in type-import syntax. |
| `src/autoPieces.ts` | Retain fork dimension transforms, orientation-dependent classes and existing shape contract. Upstream `pendingErase` belongs with batch 6. |
| `src/sync.ts` | Port upstream `7767222` element-only traversal (`firstElementChild`/`nextElementSibling`). Text/comments previously caused `getAttribute` failures. Preserve existing exported shape interface; defer `pendingErase` with batch 6. |

#### Automatic merge audit

| Automatically applied path | Review / disposition |
| --- | --- |
| `.gitignore` | Upstream adds `.pnpm-store/` already present in fork; discard redundant duplicate. |
| `.github/workflows/release.yaml` | Exclude. Introduces npm publishing, version commits/tags and pushes; release workflow migration is outside this functional merge. |
| `.oxlintrc.json`, `.oxfmtrc.json` | Exclude. Lint config requires undeclared `oxlint-plugin-golden`; both impose unrelated lint/import/format policy changes. Preserve existing fork checks. |
| `rollup.config.js` deletion | Reject incidental deletion; retain historical fork file (excluded from published archive). |
| `src/predrop.ts`, `src/pocket.ts` | Verified unchanged and explicitly preserved. |
| `src/glyph.ts` | **Reviewed in maintainer batch 5**. Accept unchanged upstream pure SVG-string catalogs; no renderer dependency or automatic drawing. Package subpath and existing custom SVG integration verified. |
| `tests/fen.test.ts` | **Reviewed/adapted in maintainer batch 5**. Explicit Vitest imports and dimension-aware BoardState initial round trip retained. Upstream malformed-position case is not accepted as fork behavior; assessment and rationale below, no skipped or falsely passing robustness test. |

#### Fork-owned upstream fix review (initial, separate from preservation)

| Upstream changes | Assessment |
| --- | --- |
| FEN `353a3be`, `b54f30a`, `438dde0` | Winboard/slash pockets and promoted `~` read/write behavior already represented in fork implementation and regression tests. Preserve fork extensions for dimensions, `+`, mirrors and pockets. |
| FEN `cfdacd4`, `43a3c20` | Upstream ignores invalid coordinates and guards optional `pos2key` results. Fork helper/parser contracts differ; no direct transplant. Deferred separate fix needs board-dimension-aware malformed-FEN expectations; do not silently change parser behavior or its API. |
| FEN import/format/lint commits | No functional port needed; fork already uses `.js` imports. |
| Premove history | Trial report identifies orthodoxy-specific trimming/en-passant, promotion, castling, mobility-context and subsequent trimming removal. Preserve custom variant implementation; no upstream premove algorithm imported. See batch 2 for assessment of `b8713a6`, `4859567`, `a2a2d84`; the wider applicability review and integration-side custom destinations remain open. |
| Predrop and pocket history | No upstream post-base path history: these modules are fork additions. |

#### Batch 1 verification scope and results (historical checkpoint)

Baseline environment: Node `24.15.0`, pnpm `12.10.0`. Baseline `151/151`
Vitest tests in 18 files, typecheck, lint (three known warnings), formatting,
distribution build, consumer-import bundling and `pnpm pack` passed. Baseline
archive: `/tmp/chessgroundx-phase3-baseline/chessgroundx-10.7.5.tgz`.
Pristine baseline assets/script plus the pre-merge bundle also passed all
10 Chromium browser cases in `/tmp/chessgroundx-phase3-baseline-browser`.

Two new HTML/SVG shape-sync regressions failed against the fork baseline with
`TypeError: el.getAttribute is not a function` before the upstream fix.

Batch verification snapshot: `/tmp/chessgroundx-phase3-batch1`. Created from
`git archive` of the pinned fork HEAD, overlaid **only batch 1 resolved paths**
and the new test, with local `node_modules` linked for offline checks.
`batch-manifest.txt` lists every overlay. Unresolved files and unreviewed
upstream additions are intentionally absent from this snapshot. This is a
compatibility check for batch 1 against the fork, **not a passing full merge**.
At the batch 1 checkpoint, the actual working tree retained 18 unmerged paths
and could not typecheck/build until those conflicts were resolved.

| Batch 1 check | Result |
| --- | --- |
| `pnpm run test` | **153/153 passed, 19 files** (151 existing + 2 sync regressions) |
| `pnpm run typecheck` | Passed |
| `pnpm run lint` | Passed; same three pre-existing warnings in `api.ts`, `chessground.ts`, `draw.ts` |
| `pnpm run check-format` | Passed; no source-wide formatting |
| `pnpm run dist` | Passed; root JS/declarations and both IIFE bundles generated |
| `pnpm run test:consumer` | Passed; named/root and subpath imports bundle |
| Local Chromium regression script | **10/10 passed**, including 16×16 mouse/touch, pocket drops/rejection and Study-style annotation replacement/rotation |
| `pnpm pack` | Passed; `/tmp/chessgroundx-phase3-batch1-pack/chessgroundx-10.7.5.tgz` |
| Archive comparison | Same 95 published files; all 22 declaration files byte-identical; only `sync.js`, its map, and `src/sync.ts` contents differ |
| Ownership identity | All four fork-owned modules byte-identical to fork HEAD in worktree and index |
| Merge state | HEAD and MERGE_HEAD unchanged; 16 conflicts resolved, 18 remain; no commit/push |

In the temporary snapshot, use `pnpm --config.verifyDepsBeforeRun=false run ...`
(and the same flag for `pack`) to avoid pnpm attempting an install over the
linked dependency directory. Build scripts inherit that setting. A normal
typecheck in the actual merge worktree still fails on the intentionally
unresolved conflict markers; isolated results do not supersede that failure.

System Python lacks Playwright; use the existing PyChess virtualenv Python and
`CHROMIUM_PATH=/usr/bin/chromium-browser`. Browser harness uses local inline
fixtures and built assets. Local PyChess Study/Practice acceptance remains
outstanding; standalone browser tests do not satisfy that final gate.

**Batch 1 review:** Approved by the maintainer with no blocking defects. The
four owned modules and the sync traversal fix/tests remain preserved. HEAD
stays at the fork baseline and `MERGE_HEAD` at the pinned upstream SHA.

#### Batch 2 decisions — geometry, types, state, config and public API

All six assigned paths were reviewed against both parents and the upstream
post-base history, including automatically applied hunks. Six more conflicts
are resolved: **22 of 34 resolved, 12 remain**. This batch makes only the
targeted source changes below; it does not silently enable options whose
consumers are still awaiting resolution.

| Path / upstream change | Decision and reason |
| --- | --- |
| `src/types.ts` | Preserve fork bytes. Retain 16 files/ranks, encoded rank 16, promoted letter roles, mirrors, `BoardState`, pocket types, drop origins, `Move` and custom hook signatures. Keep `Elements.svg`/`customSvg` and pocket elements. Upstream's layer names and movement-context types belong with their consumers, not a replacement state layout. |
| `src/util.ts` | Preserve fork bytes. `allKeys`/`allPos` remain dimension-taking functions, `pos2key` retains its `Key` return type, and all orientation/center transforms take dimensions. Retain promotion-aware piece comparison, role/drop converters, CSS classes and existing UCI helper contract. Do not transplant upstream's 8×8 tables, optional-return `pos2key`, or unused orthodox movement/trim helpers. PyChess calls these existing helpers directly. |
| `src/state.ts` | Preserve fork bytes. Keep `boardState`, selectable pocket state, unified saved move/drop, custom hooks, dimensions, notation, king roles and CSS suffixes. Upstream input/layout/drawing defaults will be revisited with their actual consumers in batches 4–6. |
| `src/config.ts`: `1ffe89b` | Port the explicit `__proto__`/`constructor` guards into the existing plain-object merge. Ignore inherited keys as before; preserve Maps, DOM nodes, functions, partial event updates and all fork FEN/pocket/drag/counter handling. Limit the change to the existing condition rather than reformatting the merge implementation. |
| `src/config.ts`: `a969e00` | A FEN update shallow-copies `config.drawable.shapes` when supplied; otherwise it still clears manual shapes. This fixes explicit position-plus-drawing updates. Preserve full-FEN-only check counters, dimensions and the `a0` pocket-drag sentinel. Test initialization and `set` on a 16×16 board with both pocket colors. Array copying was added after the conditional Batch 2 review below. |
| `src/api.ts`: `5bf6388` | `setShapes` shallow-copies the input array, retaining shape-object identity and callback behavior. A later user drawing cannot append to the caller's authored Study array. Inspected actual PyChess `studySync.restoreCurrentShapes` and `studyGamebookPlayback.restoreAuthoredShapes`: they restore drawings via the setter; edits are handled through `onShapesChanged`. Leave `setAutoShapes` unchanged, as upstream does. |
| `src/api.ts`: remaining changes | Preserve every existing method/signature, including `Orig` drops, `newPiece(..., fromPocket)`, `dragNewPiece(..., fromPocket, event)`, pocket selection/inventory, FEN and dimension-aware hit testing. Upstream separate predrop APIs are not substitutes for the fork's unified implementation. Optional-chaining/style-only changes are not needed. |
| `src/chessground.ts`: `429a86a` | Add upstream's `initModule({ el, config })` wrapper forwarding to the existing factory. Preserve the four-argument `Chessground` factory, default entry point, mini/external pockets, resize and annotation lifecycle. Wrapper test includes 16×16 mini pockets, `R@` dropping and a subsequent move from encoded rank 16. |

The public declaration comparison shows only one additive export; no existing
public signature changed. No ambiguous upstream-versus-fork behavior was
selected without supporting fork contracts or inspected PyChess call sites.

#### Batch 2 deferred features and required follow-ups

| Follow-up | Status / assigned work |
| --- | --- |
| FEN robustness `cfdacd4`, `43a3c20` | **Assessed in batch 5; adaptation deferred.** Invalid-key insertion and promotion lookup guards rely on optional upstream `pos2key`; fork helper returns a Key across 16×16. A future fix must bound to configured dimensions, retain multi-digit runs/promotions/mirrors/pockets and specify malformed-rank handling. Owned `fen.ts` remains unchanged; upstream invalid-position test is not claimed to pass. |
| Premove `b8713a6` | **Reviewed, no direct port.** Guards optional positions in upstream's old en-passant/occupancy-trimming code. That algorithm and optional-return helper are absent from the fork. |
| Premove `4859567` | **Reviewed, no direct port.** Repairs a promotion candidate rejected because upstream probes a square beyond the board. Fork generation does not probe beyond the destination and already permits white `a7-a8` and black `a2-a1`. |
| Premove `a2a2d84` | **Reviewed, no direct port.** Adjusts occupancy trimming to repair the preceding fix while excluding certain friendly destinations. Fork premoves intentionally generate geometric candidates; consumer move rules determine execution. Do not introduce upstream trimming as a purported bug fix. Four tests protect both promotion edges with empty/friendly destinations. |
| Remaining premove history | **Open.** The three named promotion fixes have now been assessed, not the complete per-commit applicability inventory. Upstream removed its trimming machinery in `12f8805`. Batch 3 assessed the custom-destination boundary and retained the fork's injected hooks (see below). Preserve the fork-owned module. |
| `src/glyph.ts` | **Closed: reviewed in maintainer batch 5**, accepted unchanged with renderer/package evidence below. |
| Upstream `tests/fen.test.ts` | **Closed: reviewed in maintainer batch 5**. Initial round trip adapted/included; malformed case explicitly deferred with owned-parser fixes, not skipped or asserted. |
| Upstream coordinates / custom highlights | **Reviewed in batch 4.** Custom highlights adopted with state/config/type support. Fixed 8×8 on-square coordinate generation/CSS and the currently unimplemented fork ranks-position option are not exposed as inert config options. Preserve all fork notation scripts, dimensions, coordinate classes and orientation; a future on-square feature needs its own variant-notation contract. |
| Upstream touch / hover / visibility | **Reviewed in batch 4.** Optional dimension-aware touch radius and JS hover adopted; legacy defaults retained. `trustAllEvents` is not adopted: advertising it while fork-owned pocket input remains strictly trusted would create an inconsistent contract. Retain `setVisible` and square-removal semantics rather than importing the coupled display/pooling optimization (`1752ae4` and render pooling). Firefox/Mac `isRightButton` assessed in batch 5: retain fork button/buttons and Ctrl-brush semantics; the upstream platform-specific replacement needs a separate Firefox/macOS gesture review, not a silent change to PyChess input. |
| SVG layer names, brush additions, erase-option rename | **Closed: batch 5 compatibility decision**. Preserve existing API/layers; do not import labels, hilites, below-piece layers, pending erase, mandatory brush names or the erase-option rename. Details below. |
| Stale tooling references in this document | **Closed: batch 5 documentation cleanup**. Phase 4 acknowledges completed Phase 0 tooling. ZIP/Phase 2 limitations labeled historical and current statuses reconciled; historical batch results retained. README uses actual fork commands, docs and package identity. |

#### Batch 2 initial validation (superseded by the review correction below)

Snapshot: `/tmp/chessgroundx-phase3-batch2`, created from the pinned fork
baseline, overlaid with approved batch 1 and the six batch 2 resolutions plus
the two new test files. All remaining unresolved subsystems use fork-baseline
files. `batch-manifest.txt` lists overlays; `verification-logs/` contains the
actual before/after test output and validation logs. No unreviewed glyph/FEN
test additions are included. These results validate the cumulative isolated
candidate, **not the actual partially merged working tree**.

Before the fixes, five of seven config/API tests failed (prototype assignment,
FEN discarding shapes at initialization/update, array aliasing and missing
module wrapper). Afterward, all seven pass. The additional four premove
applicability tests protect existing fork behavior without changing that module.

| Check | Batch 2 result |
| --- | --- |
| Vitest | **164/164 passed, 21 files**; includes approved sync regressions |
| Typecheck | Passed |
| Lint | Passed; same three pre-existing warnings (`api.ts`, `chessground.ts`, `draw.ts`) |
| Formatting | Passed; only new tests formatted, no source-wide changes |
| Distribution build | Passed; root JS/declarations and both legacy IIFE bundles |
| Consumer-import smoke | Passed |
| Local Chromium | **10/10 passed**, mouse/touch, 16×16, pockets and Study-style annotations |
| Full local PyChess typecheck | **Passed, zero diagnostics, 473 files, 26.207 s.** Temporary tsconfig maps package/root subpaths to candidate declarations; no consumer edits or dependency replacement. |
| Package | Passed; `/tmp/chessgroundx-phase3-batch2-pack/chessgroundx-10.7.5.tgz`; same 95 published files |
| Public declarations | 21/22 byte-identical; `chessground.d.ts` only adds `initModule`; existing `Api` declaration is byte-identical |
| Ownership / batch 1 | Four owned modules still byte-identical in index/worktree; sync fix and both tests retained |
| Git state | Fork HEAD and upstream MERGE_HEAD unchanged; **12 unresolved paths**; no commit or push |

Commands use the same pnpm dependency-verification override and local Chromium
Python environment as batch 1. The actual working tree still cannot build with
unresolved conflict markers. Local PyChess Study/Practice browser acceptance
remains mandatory before final acceptance; static consumer validation and the
standalone browser suite do not close that gate. No production server contacted.

#### Batch 2 review correction — FEN drawing-array ownership

The maintainer conditionally approved batch 2 with one P2 correction: the
FEN-plus-shapes assignment still aliased the caller's array. Corrected to
`config.drawable?.shapes?.slice() || []`. Shape objects remain shared, matching
the shallow-copy policy of `setShapes`.

Two focused regression cases exercise initialization and `set` on a 16×16
board, complete a subsequent drawing operation through `draw.end`, and assert
that the authored array remains unchanged. Both failed before the correction
because the drawing was appended to the caller's array; both pass afterward.
Actual failure output: `verification-logs/fen-shapes-review-before.txt` in the
batch 2 snapshot. The reviewed source, sync fix and four owned modules remain
otherwise unchanged.

The cumulative corrected batch 2 candidate passed **166/166 tests in 21 files**,
typecheck, lint (same three warnings), formatting, distribution build, consumer
imports, **10/10 local Chromium cases**, package creation, and the full local
PyChess typecheck (**473 files, zero diagnostics, 25.662 s**). Updated logs use
the `verification-logs/review-*.txt` prefix. Package:
`/tmp/chessgroundx-phase3-batch2-corrected-pack/chessgroundx-10.7.5.tgz`.

The required correction and revalidation are complete. The maintainer authorized
continuing to batch 3 afterward, with a new review checkpoint at its end.
No merge commit or push authorized.

#### Batch 3 decisions — moves, pockets and drop integration

Both assigned conflicts are resolved: **24 of 34 resolved, 10 remain**.
Reviewed the complete upstream post-base changes and relevant individual
commits, the fork implementation, automatic hunks, and actual PyChess usage
(`roundCtrl`, two-board controllers, `pocketHotkeys`).

| Path / upstream behavior | Resolution and evidence |
| --- | --- |
| `src/board.ts` | Preserve the complete fork implementation, byte-for-byte in worktree/index. No additional upstream functional fix was identified that requires a board change in this batch. Do not retain automatically applied formatting or replace geometry/pocket code. |
| Selection fixes `974f155`, `53abc39` | Already present: selection requires `selectable.enabled || draggable.enabled`. Preserve shared square/pocket selection and notifications. Three cases cover both-disabled, drag-only and select-only behavior. |
| Snapping `666803f`, later `samePos`/direction helpers | Fork snapping is already independent of occupancy; its geometric `queen` includes the origin. Preserve dimension-aware helpers and the extra Janggi elephant path restricted to 9×10. Ten cases cover corner/origin snapping, boundary hit tests and both orientations on 5×5, 9×10, 10×8, 16×16, plus Janggi behavior. |
| Castling and safe-key changes `3c9c872` | Upstream changes key-helper calls for its fixed orthodox geometry; do not substitute that layout or change fork helper signatures. Preserve letter roles, Chess960 king/rook overlap handling and the fork's existing 10×8 Capablanca behavior. Four Chess960 cases and black queenside Capablanca supplement existing tests. Do not generalize existing castling rules to unrelated large-board variants. |
| Custom destinations / mobility predicates | Keep the fork's existing `premoveFunc(boardState, key, canCastle)` and `predropFunc(boardState, piece)` contract. Upstream `customDests`/`MobilityContext` are not imported as a second competing model. A consumer can provide its destination generator through the existing hooks; this is not a claim that the APIs are identical. Tests queue only hook candidates and revalidate saved moves against the current legal destination map. |
| Drop inventory, saved drops, callbacks | Preserve `pieceAvailability`, `fromPocket`, uppercase drop origins, `baseNewPiece`, unified `playPremove`, asynchronous callbacks and existing turn/state behavior. Three predrop replay cases verify success, occupied-square rejection, inventory disappearing before replay, no consumption when queuing, and success-only notifications. Existing capture/drop callback tests also pass. |
| `src/drop.ts` modify/delete | Retain the fork deletion from `5eb4aa7` (Version Ten), explicitly resolving the resurrection. Upstream post-base changes here are imports/formatting only. Its implementation references `dropmode`, flat `pieces`, `unsetPredrop` and orthodox drop functions that do not exist in fork state/API. Fork equivalents are `board.setDropMode` and unified `userMove`/`playPremove`. No published `drop` entry point existed in the fork baseline; it must not be reintroduced accidentally. |

No fork-owned module, type/helper contract, public API signature, package entry
point or approved sync behavior changed. The board preservation tests pass on
the original fork implementation; they are compatibility evidence, not claimed
before/after bug fixes. Only the separately authorized Batch 2 P2 correction
changes functional code in this turn.

#### Batch 3 verification and review checkpoint

Snapshot: `/tmp/chessgroundx-phase3-batch3`, constructed from fork HEAD plus
approved batches 1–2, the P2 correction, resolved `board.ts`, continued absence
of `drop.ts`, and the new boundary tests. Remaining unresolved subsystems still
use fork-baseline files. `batch-manifest.txt` lists overlays and exclusions.
Actual output is retained in `verification-logs/`.

| Check | Result |
| --- | --- |
| Vitest | **188/188 passed, 22 files**: corrected batch 2's 166 plus 22 board-boundary cases |
| Typecheck, lint, formatting | Passed; same three pre-existing lint warnings; only new tests formatted |
| Distribution and consumer import builds | Passed; both legacy bundles and root/subpath imports preserved |
| Local Chromium | **10/10 passed**; all existing mouse/touch, pocket and annotation scenarios rerun on cumulative candidate |
| Packaging | Passed; `/tmp/chessgroundx-phase3-batch3-pack/chessgroundx-10.7.5.tgz` |
| Package/declaration comparison | All 95 packaged files and all 22 declarations byte-identical to corrected batch 2. The `drop` module remains absent. |
| Full local PyChess TS | Corrected batch 2 passed on 473 files with zero diagnostics. Reused for batch 3 because the complete package is byte-identical; no duplicate full consumer typecheck claimed. Comparison proof is logged. |
| Preservation | Four owned modules and `board.ts` match fork HEAD in index/worktree; approved sync fix/tests retained |
| Merge state | HEAD/MERGE_HEAD unchanged; 10 unresolved paths; no commit or push |

The original unresolved paths now left are `README.md`, both conflicted board
CSS files, `demo.html`, `drag.ts`, `draw.ts`, `events.ts`, `render.ts`, `svg.ts`,
and `wrap.ts`. Automatically staged `glyph.ts` and upstream `fen.test.ts` still
await their assigned reviews. FEN robustness, wider premove applicability,
input/layout/drawing changes and stale tooling documentation cleanup remain
tracked above. Local PyChess Study/Practice browser acceptance remains open.
No production server contacted; these isolated results do not certify the
actual conflicted merge tree.

**Batch 3 review:** Approved with no blocking findings, including the P2
correction, full fork board, deleted drop module, custom hooks, variant
geometry/castling, inventory/callback behavior and owned-module preservation.

#### Batch 4 decisions — input and rendering integration

Resolved seven conflicts from the original rendering/layout and input/lifecycle
subgroups: **31 of 34 resolved; `README.md`, `src/draw.ts`, `src/svg.ts` remain**.
Reviewed upstream post-base diffs and file history, explicit conflicts and
automatically merged hunks. Kept the fork implementations as the starting point
and ported the changes below without reformatting unrelated code.

| Area | Decision / preservation boundary |
| --- | --- |
| Resize lifecycle (`f9302c7`) | Own the ResizeObserver in `bindDocument` and disconnect it through `dom.unbind`. Preserve the fork's Bughouse `document.body` target when a dimension suffix is present. Rebind document/pocket listeners on each full redraw after releasing old bindings: unlike upstream, the fork's mini-pocket elements can be replaced. This fixes observer leaks and stale pocket handlers while avoiding duplicate external-pocket listeners. Keep the two-argument `bindBoard` call signature (second argument now unused). |
| View-only input (`1f67781`, `f9e2ee3`) | Apply the existing context-menu policy before the view-only early return; do not create an unused ghost piece in view-only mode. Board and pocket input still require trusted events. |
| Touch duplicate selection (`4b5b4ae`) | If a touch is outside the interaction radius and scrolling is not blocked, return and let the compatibility mouse event perform selection once. Keep the fork's dimensions and selected-piece/pocket handling. |
| Touch radius (`6725744`, `1535f90`) | Add optional `touchIgnoreRadius` to config/state, measuring cell circumradii using **both** `bounds.width / dimensions.width` and `bounds.height / dimensions.height`. When omitted, retain the exact legacy square-width radius. Do not impose upstream's default threshold or fixed `width/16` formula on PyChess. Document the option in README-X. |
| Missing dragged piece | Restore upstream's existing `!origPiece` guard before comparing pieces. A position update that removes the drag origin now cancels safely instead of throwing. Do not transplant upstream's distinct new-piece/drop engine or alter fork inventory/turn/callback behavior. |
| JS hover (`7b32423`, `c4d628b`, `b281ee3`) | Add opt-in `jsHover` with `data-key` on new, reused and existing destination squares. Retain dimension-aware hit tests and `a0` sentinel semantics. Translate pocket origins to role drop origins; honor both normal and injected premove destinations. Clear hover when leaving the board, returning to the origin, cancelling, finishing, or rejecting a mismatched touch origin. Preserve the legacy touch-origin rejection behavior otherwise. |
| Custom highlights (`d0a7531`) | Add `SquareClasses`, optional `highlight.custom` in config/state and additive rendering alongside existing classes. Maps replace atomically via the preserved config merge; support encoded rank-16 keys. Preserve the fork's square removal and all last-move/drop/check/premove/explosion semantics. |
| Render/wrap | Retain `boardState`, native notation scripts, all coordinate classes and dimension transforms, mini/external pockets, suffix-specific CSS variables, existing `svg`/`customSvg` DOM and three-check handling. Keep the approved board unchanged. Do not import upstream's orthodox castling-highlight heuristic, fixed 8×8 coordinate grids or SVG layer/API changes ahead of their own review. |
| CSS | Port the manipulable-only board cursor and optional `.hover` destination styles. Keep existing variant sizing/selectors, default SVG board pattern and fork coordinate coloring. Other upstream base CSS layering belongs with batch 6. |
| Demo | Resolve add/add to the fork demo, unchanged. It uses the preserved root ESM entry point; upstream's dist ESM import and labels/layers are incompatible with the current bundles and deferred SVG features. |

The optional controls default to existing fork behavior. `premove.ts`,
`predrop.ts`, `fen.ts`, `pocket.ts`, the complete approved `board.ts`, utility
helpers and the approved sync traversal fix/tests remain unchanged.

#### Batch 4 validation and review checkpoint

Snapshot: `/tmp/chessgroundx-phase3-batch4`. Built from fork HEAD plus approved
batches 1–3 and this batch's explicitly listed files. Unresolved drawing/SVG
code remains at fork baseline; automatically added glyph/FEN tests are still
excluded until reviewed. `batch-manifest.txt` and `verification-logs/` capture
the actual validation scope and outputs.

The initial 13 focused cases reproduced **10 failures** before the changes:
observer leaks, stale mini-pocket listeners, view-only policy, missing custom
highlights, duplicate touch callbacks, configured radius, JS hover and the
missing-origin drag crash. Three existing-behavior cases passed. The final
focused file has **15 passing cases**, adding late hover enablement and custom
premove hover alongside the original regression scenarios. Four new trusted
Chromium cases cover mini-pocket dragging after rotation, external pockets
after repeated redraws, black-oriented 9×10 touch dragging and rank-16 JS hover.

| Check | Result |
| --- | --- |
| Vitest | **203/203 passed, 23 files** (188 approved cases plus 15 focused input/render cases) |
| Typecheck / lint / format | Passed; same three existing warnings, no source-wide formatting |
| Distribution / consumer imports | Passed; callable global, root outputs and package subpaths preserved |
| Local Chromium | **14/14 passed**, including the original ten input/SVG/Study-boundary cases |
| Full local PyChess TS | **Passed: 473 files, zero diagnostics, 26.010 s** against the additive candidate declarations |
| Package | Passed; `/tmp/chessgroundx-phase3-batch4-pack/chessgroundx-10.7.5.tgz`; same 95 published paths |
| Public declarations | 18/22 byte-identical to batch 3. Config/state gain optional controls, types gain the square-map alias; events only renames an unused parameter without changing its type/signature. No existing Api/factory method signature changed. |
| Preservation / Git | Four owned modules, board and utilities byte-identical to fork HEAD in worktree/index; sync fix retained; drop module absent; HEAD and MERGE_HEAD unchanged |

Previously reviewed automatic toolchain/release changes retain their batch 1
dispositions. `src/glyph.ts` and
upstream `tests/fen.test.ts` remain staged automatic additions awaiting batch 6
and batch 7 review, respectively. FEN robustness and the wider premove history
audit are still tracked. On-square coordinates, visibility/pooling changes and
trusted-event bypass were explicitly assessed above rather than silently
accepted. Stale tooling references await the agreed documentation cleanup.

These are isolated cumulative results, not a passing actual merge tree. Local
PyChess Study/Practice browser acceptance and final merged-tree validation
remain required. No production server contacted; no commit or push performed.

#### Batch 4 review correction — hover disabled during a drag

The maintainer's P2 concern reproduced in **five focused regressions**, all
failing before the correction and passing afterward. Tests start an actual
board drag with hover enabled, highlight `a2`, disable hover and exercise:
normal release, cancellation, mismatched touch origin, the next drag frame,
and immediate `api.set({ jsHover: false })`. Assertions precede any cleanup
redraw so rendering cannot hide a stale class.

- `removeDragElements` and mismatched-touch cleanup now clear hover regardless
  of `jsHover`; a disabled active drag also clears on its next frame.
- `api.set()` clears existing hover immediately when explicitly disabled.
  `drag.resetHoverState` is an additive subpath helper; the `Api` signature is
  unchanged. No new highlighting occurs while disabled.
- The four owned modules, board/utilities and approved sync fix remain intact.

Corrected cumulative snapshot: `/tmp/chessgroundx-phase3-batch4`.
`verification-logs/before-hover-disable.txt`: **5 failures / 15 passes**;
`after-hover-disable.txt`: **20/20 pass**. Cumulative **208 Vitest / 23 files**,
**14 Chromium** cases, typecheck, lint (same three warnings), formatting, dist,
consumer imports and packaging pass. Full PyChess TypeScript: **473 files,
zero diagnostics, 24.625 s**. Package remains 95 paths; corrected artifact:
`/tmp/chessgroundx-phase3-batch4-corrected-pack/chessgroundx-10.7.5.tgz`.
These results precede drawing/SVG edits. Proceeding to authorized batch 5.

#### Batch 5 — Drawing/SVG, automatic additions and README resolution

This is maintainer batch 5, covering original drawing/SVG batch 6 and the
README conflict from original batch 7. Reviewed complete fork/upstream files,
post-base history and automatically merged hunks. Remaining conflicts resolved:
`src/draw.ts`, `src/svg.ts`, `README.md`. No Git conflict remains; this does not
complete local PyChess acceptance or authorize a merge commit.

| Change / upstream history | Resolution and compatibility rationale |
| --- | --- |
| Draw completion `5933100` | Store a new `{ orig, dest, brush }` record rather than retaining the mutable gesture object. Same endpoint/brush toggles, callback timing/count, authored-array ownership and custom string brushes retained. PyChess Study serializes precisely these shape fields. No new helper exports needed. |
| SVG element traversal `7767222`; marker buildup `8b7eff2` | Use element-only traversal of marker definitions, retaining append-only deduplication by `cgKey`. The fork already has the corrected `cgKey` collection from the later buildup fix. Approved `sync.ts` traversal fix/tests remain untouched. |
| Custom SVG marker guard | Adapt upstream's brush-presence guard to the fork's exclusive custom SVG rendering path: custom overlays never require unused arrow brushes, even when they carry a destination. String markup, origin anchoring and existing layering preserved. |
| Circle compatibility `f1b33c9` | Equal origin/destination shapes render as circles instead of zero-length arrows; tested at rank 16. No geometry formula replaced. |
| SVG API and geometry | Keep `renderSvg(state, svg, customSvg)`, string `customSvg`, promoted-piece hashes, fork view boxes, orientation, rectangular/Janggi/Xiangqi scaling, circle sizes, arrow margins, opacity, line widths and existing auto-piece layer. Do not adopt upstream's fixed 7/3.5/8 assumptions or the new Elements-only renderer signature. |
| Labels, hilites, below-piece planes, erase preview | Not adopted in this merge. They couple new DOM/CSS/sync interfaces and different default arrow shortening/preview behavior; existing Study/Practice contracts have no requirement for them. Keep legacy multi-arrow shortening and `SyncableShape`/auto-piece interfaces. Label/cache/custom-center fixes (`6c530c7`, `7b09a68`, `afa5844`, `5317af1`) concern these excluded features. They are not claimed as integrated fixes. |
| Erase/brush/gesture contracts | Keep `eraseOnClick`, arbitrary `DrawBrushes`/string `DrawCurrent.brush`, Ctrl/Alt/Shift behavior, multi-touch rejection and dimensional snapping. Do not rename the erase option used by `analysisCtrl` or require four built-in brushes from consumers. Keep fork `isRightButton`; Firefox/macOS behavior change is explicitly deferred to platform-specific review. |
| `src/glyph.ts` (`546439f`, `31506a3`, `9c7428a`, `70b02c4`, `ca3d02c`) | Accept exact target bytes: optional pure catalogs return 100×100 SVG fragments compatible with fork string overlays. No imports, board/role assumptions, default state changes or automatic glyphs. Exported EndgameOutcome remains additive. Tests render every catalog entry, stack positioning and 9×10/16×16 rotation/removal through the existing custom layer. |
| Upstream FEN tests | Retain/adapt initial-position round trip using explicit Vitest imports, dimensions and BoardState. Remove incompatible malformed test rather than silently skipping it or changing the owned parser. See assessment below. |
| README | Keep fork branding/badges, screenshots, npm name, imports and existing wrappers. Use fork-relative API/default/config/demo links, actual Node/pnpm/build/test commands; omit upstream's unadopted release workflow instructions. Remove stale unmeasured bundle-size claim. README-X documents retained drawing API and optional glyph subpath. |

**FEN robustness assessment:** `cfdacd4` ignores pieces with an invalid optional
key; `43a3c20` protects the `~` promotion lookup against that optional key.
The fork uses different parser state and a non-optional 16×16 `pos2key`.
Upstream's malformed fixture concatenates two piece ranks, yielding squares
outside configured 8×8 but inside the fork's global 16-file key space. A direct
copy of the guards would not enforce configured bounds. A separate fix must
specify configured-dimension and malformed-rank behavior without losing
multi-digit runs, promoted/mirrored roles or pocket formats. Both commits are
assessed; adaptation remains deferred. `fen.ts` is byte-identical to HEAD.
`tests/fen.test.ts` contains one passing round-trip case, **no skipped tests and
no claim that malformed input is now bounded**.

**Focused evidence:** `tests/upstream-drawing-svg.test.ts` has nine cases.
Before targeted fixes: **4 failures / 5 passes**, reproducing definition-node
traversal crash, zero-length circle rendering, missing-brush custom overlay
crash and mutable gesture retention. Afterward: **9/9 pass**. Five glyph
catalog/geometry cases protect the accepted automatic addition. Logs are in
`/tmp/chessgroundx-phase3-batch5/verification-logs/`.

Cumulative candidate: **218 Vitest tests / 25 files pass**, including the five
hover-disable corrections and adapted upstream FEN round trip. Typecheck, lint
(same three warnings), format, dist, import smoke and 14 local Chromium tests
pass. Full PyChess TypeScript: **473 files, zero diagnostics, 24.360 s**.
No package configuration/dependency/lockfile or production-server change.

#### Batch 5 final working-tree verification and review handoff

After resolving/staging the last three conflicts, reran checks directly in
`/home/tami/chessgroundx` (not just the isolated snapshot):

| Actual merged working-tree check | Result / evidence |
| --- | --- |
| Regression suite | **218/218 passed, 25 files**, no skipped tests; `actual-test.txt` |
| Typecheck / lint / format | Passed; same three pre-existing non-fatal lint warnings; `actual-typecheck.txt`, `actual-lint.txt`, `actual-format.txt` |
| Compile / bundles / consumer imports | Passed; `actual-dist.txt`, `actual-consumer.txt` |
| Local trusted Chromium input/SVG | **14/14 passed**; `actual-browser.txt`; no production service contacted |
| Package | Passed; `/tmp/chessgroundx-phase3-batch5-actual-pack/chessgroundx-10.7.5.tgz`; all 99 member contents byte-identical to isolated batch 5 package |
| Package paths / declarations | All 95 earlier paths retained, only four glyph source/JS/map/declaration paths added. **All 22 existing declaration files byte-identical to corrected batch 4**; one new glyph declaration. Packed `chessgroundx/glyph` resolves and all three catalogs run through an isolated consumer. |
| Ownership / history | Four owned modules, complete board and util identical to fork HEAD in index/worktree. `glyph.ts` exactly upstream target; drop module absent. Approved sync fix/tests retained. 0 unmerged index entries, HEAD/MERGE_HEAD unchanged. |
| Scope / remaining acceptance | No commit/push or consumer source changes. Actual local PyChess Study/Practice E2E and broader variant/platform acceptance remain open before final integration approval. |

All logs above are under `/tmp/chessgroundx-phase3-batch5/verification-logs/`.
`package-and-ownership-comparison.txt` records byte identities and archive
inventory; `packed-glyph-consumer.txt` records the new subpath smoke check.
The PyChess typecheck used additive candidate declarations from the isolated
snapshot, identical to actual-tree output. No consumer files were modified.

Review archive: `/home/tami/Downloads/chessgroundx-phase3-batch5-review-2026-10-16.zip`.
It separates the Batch 4 P2 correction from Batch 5, includes the approved
Batch 4 baseline, corrected Batch 4 and final candidate source snapshots,
upstream/base references, focused/cumulative/actual-tree logs and checksums.

**Batch 5 checkpoint (subsequently approved):** All 34 conflict resolutions
and automatic additions were presented for review. The maintainer approved
this batch and the hover correction without blocking findings on 2026-10-17.
The local Study/Practice browser gate was subsequently exercised successfully
in final verification below; no merge commit or push is authorized. Wider
premove-history applicability and the separate dimension-aware FEN robustness adaptation remain tracked; named
premove fixes `b8713a6`, `4859567`, `a2a2d84` retain their approved dispositions.

## Phase 4 — Integration verification

The final acceptance record below supersedes earlier pending Study/Practice
notes in historical batch checkpoints. Broad manual coverage of every variant,
cross-platform input and measured performance remains outside this scoped run.

- [ ] Test representative variants and all supported board shapes manually in
      a local PyChess deployment, including Study and Practice annotations.
- [ ] Verify package publish output, imports, type declarations, minified and
      unminified builds, CSS classes, and performance on large boards.
- [ ] Compare representative interaction/performance cases with pre-merge
      baseline; investigate significant regressions rather than relying on
      subjective inspection alone.
- [x] Preserve the TypeScript 7, pnpm 12, esbuild, oxlint and oxfmt toolchain
      already adopted in Phase 0. Functional merge adds no dependencies or
      lockfile changes; avoid source-wide formatting changes.
- [x] Update README-X with actual adopted/excluded contracts and retain
      reproducible synchronization commands in this ledger/trial script.
- [ ] Record final upstream merge SHA, CI/build/test results, known limitations,
      and release/deployment outcome.

**Gate 4:** PyChess integration accepted; all critical tests green; artifacts
verified; documentation and change log complete.

### Final integration verification and merge readiness — 2026-10-17

**Maintainer decision:** Batch 5 and the Batch 4 hover correction are approved,
with no blocking findings. This final pass adds **no product changes, features,
tests, dependency changes or formatting**. Only this ledger is updated after
verification. The real merge remains in progress, uncommitted and unpushed.

#### Complete staged-diff and automatic-merge audit

Reviewed every staged path against fork HEAD, including source, CSS, browser
script, tests, documentation and automatic additions. All **26 staged paths**
initially matched the independently approved Batch 5 archive byte for byte.
There are no unexpected staged paths, unmerged index entries or unstaged edits.
`verification-logs/staged-diff-audit.md` records each path's disposition;
`staged-diff.patch` and `approved-candidate-comparison.txt` capture the exact
review input. All other indexed paths match fork HEAD.

- All four owned modules, complete `board.ts` and `util.ts` match fork HEAD in
  both index and worktree. Approved `sync.ts` traversal fix/tests are intact.
- Reviewed automatic `glyph.ts` still exactly matches upstream target; the
  FEN test retains only the explicitly adapted round trip. Automatic
  predrop/pocket paths retain the fork. No upstream release/OXC additions,
  duplicate ignore entry, package migration, or resurrected drop module remain.
- Package metadata, lockfile, workspace, TS/Vitest configs, bundle script,
  CI/funding, default entry point and historical Rollup file match fork HEAD.
  No published path removed. Final package has **99 paths**, comprising all
  earlier 95 plus glyph source, JS, source map and declaration.
- All 99 packed member contents (including all 23 declarations) match the
  approved Batch 5 package. Relative to the fork-compatible baseline, 16/22
  existing declarations are byte-identical. The remaining six contain only
  the approved additive module wrapper, optional radius/hover/highlights,
  square-map alias, hover-cleanup helper and unused event parameter rename.
  Existing Api, drawing, SVG, FEN, pocket, premove and predrop signatures are
  unchanged. `public-declarations.patch` records this comparison.

#### Actual-tree and actual-consumer validation

Evidence root: `/tmp/chessgroundx-phase3-final-2026-10-17/`.
All library commands ran directly in `/home/tami/chessgroundx`; a freshly packed
artifact from that tree was extracted into an **isolated** PyChess
`node_modules/chessgroundx`. Consumer sources/tests were copied unchanged from
`/home/tami/pychess-variants`, HEAD
`117383adb3355f381af8893a90059de54a7f0eb5`. No paths alias candidate source or
old declarations into the consumer: it resolves the actual installed tarball.
Other installed dependencies are linked read-only by convention. Generated
consumer assets/check outputs stay under the isolated copy. The original
consumer's tracked tree remains unchanged; its untracked wheelhouse directories
are untouched.

| Check | Result / evidence in `verification-logs/` |
| --- | --- |
| ChessgroundX regression suite | **218/218 passed, 25 files**, no skipped cases; `test.txt` |
| Library typecheck / lint / format | Passed; same three existing non-fatal lint warnings; `typecheck.txt`, `lint.txt`, `format.txt` |
| Compile / unminified and minified bundles / imports / pack | Passed; `dist.txt`, `consumer.txt`, `pack.txt`; artifact `package/chessgroundx-10.7.5.tgz` |
| Standalone Chromium | **14/14 passed on each of the unminified and minified bundles**; `browser.txt`, `browser-minified.txt` |
| Full PyChess TypeScript | **473 files, zero diagnostics, 25.519 s**, non-incremental, installed candidate declarations; `pychess-typecheck.txt` |
| PyChess development and production builds | Both passed using unchanged `esbuild.mjs dev` / `prod`; `pychess-dev.txt`, `pychess-prod.txt`; main app plus realtime workers generated. Production main JS 2,756,062 bytes; Brotli 667,812; gzip 856,689. SHA256 evidence in `local-acceptance-summary.txt`. |
| PyChess frontend lint / docs build | Passed, lint uses `--deny-warnings`; `pychess-lint.txt`, `pychess-md.txt` |
| Full PyChess Jest suite | **113 suites / 929 tests passed**, 18.202 s; `pychess-test.txt` |
| Existing Study browser acceptance | **Passed** `test_drawings_survive_piece_selection_and_moves` |
| Existing Practice browser acceptance | **Passed** `test_practice_browser_acceptance_and_analysis_restore` |
| Combined local acceptance result | **2 passed, 8.22 s**, 18 existing mongomock datetime deprecation warnings; `pychess-study-practice.txt` |
| Ownership / package / final Git | Passed; `ownership-package-contracts.txt`, `approved-candidate-comparison.txt`; final Git evidence below |

The existing standalone suite was reused for minified runtime validation to
check the retained callable browser-global contract; no additional test cases
were introduced. PyChess browser acceptance ran against the production-built
client with local aiohttp servers and in-memory MongoDB fixtures. Study
coverage includes authored arrow persistence through selection, root-to-move
navigation and reload, with deliberate clearing on empty-square click. Practice
coverage includes engine readiness, hint flow, user move, unchanged authored
chapter data, chapter switch and normal analysis/engine restoration.

**Network and harness:** The temporary `verification_guard.py` constrains
Python TCP and browser HTTP/WebSockets to loopback; service workers are blocked
for the test contexts. Runtime service credentials were excluded and local URI
and static root selected. Final log records **279 local HTTP requests and three
local WebSockets**, no external/production targets or blocked remote attempts.
Initial harness use incorrectly awaited synchronous Playwright
`WebSocketRoute.connect_to_server()`, causing both tests to fail before product
assertions. Corrected the temporary harness and reran the same unchanged tests:
2/2 passed. Initial failed output is retained as `attempt1-*`, not counted as a
product regression. This harness and runner are outside both repositories.

#### Remaining optional follow-ups and readiness limits

| Item | Disposition before merge |
| --- | --- |
| FEN robustness `cfdacd4`, `43a3c20` | Assessment complete; separate dimension-aware malformed-FEN adaptation remains optional follow-up. Owned parser unchanged; no claim of upstream malformed-input guarantees. |
| Broader premove history | Named `b8713a6`, `4859567`, `a2a2d84` applicability decisions approved; full per-commit inventory remains a later audit. No change to fork-owned generator or injected hooks. |
| Excluded upstream labels/hilites/planes/erase previews, object SVG and erase rename | Approved compatibility exclusions, not incomplete conflict resolution. Optional future features require their own dimensional/API review. |
| Platform-specific gestures, trusted-event bypass, on-square coordinates, render pooling/visibility changes | Keep approved fork behavior. Firefox/macOS and other browser/platform matrices are not covered by this Linux Chromium run. |
| Broad variant/manual/performance coverage | Existing dimensional/variant suites and local scoped acceptance pass. No claim that all variants/platforms have exhaustive manual or measured performance coverage. No speculative features or test expansion added. |
| CI / PR integration | Local verification is complete for this requested scope. Remote CI must pass once an explicitly approved commit is pushed and before PR merge into master. No remote action was taken. |

**Readiness:** No blocking findings from the final staged-diff audit or required
local checks. The requested Study/Practice gate is now satisfied for the two
specified acceptance tests, not deferred for lack of an environment. Ready for
one final independent review and the maintainer's explicit commit approval.
Gate 3's actual merge commit is intentionally still absent. The intended first
parent remains `2cb6e695ba2c46553b8b2350d8b3ffd224177ffa`, and `MERGE_HEAD` remains
`69f3451c9d70d682d5421539f28d68a15cfda4cd`; a later approved normal merge commit
will preserve both parents. Do not squash away upstream ancestry.

Final review archive:
`/home/tami/Downloads/chessgroundx-phase3-final-readiness-review-2026-10-17.zip`.
It contains the full staged diff, a documentation-only delta since approved
Batch 5, source snapshots, per-path audit, package/declaration comparisons,
consumer build/check output, both browser acceptance attempts, the temporary
network harness/runner and checksum manifest. No dependencies, credentials,
Git internals or production data are included.

### Final independent approval and Git handoff — 2026-10-17

The maintainer approved the complete implementation and final readiness report
with **no blocking findings**, and explicitly authorized:

1. A genuine merge commit on `feature/upstream-chessground-merge`.
2. Pushing that feature branch to `gbtami/chessgroundx`.
3. Opening a PR against that repository's `master` and waiting for GitHub Actions.

**Merging the PR into master is not authorized.** Stop for review of CI and the
PR diff. Optional follow-ups and compatibility exclusions above remain unchanged.

Immediately before committing, verified the branch, clean unstaged diff,
exact approved snapshot, zero unmerged entries and both pinned parents:
`HEAD=2cb6e695ba2c46553b8b2350d8b3ffd224177ffa`,
`MERGE_HEAD=69f3451c9d70d682d5421539f28d68a15cfda4cd`.
The six preserved modules match fork HEAD in index and worktree. The remote
feature branch and master both still point to the fork baseline. Only this
approval record changes after the final approved snapshot; no implementation
or test change is introduced. Commit/parent, PR and CI outcomes are to be
reported in the PR and handoff so the merge commit need not be rewritten.

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
- [x] Verify standalone Chromium runtime interactions for trusted mouse dragging, pocket drops, SVG arrow drawing and orientation (`scripts/test-browser-interactions.py`); **5 browser tests passed**, with no production network access.
- [x] Test standalone Chromium touch gestures using CDP touch events: 8x8 and 16x16 piece movement, and pocket dragging. **8/8 browser tests passed**, including the existing five mouse/SVG tests.
- [x] Test the requested Study/Practice interactions in a local PyChess browser with the packed candidate (two existing acceptance tests passed, 2026-10-17; scope/evidence below).
- [x] Verify standalone Chromium chapter-style annotation replacement and orientation redraw: **10/10 browser tests pass** (two additional tests). This protects the library boundary but is not PyChess end-to-end testing.
- [x] Run `tests/test_study_gui.py::TestStudyGUI::test_drawings_survive_piece_selection_and_moves` and `::test_practice_browser_acceptance_and_analysis_restore` with local aiohttp/mock-DB fixtures and the packed candidate: **2 passed, 2026-10-17**. Loopback-only network guard, no production requests.
- [x] Distinguish library shape clearing from Study persistence: local acceptance verifies selection retains the root annotation, moving hides it on the new node, navigation/reload restores it, and an empty-square click deliberately clears it.

| 2026-10-16 | Phase 1 local PyChess bundling | Development and production esbuild passed | Local uploaded PyChess client with compiled ChessgroundX | Named/subpath imports work; full TS check and browser interactions pending |
| 2026-10-16 | Phase 1 full TS attempt | Previously inconclusive | Offline PyChess JS wheelhouse + locally compiled ChessgroundX | Superseded by successful non-incremental typecheck below |
| 2026-10-16 | Phase 1 full TS check | **Passed: 0 errors, 473 files, 44.24 seconds** | Local PyChess client with compiled ChessgroundX | `tsc --noEmit --incremental false --extendedDiagnostics`; 325 MB used; real-browser interactions remain pending |
| 2026-10-16 | Phase 1 drag completion | **128/128 tests passing (15 files)** | `tests/drag-completion.test.ts` | Six jsdom regression cases for mouseup move completion, off-board behavior, optional delete-on-drop-off, temporary pocket drag cancellation, accepted and occupied-square rejected pocket drops; trusted browser drag initiation remains unverified |
| 2026-10-16 | Phase 1 Chromium input | **5/5 standalone browser tests passing** | `scripts/test-browser-interactions.py`, Chromium + Python Playwright | Trusted pointer drag on 8x8 and 16x16, real pocket accepted/rejected drops, right-button SVG arrow and orientation redraw; not yet automated in Node CI; no production-network requests |
| 2026-10-16 | Phase 1 Chromium touch | **8/8 standalone browser tests passing** | Chromium CDP `Input.dispatchTouchEvent` via Playwright | Three new touch scenarios: 8x8 piece move, 16x16 move to encoded rank 16, pocket-to-board drag; PyChess Study/Practice E2E remains pending |

| 2026-10-16 | Phase 1 coverage audit | **144/144 Vitest tests passed** | `tests/predrop-additional-variants.test.ts` | Added 16 remaining predrop branch scenarios; inventory documents uncovered interaction and premove branches; Gate 1 remains open |

| 2026-10-16 | Phase 1 merge policy | Fork-owned modules agreed | `premove.ts`, `predrop.ts`, `fen.ts`, `pocket.ts` | Preserve implementations; prioritize boundary tests and inspect upstream fixes separately |
| 2026-10-16 | Phase 1 shared boundaries | **151/151 Vitest passing (18 files)** | `tests/shared-boundaries-extra.test.ts` | Four regression cases covering FEN refresh during a pocket drag, partial event configuration, last-move replacement and orientation/selection hooks; TypeScript, new-test lint and formatting passed |

| 2026-10-16 | Phase 1 shared-module audit | Six modules assessed; Gate 1 open | Uploaded upstream/fork source ZIP comparison | Preserve dimension, pocket and public API contracts; touch/Study integration remain pending |

| 2026-10-16 | Phase 1 Chromium Study-like contracts | **10/10 Chromium browser tests passed** | Two additions to `scripts/test-browser-interactions.py` | Checks replacement of manual/auto annotations and orientation redraw in standalone ChessgroundX; actual PyChess Study/Practice Playwright acceptance is still pending |

| 2026-10-16 | Phase 1 decision | Sufficient for disposable merge trial | Maintainer decision, 151 Vitest + 10 Chromium, PyChess bundle and TS checks | Stop speculative test expansion; local Study/Practice end-to-end remains mandatory before final acceptance |
| 2026-10-16 | Phase 2 preparation | Trial script ready; ancestry/conflicts pending | `scripts/trial-upstream-merge.sh` | No merge executed in sandbox because Git remote history was unavailable; report to be generated locally |
| 2026-10-16 | Phase 3 batch 1 | Resolved for maintainer review; merge uncommitted | Fork `2cb6e69`, upstream `69f3451c9d70`, base `fb399cc3240d`; execution record above | 16/34 conflicts resolved; isolated batch: 153 Vitest, 10 Chromium, typecheck/lint/format/build/import/pack pass; 18 conflicts and local PyChess acceptance remain |
| 2026-10-16 | Phase 3 batch 1 review | Approved; no blocking defects | Maintainer review | Preserve ownership and sync decisions; track FEN/premove/glyph/test/tooling follow-ups |
| 2026-10-16 | Phase 3 batch 2 | Resolved for review; merge uncommitted | Six assigned paths reconciled; execution record above | Cumulative isolated candidate: 164 Vitest, 10 Chromium, typecheck/lint/format/build/import/pack and 473-file PyChess TS pass; 12 conflicts remain |
| 2026-10-16 | Phase 3 batch 2 review correction | P2 correction complete; continuation authorized | FEN-plus-shapes now shallow-copies input; two new regressions fail before/pass after | Corrected candidate: 166 Vitest, 10 Chromium, all existing checks and 473-file PyChess typecheck pass |
| 2026-10-16 | Phase 3 batch 3 | Resolved for review; merge uncommitted | Fork `board.ts` preserved; upstream `drop.ts` resurrection rejected | 24/34 conflicts resolved; 188 Vitest, 10 Chromium, typecheck/lint/format/build/import/pack pass; 10 conflicts remain |
| 2026-10-16 | Phase 3 batch 3 review | Approved; no blocking findings | Maintainer review | P2 array correction, board/drop/hook decisions and preservation evidence accepted |
| 2026-10-16 | Phase 3 batch 4 | Input/rendering resolved for review; merge uncommitted | Original rendering/layout and input/lifecycle subgroups combined per maintainer instruction | 31/34 conflicts resolved; 203 Vitest, 14 Chromium, typecheck/lint/format/build/import/pack and 473-file consumer TS pass; 3 conflicts remain |

| 2026-10-16 | Phase 3 batch 4 review correction | Conditional approval P2 fixed; continuation authorized | Five hover-disable regressions fail before/pass after | 208 Vitest, 14 Chromium, cumulative checks and 473-file PyChess TS pass |
| 2026-10-16 | Phase 3 batch 5 | All remaining conflicts resolved for independent review | Drawing/SVG fixes, glyph/FEN automatic additions and README/documentation reviewed | 218 Vitest / 25 files, 14 Chromium and all cumulative/actual-tree checks pass; 473-file consumer TS pass; review checkpoint, no commit/push |

| 2026-10-17 | Phase 3 batch 5 independent review | Approved; no blocking findings | Maintainer decision | Drawing/SVG and Batch 4 hover correction accepted; final integration verification authorized |
| 2026-10-17 | Final integration verification | Passed; ready for final independent review | Full staged audit, 218 Vitest, 14 Chromium per bundle, 929 consumer Jest, dev/prod, 473-file TS, 2 local acceptance tests | No product/test changes since approved Batch 5; only ledger updated; no commit/push |

### Merge issue log

Add entries as they are discovered:

| File or subsystem | Upstream change/SHA | Risk | Resolution | Regression test | Status |
| --- | --- | --- | --- | --- | --- |
| Real Git merge / 34 conflicts | `69f3451c9d70` | High | Reviewed batches approved; retain MERGE_HEAD | Final actual-tree and local consumer acceptance passed | 34 resolved, 0 unresolved; final independent review/commit approval pending; no commit/push |
| `premove.ts`, `predrop.ts`, `fen.ts`, `pocket.ts` | Initial ancestry audit above | High | Preserve fork HEAD bytes; useful fixes reviewed separately | Existing variant/boundary suite | Identity verified in index/worktree; deeper premove fix audit open |
| `src/sync.ts` | `7767222` | Low | Traverse elements, skipping text/comments; preserve exported shape interface | Two new HTML/SVG tests fail before fix and pass after | Batch 1 complete for review |
| Automatic additions / package tooling | `69f3451c9d70` | High | Preserve fork entry points/tooling; exclude incompatible release/lint additions | Archive and declaration identity, build/import checks | Glyph accepted unchanged, FEN round trip adapted; malformed-input behavior deferred explicitly |
| Config merging, FEN plus shapes, shape array ownership, module wrapper | `1ffe89b`, `a969e00`, `5bf6388`, `429a86a`; maintainer P2 correction | Medium | Port targeted fixes and shallow-copy FEN drawings while preserving fork state/APIs | Nine config/API cases, including two review regressions; full PyChess TS check | Batch 2 correction complete |
| Board/move/drop boundary | `53abc39`, `666803f`, `3c9c872`; fork `5eb4aa7` | High | Retain fork board and deletion of separate drop module; existing upstream fixes already present or incompatible with fork architecture | 22 additional boundary cases; existing callbacks/browser suites | Batch 3 approved |
| Input/render lifecycle and optional controls | `f9302c7`, `4b5b4ae`, `1f67781`, `f9e2ee3`, `d0a7531`, touch/hover history | High | Adapt to fork geometry/pockets; clear hover independently of enable flag, immediately on api.set disable | 20 focused tests including five red/green review regressions; 14 browser cases | Approved correction; final validation passed |
| Drawing/SVG and automatic glyphs/FEN tests | Histories and dispositions in batch 5 | High | Keep fork drawing contracts/geometry; port four focused fixes; accept string glyph catalogs; adapt FEN round trip | Nine drawing/glyph cases, four red/green fixes; cumulative 218 tests | Batch 5 approved; final validation passed |

### Exit checklist

- [x] Fork baseline, pinned upstream target and base SHAs recorded; actual merge commit pending approval.
- [x] Existing contracts protected by the approved regression suites, ownership checks and scoped local acceptance; exhaustive variant/platform coverage is not claimed.
- [x] No production-network calls; scoped local acceptance guarded to loopback.
- [x] Actual-tree library tests, typecheck, lint, format, build/imports/package checks pass.
- [x] Installed packed artifact passes PyChess dev/prod, full TS/Jest, lint/docs and the requested local Study/Practice acceptance.
- [x] README-X and progress ledger updated.
- [x] Final independent review and explicit authorization for merge commit, feature push and PR (2026-10-17).
- [ ] Execute the authorized two-parent merge/push/PR; record outcomes in the PR/handoff.
- [ ] Independent CI/PR-diff acceptance before any merge into master.
