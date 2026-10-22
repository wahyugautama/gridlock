# Engine API and extension guide

The engine is pure TypeScript under `src/engine`. It has no React or browser dependencies. Inputs are readonly; transitions return new state or the original state for illegal actions. The UI supplies randomness as unsigned 32-bit seeds; `createRandom` owns only local PRNG state. Do not put scoring, currency, or eligibility rules in components.

## State lifecycle (`game.ts`)

| Function | Contract |
| --- | --- |
| `createInitialState()` | Empty menu state; zero Credits/statistics and no modifiers. |
| `restartRun(seed)` | Fresh playing round 1; discards all prior run data. |
| `startRound(state, seed)` | From menu or shop only; resets board/queue/result/offers while preserving run data. Refuses round 9. |
| `canPlaceTile(state, row, column)` | Zero-based integer coordinates, playing phase, remaining tile, and empty cell required. |
| `placeTile(state, row, column)` | Consumes one queued tile immutably. Ninth placement calls `evaluateRound`. Illegal calls are no-ops. |
| `getRemainingMoves(state)` | Remaining legal placement count from queue and placement limit. |
| `isRoundComplete(state)` | True at nine placements in a started round. |
| `getRoundTarget(round)` | Configured target; rejects invalid rounds. |
| `evaluateRound(state)` | Records final score/outcome/reward and statistics exactly once; enters round-result. |
| `continueRun(state, seed, expected?)` | Result clear → shop; shop → next round; result failure/victory → terminal screen. Optional expected `{ phase, round }` rejects stale UI actions. |

The UI owns confirmation and persistence; an engine restart itself is unconditional. Use the expected-phase guard for user-originated Continue actions. Results are immutable snapshots; live scoring is not a substitute for stored historical results.

## Scoring (`scoring.ts`, `modifiers.ts`)

- `detectSegments(board)`: maximal occupied runs of at least three cells; horizontal rows followed by vertical columns.
- `evaluatePattern(values)`: first matching configuration by priority, or null for too-short input.
- `scoreBoard(board, modifiers = [])`: detects segments and base patterns, then calls `applyModifiers`.
- `applyModifiers(baseSegments, owned)`: deduplicates IDs, applies typed effect handlers, totals additions, applies factors, floors once.
- `getRoundStatus(state)`: live breakdown, target, remaining moves, completion, and recorded outcome when available.

`ScoringBreakdown` exposes `segments`, `baseScore`, `additiveBonus`, `subtotal`, `multiplier`, `unroundedTotal`, `roundingAdjustment`, `contributions`, and `totalScore`. Each contribution identifies the modifier, stage, points, related segment indices, and coordinates (or factor). Segment-adjusted points exclude board-level Crossfire and final multipliers to avoid double counting. All coordinates are zero-based internally.

## Shop (`shop.ts`)

- `calculateCreditReward(score, target)` implements the exact clear/over-target formula.
- `generateShopOffers(seed, round, owned)` performs seeded Fisher–Yates selection without replacement from unowned catalog entries.
- `openShop(state, seed)` accepts only cleared result screens for rounds 1–7; repeated calls cannot reroll.
- `canPurchaseOffer(state, offerId)` checks shop phase, offer existence, unpurchased status, unique ownership, and Credits.
- `purchaseOffer(state, offerId)` resolves prices/effects from the current offer, debits Credits, and appends ownership once. Invalid requests are no-ops.

## Save API (`save.ts`, `storage/local-save.ts`)

`serializeSave(state)` encodes a non-menu run with `SAVE_VERSION` and `RULESET_VERSION`. Modifier ownership and offers store IDs rather than effect definitions. `parseSave(raw)` returns a discriminated status: ready with validated state, empty, invalid, or incompatible. Browser adapter `loadLocalRun` adds unavailable on access failure; `saveLocalRun` and `clearLocalRun` return success booleans. Menu state is not persisted.

Validation checks runtime schema and domain invariants; effects are loaded from the canonical catalog. For a saved shop, newly purchased modifiers are excluded when verifying the already-completed round's score. Exact offers and purchase flags resume unchanged. Keep storage access outside the engine.

Bump `SAVE_VERSION` when the serialized representation changes. Bump `RULESET_VERSION` when old states no longer have the same interpretation (targets, scoring, prices, effect meanings). v0.1 rejects incompatible saves with a clear UI message; it does not migrate them. If adding migrations, keep them explicit and test them before validation.

## Adding a scoring pattern

1. Add its name to `PatternName` in `src/types/scoring.ts`.
2. Add its definition to `SCORING_PATTERNS` in `src/data/scoring.ts` in the intended priority position, with base points and minimum length.
3. Reuse a supported rule (`groups`, `straight`, `fallback`) where possible. For a new predicate, extend the typed rule union and `matchesPattern` in `scoring.ts`.
4. Test every applicable segment length, impossible/near-match cases, and precedence over/under existing patterns. Update the independent audit oracle deliberately rather than copying the implementation.
5. Review modifiers that target patterns, update README instructions, and bump the ruleset version if save compatibility changes. The in-game pattern table reads configuration automatically.

## Adding a modifier

1. Add a catalog entry in `src/data/shop.ts` with a stable unique ID, name, honest description, cost, and typed effect.
2. Reuse `patterns`, `sum`, `length`, `intersection`, or `multiplier`. Modifiers are data; never branch on display names in React.
3. For a new effect kind, extend `ModifierEffect` and the typed `Evaluators` registry and exhaustive dispatch in `src/engine/modifiers.ts`. Return transparent contributions with the correct stage, coordinates, and segment references.
4. Keep additive bonuses before multipliers and rounding once at the end. Ensure contributions reconcile with the final score.
5. Test the modifier alone, combined with existing modifiers, duplicated IDs, empty/short segments, and intersections. Test shop uniqueness, persistence, and schema limits when expanding the catalog beyond eight.
6. Update documentation and ruleset version as needed. The active modifier list and shop UI already render catalog descriptions.

The current save schema deliberately caps ownership at eight and offers at three; change these limits alongside catalog/rule expansions. Board size, round count, tile values, and placement counts are v0.1 assumptions in both types and validation and must be changed together.

## Simulation

`simulate(strategy, runs, firstSeed)` runs `random` or `greedy` placement using the production engine and cheapest-affordable-first purchasing. Greedy maximizes immediate whole-board score with seeded random tie breaks. It does not plan from the remaining visible queue. Environment and decision RNG streams are separate. CLI: `npm run simulate -- 1000 1`. Rates and denominator definitions are documented in the audit report.
