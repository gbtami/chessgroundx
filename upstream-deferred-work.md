# ChessgroundX — Deferred upstream work and future implementation plan

Status: **FEN-1 assessed and skipped for compatibility; PM-1 audit complete; SVG-1–4 merged; drawing API alignment locally verified and authorized for separate GitHub review PRs. Remaining items are optional backlog. Nothing here is a prerequisite to the completed upstream merge.**
Created: 2026-10-17
Last assessed: 2026-10-19
Source of truth: [`upstream-merge.md`](upstream-merge.md), especially its completion summary, Batch 2 follow-ups, Batch 5 SVG decisions, and final readiness limits.
Upstream synchronized through: `69f3451c9d70d682d5421539f28d68a15cfda4cd` (integration commit `79db22a6749714961ecbcd4a593f9d6b1c1ea788`, PR [#65](https://github.com/gbtami/chessgroundx/pull/65)).

## Purpose and scope

This is a **handoff for a future Codex session**, not a request to reopen the merge. Track separately scoped improvements that were assessed but intentionally deferred or insufficiently verified. The upstream merge is complete, CI was green, and the recorded verification included 218 Vitest tests, 14 Chromium cases on each browser bundle, PyChess builds/typecheck, 929 Jest tests, and two local Study/Practice browser acceptance tests. Do not redo these wholesale without a specific reason.

**Invariant:** Preserve ChessgroundX's 16×16/rectangular geometry, encoded ranks 10–16, letter/promoted roles, integrated pockets/drop origins, custom premove/predrop hooks, current SVG/Study contracts, public exports, and PyChess consumer compatibility. `src/fen.ts`, `src/premove.ts`, `src/predrop.ts`, and `src/pocket.ts` remain fork-owned. Never contact the production pychess.org service from automated tests.

**Maintainer direction, 2026-10-19:** All preservation decisions in `upstream-merge.md` continue to apply to this backlog. In particular, FEN enhancements must always survive; skip conflicting upstream changes when adapting them would create excessive compatibility work. Deferred work does not authorize replacing fork contracts with upstream contracts.

**Drawing API clarification, 2026-10-19:** Drawing API changes may be considered when PyChess consumer code and tests are migrated together so the resulting behavior works correctly. This permits a separately scoped drawing API migration; the other preservation requirements still stand. SVG-1 below uses an additive property and does not require such a migration for existing consumers.

## Executive backlog

| ID | Item | Current disposition | Suggested priority | Nature |
| --- | --- | --- | --- | --- |
| FEN-1 | Dimension-aware malformed-FEN hardening | Assessed; skipped to preserve consumer validation | — | Reopen only with a coordinated parser/validator design |
| PM-1 | Audit remaining upstream premove changes for applicability | Complete through pinned upstream; no port needed | — | Applicability inventory below |
| SVG-1 | Text labels on arrows/shapes | Merged in PR #66; saved Study labels remain a consumer feature | — | Additive `label` property; verified locally |
| SVG-2 | Highlight shapes and below-piece rendering layer | Merged in library PR #67 and PyChess PR #2418 | — | Optional `below` and `modifiers.hilite` properties |
| SVG-3 | Pending-erase preview | Merged in [PR #68](https://github.com/gbtami/chessgroundx/pull/68) | — | Optional interaction polish |
| SVG-4 | Object-based custom SVG and related API/brush/erase changes | Anchors merged in PR #69; naming/type alignment assessed separately below | — | Optional input API extension |
| API-1 | Drawing API alignment | Upstream erase-option name and native brush type prepared; flexible dictionaries preserved | — | Coordinated library/consumer migration |
| UI-1 | Firefox/macOS gestures, trusted-event bypass | Existing fork behavior preserved | **P2** if reproduced issue | Platform compatibility |
| UI-2 | On-square coordinate layout and rank positioning | Not adopted | **P3** | Optional UI feature |
| REND-1 | Render pooling / visibility optimizations | Not adopted | **P3** with benchmarks | Performance-sensitive internal change |
| QA-1 | Broader cross-browser/variant and performance matrix | Not exhaustive at merge | **Risk driven** | Verification, not an endless coverage target |

Priorities are **recommendations for planning**, not urgency or evidence of current defects. Nothing here is known to be broken merely because it was deferred.

## Workstream FEN-1 — Malformed-FEN robustness

**Original upstream commits:** `cfdacd4` (ignore placements with invalid optional positions), `43a3c20` (guard promoted `~` lookups). ChessgroundX's `pos2key` and parser differ: a square outside a configured 8×8 board might still be representable in the global 16-file coordinate space. Therefore **do not cherry-pick upstream's optional-key guards**.

### Assessment and decision — 2026-10-19

**Skip these ports; leave `src/fen.ts` and `src/util.ts` unchanged.** The fork already guards a missing piece before setting `promoted` for `~`. Upstream's additional optional-key guard addresses a helper contract the fork does not have. Discarding out-of-bounds placements would also change an observable PyChess validation dependency.

PyChess `client/chess.ts::validFen()` calls `read(placement, dimensions)` and checks the returned piece coordinates against the variant's dimensions. A disposable bounds-check experiment changed only the fork parser's placement insertion to require `0 <= col < bd.width` and `0 <= row < bd.height`. Running the actual consumer validator produced:

| Full FEN (8×8 chess) | Existing parser keys | Existing `validFen()` | With experimental bounds check |
| --- | --- | --- | --- |
| `8p/8/8/8/8/8/8/K6k w - - 0 1` | `i8`, `a1`, `h1` | `false` | `true` |
| `16p/8/8/8/8/8/8/K6k w - - 0 1` | `undefined8`, `a1`, `h1` | `false` | `true` |

In each case filtering loses the evidence the validator currently uses to reject the FEN. All **67 built-in variant start positions** still passed the validator in both experiments, demonstrating why valid-input checks alone would miss this regression. This is a compatibility finding, not a claim that malformed keys are desirable or that the existing validator rejects every malformed input.

The investigation also recorded the existing parser behavior:

| Input aspect | Observed behavior; unchanged by this work |
| --- | --- |
| Dimensions / excess files | Width is not checked during placement. Coordinates use the global 16×16 encoding; excessive files can produce malformed keys. |
| Short or extra ranks | Short board strings are bottom-aligned. Without brackets, only the first `height` ranks form the board; the next slash segment is the pocket, and later segments are ignored. With brackets, all preceding ranks are parsed, including ranks beyond the configured height. |
| Empty runs | Consecutive digits form a multi-digit run, applied before the next piece token. The parser does not validate rank totals. |
| Piece tokens | All alphabetic letter roles and `*` wall squares are supported. Unknown punctuation can become an invalid role; the reader is not a strict FEN validator. |
| Promotion / mirror markers | `+` and `\|` flag the next piece and can survive rank separators. `~` flags the previously inserted piece when present; an intervening empty run does not advance its lookup. No new malformed-marker policy was imposed. |
| Pockets | Bracket and extra-slash forms count repeated ASCII letters by color. Digits and nonletters are ignored rather than treated as multiplicities or promotion prefixes. An unclosed bracket currently drops the final character through the existing slice behavior. |

Valid-input probes round-tripped **8×8, 9×10 and 16×16** positions combining `|+A`, `|z~`, `*`, repeated pocket letters and multi-digit runs. Extra-slash pockets normalized to the same bracket form; encoded top ranks remained `8`, `:` and `@`. Existing FEN/configuration/Alice/pocket tests also passed as part of the unchanged 218-test suite.

Consumer inspection used PyChess HEAD `e4547c09e3dab1412397c3c2c29aff58611998d3`: direct FEN imports in `chess.ts`, `material.ts`, `aliceBoard.ts`, `roundCtrl.ts`, `variants.ts`, and both analysis/two-board history modules. Alice explicitly partitions pieces by `mirror` and writes them back; these consumers retain the existing reader/writer interfaces. The experiment bundled the actual local consumer source with the existing parser and a temporary bounds-check version; neither repository's production source nor installed dependencies were edited. Evidence: `/tmp/chessgroundx-fen-review-2026-10-19/reproduce.mjs` and `results.json` (temporary local artifacts; the findings and fixtures above are the durable record).

**Reopening condition:** A concrete robustness requirement plus a coordinated design that validates raw placement in PyChess before the display parser discards invalid data, or another explicit compatible error-reporting contract. Do not silently change `read()` into a strict validator or normalize malformed promotion/mirror/pocket syntax as an incidental upstream port. The original implementation plan below is conditional on that prerequisite.

**Original plan, retained for a future explicitly scoped reopening**

1. Read `src/fen.ts`, `src/util.ts`, the fork FEN tests, and PyChess FEN consumers. Document the current semantics of malformed ranks, excess files/ranks, bad piece markers, and pocket syntax. First decide which cases must be rejected, ignored, or preserved; do not invent a contract from upstream tests alone.
2. Write narrowly scoped tests for configured `8×8`, `9×10`, and `16×16` boards: out-of-bounds placements; multi-digit empty runs; Shogi `+` and `~`; mirror markers; pockets; no accidental pieces leaking into valid positions. Include round trips of valid inputs to ensure compatibility.
3. Add dimension-aware bounds checks **inside the fork parser** if justified. Keep the existing `(fen, dimensions) → BoardState` and writer interfaces unchanged.
4. Run ChessgroundX unit/browser checks, local PyChess consumer/build/typechecks, and the relevant FEN/Study fixtures. Document intentional malformed-input semantics in README-X or tests.

**Done when:** defined malformed-input policy, tests with before/after evidence where applicable, valid variant FEN remains stable, no public API change. This should be a separate PR.

**Current outcome:** Investigation complete; implementation intentionally skipped under the maintainer's preservation direction. The implementation acceptance criteria above are not claimed as achieved.

## Workstream PM-1 — Remaining upstream premove-history applicability

**Already assessed, no direct port:** `b8713a6`, `4859567`, `a2a2d84`. Their optional-key/occupancy-trimming or board-edge behavior differs from ChessgroundX's geometric candidate generator; the fork promotion-edge tests already cover the relevant examples. Upstream later removed its trimming machinery in `12f8805`.

**Audit scope:** all commits touching upstream `src/premove.ts` in `fb399cc3240d..69f3451c9d70`, checked with `git log --reverse --no-merges -p` and the two merge commits' combined diffs. This is the completed merge's pinned range, not a claim about upstream commits after that target. Shared-module integration decisions already assessed in merge Batches 2–4 remain in force.

### Applicability inventory — 2026-10-19

**Outcome: complete; no production code change.** The table covers all **36 non-merge commits** in this range, including the three previously assessed promotion fixes for completeness. “Present” describes runtime behavior or implementation, not Git ancestry: the genuine upstream merge already made these commits ancestors.

| Commit | Intent | Present in fork? | Applicable? / action |
| --- | --- | --- | --- |
| `1e4b242` | Add `.js` import suffixes | Yes | Already present; no change. |
| `349c567` | Arrow-function cleanup | Yes, corresponding helpers | No further cleanup needed. |
| `65bc805` | Reindent role selection | Different variant dispatch | Formatting only; skip. |
| `cebe607` | Introduce friendly-piece trimming | No | Changes geometric-candidate contract; skip. |
| `cdced4f` | Fix knight movement after erroneous Set comparison | Yes, arithmetic movement | Faulty comparison absent; no port. |
| `dd9c8ef` | Extract movement helpers into util | No | Internal reorganization; keep fork helper/export contracts. |
| `6951532` | Allow bishop paths through an en-passant-removable pawn | No trimming | Path was never rejected by fork geometry; no port. |
| `ba4c4c2` | Extend en-passant path exception to rooks | No trimming | Same distinction; skip trimming and associated state/API change. |
| `244eea8` | Rename trimming option; change default | No | Preserve fork defaults; skip. |
| `4b2f156` | Rename upstream util direction helpers | No corresponding helpers | Naming only; skip. |
| `9448da9` | Trim blocked castling premoves | No | Preserve geometric candidates and variant castling; skip. |
| `bc964c4` | Trim using opponent pieces too | No | Changes occupancy policy; skip. |
| `e40d3f2` | Consolidate path checks / castling-trimming checks | No trimming | No corresponding path machinery; skip. |
| `43c30da` | Reject same-square movement inside helpers | Same public result | Fork filters the origin in `premove()`; preserve exported geometry helpers. |
| `c8b7b44` | Reorder trimming rejection checks | No trimming | No corresponding checks; skip. |
| `8aed7f3` | Add attack/occupancy trimming and turn guard | Turn eligibility enforced by board | Skip trimming; keep board availability/turn gating. |
| `15f25dd` | Refactor MobilityContext; rename unrestricted option | No | Different hook/state contract; skip. |
| `dc03533` | Repair rook/queen candidates behind an advancing enemy pawn | Geometric candidate already allowed | Faulty occupancy restriction absent; no port. |
| `408fca9` | Prefer `Map.has`, guard enemy lookup in trimming | No corresponding trimming code | No missing lookup fix; skip. |
| `87c3304` | Hoist per-destination context computation | No MobilityContext | Possible analogous optimization is performance work, not a missing behavioral fix; no change without measurements. |
| `93e53e2` | Repair absent-lastMove / Horde en-passant trimming | No trimming | Fork does not require lastMove to generate these geometric candidates; no port. |
| `a5b0625` | Guard missing enemy-pawn advance square | No off-board probe | Optional-key trimming path absent; no port. |
| `b8713a6` | Guard optional square in promotion/en-passant helper | No such helper | Prior no-port decision stands. |
| `3c9c872` | Precompute position/key pairs and guard optional keys | Dimension-bounded enumeration | Preserve `allPos(bd)` / global key contract; no standard 64-square cache or optional-key API. |
| `7d3a3c1` | Complete context destination rename | No MobilityContext | Internal rename; skip. |
| `c101fc8` | Reorder trimming-array guard for lint | No trimming | No corresponding code; skip. |
| `d1253f1` | Add per-role additional mobility predicates | Existing destination-generator hooks | Keep `premoveFunc` / `predropFunc`; no competing predicate API. |
| `4859567` | Restore promotion premoves at board edge | Yes, observable candidate | Existing white/black promotion regressions pass; no port. |
| `a2a2d84` | Restore promotion while trimming friendly destinations | Deliberately different occupancy policy | Keep friendly destinations as geometric candidates; existing regressions protect this. |
| `95a209b` | Replace per-role predicates with one role-aware predicate | Existing generator hooks, different API | Preserve caller-supplied generators and letter/promoted roles; no port. |
| `12f8805` | Remove trimming from Chessground | Already no trimming | Confirms the temporary trimming series is not required; no code to remove. |
| `b54a453` | Clarify pawn file-distance expression | Equivalent candidate geometry | Nonfunctional cleanup only; skip. |
| `03faf23` | TODO for removal of castling flag | No | Upstream/lila migration note; skip. |
| `60920b9` | Remove `MobilityContext.canCastle` | No; fork retains `canCastle` | Preserve `premovable.castle` and hook argument; do not make castling unconditional. |
| `c4cdf48` | Import/type lint changes | Fork imports retained | No behavior change; no unrelated formatting. |
| `fba9fcc` | Shorthand properties during tooling upgrade | No corresponding context object | No behavior change; skip. |

Merge commits `fe5fd1e` and `bb8bebb` have no additional combined-diff hunks in `src/premove.ts`; their constituent changes are included above. No unclassified premove-source commit remains in the pinned range.

**Boundary review:** `src/board.ts` checks piece/pocket availability, turn and premove enablement before calling the injected generators. It rejects same-origin moves, queues only returned destinations, revalidates replay against the current legal destination map, and clears the saved premove after success or failure. Cancellation clears selection/destinations. These responsibilities must stay outside the fork's pure geometric generator. PyChess `roundCtrl.ts` installs `premoveForVariant(...)` and `predrop(...)`; `cataloguedPremove.ts` wraps the fork generator for catalogued/promoted roles and forwards `canCastle`. Replacing these with upstream's standard-role `MobilityContext` would change real consumer contracts.

**Verification:** the existing 218-test suite passed (25 files), including `upstream-premove-applicability`, `upstream-board-boundaries`, `premove-matrix`, custom hook, cancellation/hover, pocket inventory and encoded-rank cases. No runtime files, tests or public signatures changed. No new browser/build/Study acceptance run is needed for this documentation-only disposition; the completed merge's earlier acceptance remains historical evidence, not a fresh result.

**Done when:** applicability inventory completed; either explicitly **no code change** or a small separately tested PR.

**Current outcome:** Done for the pinned upstream range; explicitly **no code change**.

## Workstream SVG — Optional drawing enhancements

These are independent features; do **not** implement as one broad SVG rewrite. Upstream related label/cache/center fixes recorded at merge include `6c530c7`, `7b09a68`, `afa5844`, `5317af1`. Their applicability depends on which optional drawing features are adopted; the merge did not claim to include them.

### SVG-1 — Text labels

**Behavior:** small text labels attached to a shape/arrow, potentially with custom fill and collision-aware placement. Possible Study usage: name candidate moves (`A`, `B`), identify teaching examples, or number key arrows.

**Original plan:** confirm a PyChess Study/Practice UX requirement; design an **additive** `label?` shape property; adapt upstream text layout to variable dimensions and orientation; guard against unsafe markup; keep arbitrary brush names, existing arrows/circles, and legacy string `customSvg`. Test placement on 8×8, 9×10, 16×16, rotation, overlapping labels, SVG redraw and Study serialization if used. Review related upstream cache/label fixes before accepting the feature.

### Implementation and verification — 2026-10-19

The maintainer selected SVG work; this first implementation is independently scoped to the **ChessgroundX rendering/API feature**. `DrawShape.label?: { text: string; fill?: string }` now works on manual and automatic arrows/circles, standalone brushless square badges, and shapes carrying legacy string `customSvg`. See [README-X.md](README-X.md#drawing-compatibility) for examples and semantics. No Study label-entry UI or saved-label protocol was introduced.

- Arrow labels sit near the arrowhead on the shaft; circle labels sit at the square center; brushless labels sit near the upper right of `orig`. The background defaults to the selected brush color or grey. Rendering uses `textContent` and never mutates caller data, including frozen label objects.
- Labels use the existing custom SVG overlay and account for its half-unit viewBox offset relative to the arrow plane. Transforms use fork orientation/dimensions and cell scaling. The 8×8, 9×10 and 16×16 paths retain encoded ranks and existing drawing/pocket/auto-piece behavior.
- Nearby incoming arrow directions use upstream's 16-slot label-placement idea, while **the fork's existing multi-arrow shortening rule remains unchanged**. The label cache includes actual incoming slots, text and resolved fill; changing one incoming arrow with the same arrow count or changing only fill invalidates the label correctly. The overlap rule is a heuristic, not a guarantee for arbitrary dense drawings.
- The label/custom SVG group shares a synchronized lifetime within the existing overlay. Labels coexist with string custom SVG, and replacement/removal leaves no stale label nodes. Existing nonlabel shapes retain their DOM structure; public renderer/sync signatures are unchanged. Gesture toggling, callbacks, arbitrary brush names and author-owned shape arrays retain their contracts.

Related upstream dispositions: `7b09a68` motivates synchronized label lifetime and label-aware cache identity; `afa5844` motivates incoming-direction invalidation (the fork includes the slots themselves, beyond just their count); `5317af1` supplies angle-slot collision ideas but its selective arrow-shortening change is excluded; `6c530c7` was reviewed for coordinate/custom-center assumptions, while the fork keeps its string custom SVG origin/viewBox contract. No object-SVG, highlight/below layer, erase-preview or erase-option migration was folded into this work.

**Consumer boundary:** current PyChess Study `studySync.ts::simpleShapes()` / `studyTree.ts` and PGN drawing serialization retain only `orig`, `dest` and `brush`. Existing flows remain compatible, but saved labels would be dropped by those paths. Transient auto-shape labels can be supplied directly. A saved-label feature must migrate client/server DTO validation, serialization/import/export, authoring UI and tests together; it is not claimed complete by this library feature.

| Check | Result |
| --- | --- |
| Library regressions | **230 passed, 26 files**; 12 new cases in `tests/svg-labels.test.ts`. Before implementation, nine of the first ten label cases failed; after implementation and additions, all 12 pass. |
| Library typecheck / lint / formatter / distribution / consumer imports | Passed; lint retains the same three pre-existing nonfatal warnings. |
| Local Chromium | **16 passed**, including two added label tests (one checks all three board sizes and both orientations). |
| Minified bundle | Three targeted Chromium cases passed: label geometry/literal text, trusted arrow toggle/overlay cleanup, and existing Study-like orientation redraw. |
| Packed PyChess consumer | Installed candidate into an isolated copy of PyChess HEAD `e4547c09e3dab1412397c3c2c29aff58611998d3`; **478-file nonincremental typecheck**, development/production builds and **113 Jest suites / 929 tests** passed. |
| Local Study/Practice acceptance | Existing `test_drawings_survive_piece_selection_and_moves` and `test_practice_browser_acceptance_and_analysis_restore`: **2 passed** against the production-built candidate; loopback-only Python/browser network guard. This verifies existing flows, not new label persistence. |
| Visual review | Inspected a Chromium preview of arrow/circle/corner badges on 8×8, 9×10 and 16×16 boards. |

Evidence root: `/tmp/chessgroundx-svg1-2026-10-19/` (`logs/`, installed `pychess/`, package tarball and `labels-preview.png`). Initial local acceptance could not initialize the board because the isolated copy lacked generated engine assets; running its unchanged `cp2static.sh` supplied them, then the same two tests passed. The first attempt is retained in `logs/attempt1-consumer-study-practice.txt`. Neither the live PyChess source/dependencies nor production services were changed.

**Review correction — 2026-10-19:** Guard the label's arrow-distance division when endpoints coincide or are nonfinite during zero-sized layout; use finite fallback coordinates and a zero scale when cell-size calculation is undefined. Two focused cases (0×0 and 0×400 bounds) fail before the correction and pass afterward, including valid label/arrow positioning after resize. The correction changes only label geometry and its regression tests. Revalidation passed: **232 Vitest tests**, TypeScript, lint (same three existing warnings), formatter, distribution/import checks, **16 Chromium + 3 minified cases**, packed consumer **478-file TypeScript / dev+prod builds / 929 Jest tests**, and **2 local Study/Practice acceptance tests**. All public declarations remain unchanged by this correction. Evidence: `/tmp/chessgroundx-svg1-review-2026-10-19/`.

**Current outcome:** [PR #66](https://github.com/gbtami/chessgroundx/pull/66), including the requested robustness correction, merged after maintainer approval and passing CI as `16c9908`. Saved Study label authoring/persistence remains a separate consumer feature. SVG-2/3/4 remain separate workstreams.

### SVG-2 — Highlights and below-piece SVG layer

**Behavior:** square highlights/overlays and shapes rendered underneath pieces instead of solely in the existing overlay plane. This differs from already adopted **custom square highlight configuration**; that existing feature does **not** imply a new below-piece SVG layer.

**Original plan:** document z-order/DOM layering and interactions with board pieces, pockets, CSS, auto-pieces and Study annotations; define an optional per-shape below/highlight contract rather than changing all drawings. Adapt `src/wrap.ts`, `src/svg.ts`, `src/draw.ts`, `src/sync.ts`, CSS and DOM element references as needed; preserve default layering and dimension-aware transforms. Add targeted 8×8/rectangular/16×16 visual or DOM tests, orientation, resize and custom SVG compatibility.

**Done when:** opt-in layers do not hide or intercept interactions with pieces, no default rendering regression, PyChess Study/Practice fixtures pass. Prefer a separate PR from labels.

### Implementation and verification — 2026-10-19

**Contract:** `DrawShape.below?: boolean` selects the lower SVG plane; omitted/false keeps the existing upper plane. Labels and legacy string custom SVGs follow their shape's plane. `DrawModifiers.hilite?: string` adds a contrasting color under-stroke to arrows/circles. Square overlays use the existing string `customSvg` with `below: true`; `highlight.custom` stays a separate square-class feature. Automatic piece ghosts remain in their existing HTML layer; `below` applies to SVG drawings.

The lower `.cg-shapes-below` / `.cg-custom-below` layers use the same dimension-aware viewBoxes as their upper counterparts and z-index 0: board backgrounds/built-in square highlights, lower SVG drawings, pieces (including fading pieces), then the existing upper planes. The existing `.cg-shapes` / `.cg-custom-svgs`, `Elements.svg` / `customSvg`, and public renderer/sync signatures are retained; optional `svgBelow` / `customSvgBelow` element references are additive. Layer and highlight changes participate in the shape hash, and both planes synchronize removals/replacements. Marker definitions are maintained in each arrow plane. Default shortening, brush names, gestures, label positioning/zero-bounds handling, callbacks, pockets and role/rank contracts stay unchanged.

Upstream `d030bb2` supplied the per-shape plane concept, adapted without its element-reference renames. The contrasting under-stroke follows `3405ee3`, with circle applicability reviewed against `24dbda1`; it deliberately uses a sharp outline, avoiding blur filters or changes to existing arrow/circle geometry. No object-SVG, erase-preview, mandatory-brush or erase-option migration was introduced.

**Consumer integration:** PyChess maintains its own board stylesheet and PNG compositor. Before its CSS change, Chromium computed the proposed lower nodes as static 300×150 SVGs with pointer events enabled. The companion branch `feature/chessground-svg-layers` adds their positioning/sizing/pointer/stacking rules to `static/chessground.css`, and copies their SVG content before pieces in `client/png.ts`. One focused PNG regression fails before the compositor change and passes afterward, verifying the serialized layer order and opacity/viewBoxes. These consumer changes also work with older ChessgroundX builds lacking the new nodes, so the companion update can land before upgrading the library. No dependency version bump or live dependency installation was made.

**Verification:** **242 Vitest tests / 27 files** passed (10 new layer/highlight cases; nine failed before implementation), along with typecheck, lint (same three existing warnings), formatter, distribution and consumer-import checks. Chromium passed **18 full-suite cases**, plus **four targeted cases on the minified bundle** and **four using PyChess's board CSS**. Coverage includes normal/fading piece stacking, actual native dragging through the lower layers, 8×8/9×10/16×16 coordinates, both orientations, resize, layer migration/cleanup and the label zero-bounds regression. A visual preview was inspected across all three board sizes.

An isolated copy of PyChess HEAD `e4547c09e3dab1412397c3c2c29aff58611998d3` plus the companion changes, using the freshly packed library, passed **478-file nonincremental TypeScript, 113 Jest suites / 930 tests, frontend lint, docs, development and production builds**, and **two existing local Study/Practice browser acceptance tests**. On those actual Study pages, three computed-style samples verified lower layers match board bounds, have z-index 0 and disable pointer events; stylesheet URLs were captured to verify the served cascade. The full template stylesheet chain/imports was also checked in desktop/mobile and light/dark cases. All acceptance network traffic was guarded to loopback.

**Scope boundary:** This adds rendering and compatible CSS/PNG consumption. Study still persists only basic `orig`/`dest`/`brush` drawings; saved planes/outlines/labels need a separate schema/serialization and authoring-UI migration. Evidence (package, isolated consumer, logs, CSS before/after samples/matrix, browser harness and `layers-preview.png`) is under `/tmp/chessgroundx-svg2-2026-10-19/`. Changes are on `feature/svg-layers-highlights` (library) and `feature/chessground-svg-layers` (consumer), ready for independent review; no approval to merge this work is assumed from PR #66's approval.

**Integration outcome:** Independently approved [library PR #67](https://github.com/gbtami/chessgroundx/pull/67) merged as `d8a6670` after Node.js/CodeQL checks passed. The separately reviewable [PyChess PR #2418](https://github.com/pychess/pychess-variants/pull/2418) was already merged with passing Node.js, Python and browser CI. No library release or deployment was performed by this work.

### SVG-3 — Pending erase preview

**Behavior:** when an existing arrow/circle is about to be toggled off by drawing it again, show reduced-opacity feedback during the gesture (upstream called this `pendingErase`; merge notes mention 60% normal opacity). The existing erase/toggle behavior must remain unchanged at completion.

**Plan:** study the coupled upstream `draw.ts` / `svg.ts` / `sync.ts` / `autoPieces.ts` implementation. Add preview state without mutating authored shapes or relying on brush-name restrictions; handle cancellation, touch rejection, multiple arrows and `eraseOnClick`. Preserve Ctrl/Alt/Shift brush behavior and arrow shortening. Test pointer start/move/cancel/end and post-cancel cleanup in browser.

**Done when:** preview is purely transient, opt-in if appropriate, and cancels/replacements leave no stale opacity/classes. Low priority.

### Implementation — 2026-10-19

`drawable.previewErase?: boolean` defaults to false. When enabled, the renderer derives pending removal from the active gesture and the existing `addShape` first-endpoint/brush rule. It fades every manual drawing that this toggle would remove, suppresses the duplicate gesture and retains the original shortening/geometry. Changing the destination or brush, cancelling or disabling the option restores ordinary rendering. Automatic shapes, check counters and HTML piece ghosts are excluded. With the option enabled, manual/automatic hashes have separate identities so identical hints survive preview transitions without extra SVG nodes. Render metadata and hashing are private to `svg.ts`; neither authored shapes nor the exported `SyncableShape` contract change, and `autoPieces.ts` needs no adaptation.

The 60% opacity multiplier applies once to each rendered arrow/circle/outline group and each matching label/custom SVG overlay on either plane. No new CSS or shape serialization is required. An opted-in drawing cancels on native `touchcancel` to avoid leaving transient feedback active; the default input path is unchanged. Drawing completion, `eraseOnClick`, modifier brushes, callbacks, dimensions, pockets and fork-owned modules remain unchanged. PyChess's existing configuration leaves this feature disabled and needs no consumer migration.

This adapts upstream `12b25c7` / `7053faa` without their required sync-interface property or single-matching-shape assumption. The fork permits caller-supplied duplicate endpoints and uses the first matching shape's brush to choose removal versus replacement; the preview follows that actual behavior. Verification passed on `feature/svg-erase-preview`, with evidence under `/tmp/chessgroundx-svg3-2026-10-19/`. Review is in [PR #68](https://github.com/gbtami/chessgroundx/pull/68), independent of the approved SVG-2 merge; approval to merge SVG-3 is not assumed.

**Verification:** **253 Vitest tests / 28 files** passed, including 11 focused preview cases; eight of the initial ten cases failed before implementation. Coverage includes the unchanged default path, circles/arrows, shared destinations, duplicate-endpoint removal/replacement, custom brushes and group opacity, both planes, labels/custom SVGs, immutable authored shapes, automatic hints/ghosts (including the same shape object supplied to both arrays), cancellation and opt-out cleanup. TypeScript, lint (same three existing warnings), formatter, distribution, consumer-import checks and package creation passed.

Chromium passed **20 full-suite cases**, plus **four on the minified bundle** and **four with PyChess CSS**. The new native-input cases cover moving into/out of a pending toggle, existing pointer cancellation, completion/callback counts on 8×8/9×10/16×16 including black orientation, trusted touch cancellation and multi-touch rejection. No production PyChess service was contacted.

The packed candidate in an isolated copy of PyChess `9cb01994dfedf0fbf6122c8c745e14b5320d9cd8` passed nonincremental TypeScript, lint, docs, dev/prod builds, **113 Jest suites / 930 tests**, and **two existing local Study/Practice browser acceptance tests**. The consumer source/dependency installation is unchanged; local acceptance traffic was guarded to loopback. These checks establish existing consumer compatibility, while the standalone native-input cases with PyChess CSS exercise the opt-in feature.

**Integration outcome:** Independently approved [PR #68](https://github.com/gbtami/chessgroundx/pull/68) merged as `1118bed` after Node.js/CodeQL checks passed. The maintainer explicitly left general touch cancellation with `previewErase` disabled outside that PR. No library release or deployment was performed.

### SVG-4 — Compatible custom SVG anchors and remaining API redesigns

**Original boundary:** Upstream object-valued SVG data, mandatory/default brush restrictions, alternate element references, and an erase-option rename differ from ChessgroundX's string `customSvg`, arbitrary `DrawBrushes`, and `eraseOnClick` consumed by PyChess analysis. The maintainer permits drawing API changes with coordinated consumer/test adaptation when needed. Avoid replacing established contracts merely to match upstream.

### Implementation and verification — 2026-10-19

**Contract:** `DrawShape.customSvg` now accepts `string | DrawCustomSvg`, with exported `DrawCustomSvg = { html: string; center?: 'orig' | 'dest' | 'label' }`. Existing strings retain origin anchoring, their 100×100 local view box and existing DOM. An object defaults to the same origin placement; `dest` centers its local view box on the destination square (or origin when absent), while `label` centers it on the existing custom shape's badge position, even without text. Custom SVGs retain exclusive overlay rendering: an accompanying brushed arrow/circle uses a separate shape. Label positioning stays unchanged; brushless custom shapes use the existing corner badge and brushed custom shapes use the origin center. These choices deliberately preserve fork semantics rather than importing upstream's automatic brushed-shape/custom-SVG composition.

This adapts the object/anchor contract in pinned upstream `69f3451` and the local-coordinate correction reviewed in `6c530c7`. Only the SVG content/anchor extension is adopted. Arbitrary brush names, `eraseOnClick`, upper/lower classes and element references, renderer/sync signatures, label text rendering, immutable authored objects, preview lifetimes and fork geometry remain intact. Hashing includes object HTML and the effective anchor, so in-place updates and plane changes refresh correctly. No default field is written into a caller's object. String producers, including glyph helpers and check counters, keep their existing contracts; code reading the widened `customSvg` union must narrow it before treating it as text. There is no string deprecation or erase-option alias.

**PyChess inventory:** At `9cb01994dfedf0fbf6122c8c745e14b5320d9cd8`, analysis/tree, promotion, Study/Practice/gamebook and two-board clients pass `DrawShape` values through without string operations on `customSvg`. The only property reader is `client/study/studySync.ts::simpleShapes()`, whose existing truthiness guard excludes both SVG forms from saved basic annotations. Its current PNG compositor consumes rendered SVG DOM, so object inputs need no compositor/CSS adaptation. No live consumer source, dependency or production behavior change is necessary.

**Verification:** **265 Vitest tests / 29 files** passed, including 12 focused anchor cases (10 failed before implementation). Tests cover unchanged string/default-origin placement, actual HTML, default-field immutability, arbitrary/unused brush names, both planes and orientations on 8×8/9×10/16×16, destination fallback, label/no-text alignment, HTML/anchor cache changes, rotation/resize, cleanup and independent manual/automatic erase previews. TypeScript, lint (same three existing warnings), formatter, distribution, consumer-import and package checks passed. Chromium passed **21 full-suite cases**, plus **four on the minified bundle** and **four using PyChess CSS**. The new native geometry case verifies all three anchors against real cell/badge positions on both planes and orientations, before/after resize, across all three board sizes.

The packed candidate in an isolated copy of PyChess passed nonincremental TypeScript, lint, docs, dev/prod builds, **113 Jest suites / 930 tests**, and **two existing local Study/Practice acceptance tests**. For additional consumer evidence, the isolated copy's existing Study serialization test input was strengthened with an object SVG alongside its legacy string; its original outgoing basic-annotation expectation remained unchanged and passed. This also typechecks the new object input at the real consumer boundary. The live consumer checkout is unchanged. Acceptance network traffic was guarded to loopback; no automated production tests were used.

**Scope boundary:** Saved custom SVGs/labels/planes/outlines and their authoring UI remain separate consumer work. Mandatory brush names, the erase-option rename and incompatible element-reference/API replacements remain deferred. This implementation is on `feature/svg-custom-anchors`, ready for independent review; earlier SVG merge approvals do not authorize merging it. Evidence is under `/tmp/chessgroundx-svg4-2026-10-19/`.

**Integration outcome:** Independently approved [PR #69](https://github.com/gbtami/chessgroundx/pull/69) merged as `25c077a` after Node.js/CodeQL checks passed. The brush/erase redesigns were excluded from that approval. The new explicit API-alignment task below is separately scoped and does not reopen the SVG feature implementation.

## API-1 — Drawing API alignment, 2026-10-19

**Audit bases:** Current ChessgroundX `25c077acc14e45bc822c1433a10c54c7ab68a540`, freshly fetched upstream master `69f3451c9d70d682d5421539f28d68a15cfda4cd`, and PyChess working HEAD `9cb01994dfedf0fbf6122c8c745e14b5320d9cd8` (same source tree as freshly fetched master `b9375141118b50f42c4e8d32834ebfcc3775bca8`). GitHub confirms PRs #66–#69 merged. Work is on separate `feature/upstream-drawing-options` branches in both repositories. After local verification, the maintainer authorized commits, pushes and separate GitHub PRs for independent ChatGPT review.

| Question | Verified findings | Decision |
| --- | --- | --- |
| `DrawBrush` | Identical fields and types in fork/upstream | Already aligned; no change |
| `DrawBrushes` | Upstream requires green/red/blue/yellow plus an index signature. The fork accepts custom-only dictionaries/patches and arbitrary brush names. PyChess declares no custom dictionary. | Preserve the open public dictionary and programmatic `DrawCurrent.brush: string`; imposing required keys/narrowing would discard supported configuration for cosmetic similarity. No alternate configuration type/framework. |
| Native brush typing | Upstream `BrushColor` and modifier formula describe the same four native results. Fork right-button platform handling differs and is intentionally preserved. | Add the upstream `BrushColor` export and use it for the internal selection array/return type. `DrawShape.brush` remains a string, as upstream also permits. |
| Default palettes and real consumers | Eight shared presets have identical values. PyChess uses standard Study colors, `paleGreen` analysis/two-board/gamebook hints, `paleBlue` Practice hints, and empty brush names on promotion ghosts. Upstream's five extra presets have no current PyChess call site. | Preserve existing defaults and all hints/ghosts; adding unused presets is outside this focused alignment. |
| Click-erasure semantics | Both board implementations gate clearing on no previous selection, drawing enabled, then `(option || !piece || piece.color !== turnColor)`. Neither checks legal mobility. Both event paths skip board input when view-only. Fork nonempty pockets use the equivalent color/selection predicate. | Adopt `eraseOnMovablePieceClick` in config, runtime state and both fork input readers; retain the predicates/default true. There is no semantic trade-off and `previewErase` stays separate. |
| Consumer transition / alias | Actual consumer `client/analysis/analysisCtrl.ts` sets false in Study and true otherwise. PyChess still declares `chessgroundx: ^10.7.5`; its installed 10.7.5 exposes only `eraseOnClick`. | No library alias. A temporary direct consumer dual write supplies both names from one boolean, supporting either runtime and either declaration set. Merge the consumer bridge before a library upgrade; remove the old key only when the dependency minimum guarantees the new option. No version bump or live dependency replacement is made by this task. |

The rename changes API spelling, not which presses erase drawings. Empty/opponent-color squares clear only when no selection is active and drawing is enabled. Turn-color pieces can retain drawings with false even if the piece is not legally movable. View-only and disabled-drawing paths preserve annotations. Clearing manual drawings leaves automatic hints untouched and calls the annotation callback only when drawings actually existed. Native gestures, trust gates, variant coordinates, promotion, pockets, SVG objects/strings, labels, layers, outlines and preview logic are otherwise unchanged. The only pocket-module edit is the option identifier at its existing clearing predicate.

**Status:** Implementation and local verification complete; the maintainer has authorized commits, pushes and separately reviewable GitHub PRs. Merge, release and deployment remain subject to separate approval. Evidence is under `/tmp/chessgroundx-drawing-api-2026-10-19/`, with separate candidate and legacy-10.7.5 consumer copies.

**Verification:** `pnpm run typecheck`, `lint`, `check-format`, `test` (**269 Vitest cases / 29 files**), `dist`, `test:consumer` and `pnpm pack` passed. Lint reports the same three existing warnings. The Chromium suite passed **23 cases**, including two focused board/pocket erasure regressions that failed before the rename, plus **five targeted minified cases** and **five with PyChess CSS**. Existing custom brushes, all SVG features and preview tests pass; the modifier case now explicitly checks Ctrl/Shift/Alt/Meta selections across all four native colors. No input/trust or renderer logic changed.

The actual modified PyChess source was verified in two isolated copies: one with its installed/released **10.7.5**, and one with the freshly packed candidate. **Both** passed `yarn typecheck --incremental false`, `yarn lint`, `yarn test --runInBand` (**113 suites / 930 tests each**), `yarn dev`, `yarn prod`, `yarn md`, and the existing local Study drawing / Practice browser acceptance cases (**two per runtime**). All acceptance network traffic was guarded to loopback, with no blocked external attempts. This proves the temporary consumer bridge works before and after the library upgrade without modifying dependency constraints or installed packages.

An optional PyChess touched-file formatter check reports three existing external-engine formatting hunks in `analysisCtrl.ts`, identical to baseline apart from shifted line numbers; the new drawing block introduces none. Those unrelated lines are preserved to respect the no-mass-formatting constraint. Full Python/tournament suites were not run for this client-only migration. Library and consumer remain separate commits/PRs under the maintainer's authorization for independent review. Retiring the consumer's legacy key remains open until a released minimum dependency guarantees the canonical option.

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

1. **FEN-1**: assessed 2026-10-19; upstream hardening skipped for consumer compatibility. Reopen only under the coordinated validation prerequisite above.
2. **PM-1**: completed 2026-10-19; no missing applicable fix demonstrated, no code change.
3. **SVG-1**: merged in PR #66; saved Study labels remain separate. **SVG-2**: merged in PR #67 and companion PyChess PR #2418.
4. **SVG-3**: merged in PR #68; general touch cancellation with preview disabled remains separate.
5. **SVG-4**: anchors merged in PR #69. **API-1**: drawing naming/type alignment is locally verified on separate library/consumer branches and authorized for GitHub review PRs; merge approval remains separate.
6. **UI-1 / UI-2 / REND-1 / QA-1**: trigger only on a supported browser bug, feature request or performance evidence.

Do not automatically schedule or execute all of these. Close or defer an item explicitly if investigation shows the current fork is already correct.

## First message to a future Codex session

> Read `README-X.md`, `upstream-merge.md`, and `upstream-deferred-work.md`. Upstream merge PR #65 is **complete**, and its preservation decisions still apply, with the maintainer's explicit allowance for coordinated drawing API/consumer/test migrations. FEN-1 was assessed and skipped for consumer compatibility; PM-1 is complete through the pinned upstream target with no code change. SVG-1 merged in PR #66; SVG-2 merged in library PR #67 and PyChess PR #2418. SVG-3 merged in PR #68. SVG-4 anchors merged in PR #69. A separate explicit API-1 task prepares the upstream erase-option name and native brush type on separate `feature/upstream-drawing-options` branches in both repositories, with a temporary consumer dual write for installed 10.7.5. Commits, pushes and GitHub review PRs are authorized; do not merge, release or deploy without separate approval. Flexible/custom-only brush dictionaries and general touch cancellation with preview disabled remain preserved/outside scope. Saved Study label/plane/outline authoring/persistence is separate. Do not automatically restart either audit or replace the fork-owned `fen.ts`, `premove.ts`, `predrop.ts`, or `pocket.ts` wholesale. Keep SVG workstreams independently scoped. Inspect relevant upstream commits and current PyChess consumers, then propose a scoped design plus verification plan before modifying production code. Preserve variable dimensions and role/pocket contracts; drawing API changes require coordinated consumer/test migration. Work on a new feature branch, run local/offline checks and never test against production pychess.org. Report what is proven, deferred or excluded; do not make unrelated tooling or formatting changes.

## Progress log (future work)

| Date | ID | Decision / findings | PR / commit | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-10-17 | ALL | Backlog extracted from completed merge review; no new implementation requested | — | Documentation only | Open / optional |
| 2026-10-19 | FEN-1 | Skip upstream bounds hardening: actual PyChess validator changes from rejecting to accepting overflowing piece placements when those pieces are discarded; all fork enhancements retained | Documentation on `feature/upstream-svg-enhancements` | Two rejected-to-accepted consumer examples; 67 valid start positions; 8×8/9×10/16×16 extension round trips; existing 218 tests passed | Assessed / implementation skipped |
| 2026-10-19 | PM-1 | Classified 36 non-merge premove-source commits plus two merges; preserve geometric generator, custom hooks and castling flag; no missing applicable fix | Documentation on `feature/upstream-svg-enhancements` | Source/consumer boundary audit and existing 218 tests passed | Complete / no code change |
| 2026-10-19 | SVG-1 | Add optional text badges; preserve fork geometry, string custom SVG, arbitrary brushes and default drawing behavior; saved Study labels remain separate | `feature/upstream-svg-enhancements` | 230 unit tests; typecheck/lint/format/dist/import checks; 16 Chromium + 3 minified cases; packed consumer 478-file TS, dev/prod, 929 Jest, 2 local Study/Practice acceptance; visual preview | Library rendering/API ready for independent review |
| 2026-10-19 | SVG-1 review correction | Guard zero/nonfinite arrow distance and undefined label scale; two regressions cover hidden bounds and recovery after resize; no feature expansion | [PR #66](https://github.com/gbtami/chessgroundx/pull/66) | 232 unit tests; TypeScript/lint/format/dist/import checks; 16 Chromium + 3 minified; packed consumer 478-file TS/dev/prod/929 Jest; 2 local Study/Practice; unchanged declarations | Local checks passed; maintainer approves merge after checks |
| 2026-10-19 | SVG-1 integration | Review correction accepted; PR #66 merged with green CI under maintainer authorization | `16c9908` / [PR #66](https://github.com/gbtami/chessgroundx/pull/66) | Node.js and CodeQL checks passed on correction `3982979` before merge | Merged |
| 2026-10-19 | SVG-2 | Add optional lower SVG planes and contrasting arrow/circle outlines; coordinate PyChess CSS and PNG export while retaining existing defaults/APIs | `feature/svg-layers-highlights` + PyChess `feature/chessground-svg-layers` | 242 unit; typecheck/lint/format/dist/import; 18 Chromium + 4 minified + 4 consumer-CSS; packed consumer 478-file TS, 930 Jest, lint/docs/dev/prod; 2 local Study/Practice; actual served CSS and light/dark mobile/desktop matrix | Ready for independent review |
| 2026-10-19 | SVG-2 integration | Independent library review approved; library and separate consumer PRs merged with passing CI | `d8a6670` / library [PR #67](https://github.com/gbtami/chessgroundx/pull/67); PyChess [PR #2418](https://github.com/pychess/pychess-variants/pull/2418) | Library Node.js/CodeQL and consumer Node.js/Python/browser CI passed | Merged; no release/deployment |
| 2026-10-19 | SVG-3 | Add opt-in renderer-only erase feedback; retain first-match toggling, callback/shape ownership, normal shortening and defaults; cancel opted-in touch feedback on native cancellation | [PR #68](https://github.com/gbtami/chessgroundx/pull/68) / `feature/svg-erase-preview` | 253 unit; typecheck/lint/format/dist/import/package; 20 Chromium + 4 minified + 4 consumer-CSS; packed consumer TS/dev/prod/lint/docs/930 Jest; 2 local Study/Practice | Ready for independent review |
| 2026-10-19 | SVG-3 integration | Independent review approved; opt-in erase preview merged; general touch cancellation with preview disabled explicitly left outside scope | `1118bed` / [PR #68](https://github.com/gbtami/chessgroundx/pull/68) | Node.js/CodeQL passed on approved `ba97ba0` | Merged; no release/deployment |
| 2026-10-19 | SVG-4 | Add object SVG anchors alongside legacy strings; preserve exclusive overlays, brushes/erase APIs and fork contracts; consumer inventory needs no runtime migration | `feature/svg-custom-anchors` | 265 unit; types/lint/format/dist/import/package; 21 Chromium + 4 minified + 4 consumer-CSS; packed consumer TS/lint/docs/dev/prod/930 Jest including stronger Study fixture; 2 local Study/Practice | Ready for independent review |
| 2026-10-19 | SVG-4 integration | Independent review approved; anchors merged separately from brush/erase API alignment | `25c077a` / [PR #69](https://github.com/gbtami/chessgroundx/pull/69) | Node.js/CodeQL passed on approved `b1c6e30` | Merged; no release/deployment |
| 2026-10-19 | API-1 | Equivalent erasure predicate; adopt upstream option name, preserve flexible brushes, type native colors; bridge PyChess old/new runtimes with one temporary dual write | Separate `feature/upstream-drawing-options` commits/PRs | 269 unit; type/lint/format/dist/import/package; 23 Chromium + 5 minified + 5 consumer-CSS; PyChess old/new TS/lint/docs/dev/prod/930 Jest each; 2 local Study/Practice each | Local verification complete; authorized for independent GitHub review |
