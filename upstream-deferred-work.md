# ChessgroundX — Deferred upstream work and future implementation plan

Status: **Backlog / planning only. Nothing in this document is a prerequisite to the completed upstream merge.**
Created: 2026-10-17
Source of truth: [`upstream-merge.md`](upstream-merge.md), especially its completion summary, Batch 2 follow-ups, Batch 5 SVG decisions, and final readiness limits.
Upstream synchronized through: `69f3451c9d70d682d5421539f28d68a15cfda4cd` (integration commit `79db22a6749714961ecbcd4a593f9d6b1c1ea788`, PR [#65](https://github.com/gbtami/chessgroundx/pull/65)).

## Purpose and scope

This is a **handoff for a future Codex session**, not a request to reopen the merge. Track separately scoped improvements that were assessed but intentionally deferred or insufficiently verified. The upstream merge is complete, CI was green, and the recorded verification included 218 Vitest tests, 14 Chromium cases on each browser bundle, PyChess builds/typecheck, 929 Jest tests, and two local Study/Practice browser acceptance tests. Do not redo these wholesale without a specific reason.

**Invariant:** Preserve ChessgroundX's 16×16/rectangular geometry, encoded ranks 10–16, letter/promoted roles, integrated pockets/drop origins, custom premove/predrop hooks, current SVG/Study contracts, public exports, and PyChess consumer compatibility. `src/fen.ts`, `src/premove.ts`, `src/predrop.ts`, and `src/pocket.ts` remain fork-owned. Never contact the production pychess.org service from automated tests.

## Executive backlog

| ID | Item | Status at merge | Suggested priority | Nature |
| --- | --- | --- | --- | --- |
| FEN-1 | Dimension-aware malformed-FEN hardening | Upstream fixes assessed; not adapted | **P1** | Robustness, requires contract decisions |
| PM-1 | Audit remaining upstream premove changes for applicability | Three named commits assessed; wider history not audited | **P2** | Review first, no presumed code change |
| SVG-1 | Text labels on arrows/shapes | Deliberately excluded | **P2** if Study needs them | Optional feature |
| SVG-2 | Highlight shapes and below-piece rendering layer | Deliberately excluded | **P2** if requested | Optional feature / DOM architecture |
| SVG-3 | Pending-erase preview | Deliberately excluded | **P3** | Optional interaction polish |
| SVG-4 | Object-based custom SVG and related API/brush/erase changes | Deliberately excluded | **P3 / defer** | Potentially incompatible API redesign |
| UI-1 | Firefox/macOS gestures, trusted-event bypass | Existing fork behavior preserved | **P2** if reproduced issue | Platform compatibility |
| UI-2 | On-square coordinate layout and rank positioning | Not adopted | **P3** | Optional UI feature |
| REND-1 | Render pooling / visibility optimizations | Not adopted | **P3** with benchmarks | Performance-sensitive internal change |
| QA-1 | Broader cross-browser/variant and performance matrix | Not exhaustive at merge | **Risk driven** | Verification, not an endless coverage target |

Priorities are **recommendations for planning**, not urgency or evidence of current defects. Nothing here is known to be broken merely because it was deferred.

## Workstream FEN-1 — Malformed-FEN robustness

**Original upstream commits:** `cfdacd4` (ignore placements with invalid optional positions), `43a3c20` (guard promoted `~` lookups). ChessgroundX's `pos2key` and parser differ: a square outside a configured 8×8 board might still be representable in the global 16-file coordinate space. Therefore **do not cherry-pick upstream's optional-key guards**.

**Proposed plan**

1. Read `src/fen.ts`, `src/util.ts`, the fork FEN tests, and PyChess FEN consumers. Document the current semantics of malformed ranks, excess files/ranks, bad piece markers, and pocket syntax. First decide which cases must be rejected, ignored, or preserved; do not invent a contract from upstream tests alone.
2. Write narrowly scoped tests for configured `8×8`, `9×10`, and `16×16` boards: out-of-bounds placements; multi-digit empty runs; Shogi `+` and `~`; mirror markers; pockets; no accidental pieces leaking into valid positions. Include round trips of valid inputs to ensure compatibility.
3. Add dimension-aware bounds checks **inside the fork parser** if justified. Keep the existing `(fen, dimensions) → BoardState` and writer interfaces unchanged.
4. Run ChessgroundX unit/browser checks, local PyChess consumer/build/typechecks, and the relevant FEN/Study fixtures. Document intentional malformed-input semantics in README-X or tests.

**Done when:** defined malformed-input policy, tests with before/after evidence where applicable, valid variant FEN remains stable, no public API change. This should be a separate PR.

## Workstream PM-1 — Remaining upstream premove-history applicability

**Already assessed, no direct port:** `b8713a6`, `4859567`, `a2a2d84`. Their optional-key/occupancy-trimming or board-edge behavior differs from ChessgroundX's geometric candidate generator; the fork promotion-edge tests already cover the relevant examples. Upstream later removed its trimming machinery in `12f8805`.

**Proposed plan:** inspect only upstream premove commits since the recorded merge base that were not yet classified; maintain a small table of commit, intent, present in fork?, applicable?, action. Focus on *observable boundaries*: custom `premoveFunc`, `predropFunc`, selection, queuing/cancellation/replay, promotions and dimensions. Do **not** port upstream's standard-chess implementation wholesale or demand 100% branch coverage. Make code changes only for a demonstrated missing fix, with a focused regression.

**Done when:** applicability inventory completed; either explicitly **no code change** or a small separately tested PR.

## Workstream SVG — Optional drawing enhancements

These are independent features; do **not** implement as one broad SVG rewrite. Upstream related label/cache/center fixes recorded at merge include `6c530c7`, `7b09a68`, `afa5844`, `5317af1`. Their applicability depends on which optional drawing features are adopted; the merge did not claim to include them.

### SVG-1 — Text labels

**Behavior:** small text labels attached to a shape/arrow, potentially with custom fill and collision-aware placement. Possible Study usage: name candidate moves (`A`, `B`), identify teaching examples, or number key arrows.

**Plan:** confirm a PyChess Study/Practice UX requirement; design an **additive** `label?` shape property; adapt upstream text layout to variable dimensions and orientation; guard against unsafe markup; keep arbitrary brush names, existing arrows/circles, and legacy string `customSvg`. Test placement on 8×8, 9×10, 16×16, rotation, overlapping labels, SVG redraw and Study serialization if used. Review related upstream cache/label fixes before accepting the feature.

**Done when:** feature works across board sizes and existing consumers work unchanged. If no actual UX request exists, **defer**.

### SVG-2 — Highlights and below-piece SVG layer

**Behavior:** square highlights/overlays and shapes rendered underneath pieces instead of solely in the existing overlay plane. This differs from already adopted **custom square highlight configuration**; that existing feature does **not** imply a new below-piece SVG layer.

**Plan:** document z-order/DOM layering and interactions with board pieces, pockets, CSS, auto-pieces and Study annotations; define an optional per-shape below/highlight contract rather than changing all drawings. Adapt `src/wrap.ts`, `src/svg.ts`, `src/draw.ts`, `src/sync.ts`, CSS and DOM element references as needed; preserve default layering and dimension-aware transforms. Add targeted 8×8/rectangular/16×16 visual or DOM tests, orientation, resize and custom SVG compatibility.

**Done when:** opt-in layers do not hide or intercept interactions with pieces, no default rendering regression, PyChess Study/Practice fixtures pass. Prefer a separate PR from labels.

### SVG-3 — Pending erase preview

**Behavior:** when an existing arrow/circle is about to be toggled off by drawing it again, show reduced-opacity feedback during the gesture (upstream called this `pendingErase`; merge notes mention 60% normal opacity). The existing erase/toggle behavior must remain unchanged at completion.

**Plan:** study the coupled upstream `draw.ts` / `svg.ts` / `sync.ts` / `autoPieces.ts` implementation. Add preview state without mutating authored shapes or relying on brush-name restrictions; handle cancellation, touch rejection, multiple arrows and `eraseOnClick`. Preserve Ctrl/Alt/Shift brush behavior and arrow shortening. Test pointer start/move/cancel/end and post-cancel cleanup in browser.

**Done when:** preview is purely transient, opt-in if appropriate, and cancels/replacements leave no stale opacity/classes. Low priority.

### SVG-4 — API redesigns intentionally *not* adopted

Upstream object-valued SVG data, mandatory/default brush restrictions, alternate drawing layers, and an erase-option rename differ from ChessgroundX's string `customSvg`, arbitrary `DrawBrushes`, and `eraseOnClick` consumed by PyChess analysis. **Do not treat these as required modernization.** If a concrete feature demands one, first inventory actual PyChess consumers and design compatibility shims/deprecations. Avoid breakage or silent aliasing.

## UI-1 — Browser/platform input differences

The merge deliberately retained fork `isRightButton` and button/buttons + Ctrl/Alt/Shift semantics; upstream Firefox/macOS gesture changes and global `trustAllEvents` were **not** imported. The latter would be inconsistent while fork-owned pocket input still requires trusted events.

**Plan:** only investigate on a reproducible Firefox/macOS or automation-specific failure. Create a small browser/platform matrix for mouse right-click, Ctrl-click, modifier brushes, touch movement, drops and context menu. If a trusted-event bypass is desired for tests, inspect all pocket and board handlers before introducing any switch. Never weaken production input trust globally merely to make synthetic tests pass.

**Done when:** reproduced inconsistency fixed without breaking established input behavior, verified on affected platform and Chromium regression suite. Otherwise leave unchanged.

## UI-2 — Optional on-square coordinates

Upstream on-square coordinates/layout use assumptions tied to 8×8; fork supports several notation systems and ranks beyond 9. Do not expose a nonfunctional config flag. If there is a real UX request, first specify label glyphs, square alignment, orientation and notation on 8×8, 9×10 and 16×16 boards, then implement and test CSS/DOM rendering. This is separate from the merge.

## REND-1 — Pooling, visibility and performance

Upstream render pooling and `setVisible`-related changes were not adopted because they are coupled to ChessgroundX's square/piece removal and rendering model. No measured performance regression was established.

**Plan:** baseline real scenarios first (large-board animation, pocket updates, mini boards, Study arrows, repeated orientation and resize). Record repeatable CPU/render/allocation measurements and compare with current fork. Only attempt the upstream optimization if there is a meaningful measured problem and its invariants can be preserved; review lifecycle, DOM classes, hit-testing, callback order, and cleanup. Avoid broad refactoring for theoretical speedups.

## QA-1 — Targeted verification rather than full coverage

The 2026-10-17 merge passed a broad automated baseline, but not exhaustive combinations across all browsers/variants or full performance profiling. This is **not** an instruction to grow tests indefinitely. Add a specific case only when adopting a feature or correcting a demonstrated regression.

Recommended checks by risk:

- Standard per-PR: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run dist`, `pnpm run test:consumer`, plus formatter as configured in `package.json`.
- Browser changes: existing `scripts/test-browser-interactions.py` on local Chromium; affected Firefox/macOS or touch testing when relevant.
- PyChess-facing changes: local consumer builds/typechecking; targeted Study/Practice acceptance with localhost/mock services. Never send tests to production.
- Performance changes: reproducible pre/post measurements, not impressionistic speed claims.

## Recommended order and issue/PR boundaries

1. **FEN-1**: focused robustness investigation and, if justified, implementation (one PR).
2. **PM-1**: short source-history applicability audit (documentation-only unless a real fix is missing).
3. **SVG-2 or SVG-1** only after selecting an actual Study/Practice product need; implement independently. Below-piece layers are a plausible first choice but more invasive; labels may be simpler if that is the only requirement.
4. **SVG-3**: optional polish if requested.
5. **UI-1 / UI-2 / REND-1 / QA-1**: trigger only on a supported browser bug, feature request or performance evidence.

Do not automatically schedule or execute all of these. Close or defer an item explicitly if investigation shows the current fork is already correct.

## First message to a future Codex session

> Read `README-X.md`, `upstream-merge.md`, and `upstream-deferred-work.md`. Upstream merge PR #65 is **complete**; do not reopen it or replace the fork-owned `fen.ts`, `premove.ts`, `predrop.ts`, or `pocket.ts` wholesale. Pick **one** backlog ID, inspect relevant upstream commits and current PyChess consumers, and propose a scoped design plus verification plan before modifying production code. Preserve variable dimensions, role/pocket/annotation and public API contracts. Work on a new feature branch, run local/offline checks and never test against production pychess.org. Report what is proven, deferred or excluded; do not make unrelated tooling or formatting changes.

## Progress log (future work)

| Date | ID | Decision / findings | PR / commit | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-10-17 | ALL | Backlog extracted from completed merge review; no new implementation requested | — | Documentation only | Open / optional |
