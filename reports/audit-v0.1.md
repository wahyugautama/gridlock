# GRIDLOCK v0.1 correctness and balance audit

Date: 2026-10-22 (Asia/Makassar). No score targets, pattern points, rewards, modifier effects, or prices were rebalanced.

## Correctness findings and fixes

1. **Fixed: queued Continue could skip the shop.** A shared Continue action interpreted the latest state without checking its source screen. Two queued actions from Round Clear could open and then leave the shop. The UI now supplies expected phase and round, and the engine rejects stale actions. A batched React interaction test and engine regression test cover this.
2. **Hardened: historical outcome was derived again from live modifiers.** `getRoundStatus` now uses the recorded clear/miss outcome when a result exists. This makes stored results authoritative rather than recalculating the outcome from later ownership. With the current positive-only modifiers and clear-only shops, no reachable clear-to-fail regression was observed; this is defensive state consistency, not a balance fix. The shop hides the previous board's live scoring breakdown; stored results remain authoritative.
3. **Added missing lint command.** ESLint with TypeScript recommended rules and React Hooks checks is configured. TypeScript changed from 7 to the supported 6.0 series because typescript-eslint's peer range excludes 7; dependency resolution was not forced. No runtime balance changes accompany this toolchain change.

## Audit coverage

| Area | Evidence / result |
| --- | --- |
| State transitions | Menu → playing → round-result; clear 1–7 → shop → next round; failure → game-over; clear 8 → victory. All advances require player input. Terminal states reject further continuation. |
| Invalid placements | Bounds, fractional and non-finite coordinates, occupied cells, empty queue, all inactive phases, and tenth-placement rejection covered. Updates preserve prior state. |
| Scoring | All 3,875 sequences of lengths 3–5 checked against an independent frequency oracle, plus maximal runs, gaps, edges, intersections, empty boards, and winning-pattern precedence. |
| Modifiers | Individual effects, all 256 ownership subsets, ownership-order invariance, duplicate-ID rejection, intersection counting, additive-before-multiplier order, and final floor rounding. |
| Credits | Exact target, below target, +24/+25/+49/+50 bonus boundaries, final-round reward, no failure reward, affordability, and simulated earned = spent + ending Credits. |
| Victory / defeat | Eight-round victory tested, failure tested on every round 1–8, no round 9, correct final-round failure, full run reset. |
| Idempotency | Re-evaluation cannot duplicate rewards; repeated and unknown purchases are no-ops; a second queued Continue cannot advance a different screen. |
| React state | Functional updates retained. Batched Continue regression, double-click purchase, occupied-cell repeat activation, new-round reset, restart, and transition focus tested in jsdom. |
| Keyboard / touch | Arrow keys, Home/End boundaries, Enter/Space, inspectable unavailable cells, scoring-line selection, touch-style pointer placement, reduced-motion final values, and heading focus tested. |
| Mobile layout | Source reviewed: five fluid square columns, compact gutters, single-column mobile shop, no fixed-width board. At a 320px viewport the board geometry leaves roughly 50px per cell. **Not visually verified on a real browser/device**; jsdom cannot measure actual rendering or touch scrolling. |

Intentional behavior: extending a maximal segment can reduce score by removing a length-based bonus (for example Minimalist on a three-cell segment). This is consistent with the specified rules, not a scoring defect. Straight recognition is order-independent; Double Trouble applies once to a One pair or Two pairs winning segment, as documented in the implementation.

## Simulation method

Run `npm run simulate` (defaults to 1,000 runs **per strategy**, 2,000 total). Optional arguments: `npm run simulate -- 1000 1` for count and first seed. The tool writes `reports/simulation.json` and prints tables. Raw console output for this audit is in `reports/simulation-console.txt`.

Seeds 1–1,000 were used for both strategies. Environment and decision random streams are separate; both strategies receive the same environment seed schedule at each reached round. Owned modifiers can change eligible shop pools. The tool calls the real placement, scoring, reward, shop, and progression functions.

- **Random:** uniformly selects a legal cell.
- **Greedy:** tries every legal placement and chooses the highest immediate modifier-adjusted whole-board score; ties are seeded random. It has no future-tile planning, despite the queue being visible to a human.
- **Identical purchase policy:** buy affordable unowned offers cheapest-first, using ID order to break price ties. No savings plan, effect valuation, or rerolls.

Survival below means **cleared that round / all 1,000 starting runs**. Average round score and Credits use **runs entering that round**, including failures. A dash means no run reached that round, not a measured score of zero. Aggregate Credits means all rewards earned per starting run, before spending. Purchase frequency is purchases / starting runs; unique ownership means it also equals the percentage of runs that acquired that modifier.

## Results

| Round | Random entered | Random survival | Random avg score | Greedy entered | Greedy survival | Greedy avg score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1000 | 4.4% | 8.54 | 1000 | 93.3% | 62.16 |
| 2 | 44 | 0.3% | 15.00 | 933 | 79.3% | 74.98 |
| 3 | 3 | 0.0% | 15.00 | 793 | 66.4% | 97.97 |
| 4 | 0 | 0.0% | — | 664 | 48.4% | 120.14 |
| 5 | 0 | 0.0% | — | 484 | 28.8% | 135.13 |
| 6 | 0 | 0.0% | — | 288 | 12.0% | 148.46 |
| 7 | 0 | 0.0% | — | 120 | 3.5% | 166.08 |
| 8 | 0 | 0.0% | — | 35 | 0.4% | 161.43 |

| Round | Random clear rate among entrants | Greedy clear rate among entrants | Random avg Credits earned | Greedy avg Credits earned |
| --- | ---: | ---: | ---: | ---: |
| 1 | 4.4% | 93.3% | 0.23 | 5.60 |
| 2 | 6.8% | 85.0% | 0.34 | 5.20 |
| 3 | 0.0% | 83.7% | 0.00 | 5.27 |
| 4 | — | 72.9% | — | 4.80 |
| 5 | — | 59.5% | — | 3.79 |
| 6 | — | 41.7% | — | 2.76 |
| 7 | — | 29.2% | — | 1.89 |
| 8 | — | 11.4% | — | 0.66 |

| Strategy | Wins / runs | Victory rate | Avg Credits earned | Avg Credits spent | Avg ending Credits |
| --- | ---: | ---: | ---: | ---: | ---: |
| random | 0 / 1000 | 0.0% | 0.245 | 0.169 | 0.076 |
| greedy | 4 / 1000 | 0.4% | 20.696 | 18.008 | 2.688 |

| Modifier | Random purchases | Random frequency | Greedy purchases | Greedy frequency | Greedy purchased when offered |
| --- | ---: | ---: | ---: | ---: | ---: |
| double-trouble | 17 | 1.7% | 740 | 74.0% | 100.0% |
| triple-threat | 5 | 0.5% | 662 | 66.2% | 58.8% |
| straight-shooter | 0 | 0.0% | 541 | 54.1% | 40.4% |
| crossfire | 7 | 0.7% | 710 | 71.0% | 79.2% |
| lucky-seven | 14 | 1.4% | 774 | 77.4% | 95.4% |
| minimalist | 7 | 0.7% | 611 | 61.1% | 69.6% |
| high-roller | 0 | 0.0% | 335 | 33.5% | 20.8% |
| multiplier | 0 | 0.0% | 117 | 11.7% | 6.1% |

## Interpretation

Greedy strongly outperforms random placement, so deliberate positioning matters. The steep late-run decline merits playtesting: only 35 greedy runs entered round 8 and 4 cleared it. The last-round average is therefore a small, selected sample. Random play's zero wins does not prove winning is impossible. Four wins in 1,000 is an imprecise estimate (roughly 0.16%–1.02% Wilson 95% interval); neither strategy is a model of an expert human who plans around the full queue.

Multiplier was acquired in only 11.7% of greedy runs and bought on 6.1% of its appearances. That is strongly confounded by the cheapest-first purchasing policy, which spends currency on cheaper offers before considering it. Purchase frequency is not a direct measurement of modifier strength. No claim of optimal play, seed fairness, or unwinnable seeds follows from these two baselines.

## Recommendations only — not applied

1. **Test a gentler late-round target curve:** keep rounds 1–3 at 30/45/65, then try 85/110/135/160/190 for rounds 4–8, versus 90/120/155/195/240 currently. Treat this as an experimental candidate, not an established balanced setting. The current baseline concentrates attrition in rounds 5–8.
2. **Hold pattern points initially.** Raising base patterns would change both early survival and Credit production, making the source of any improvement harder to interpret. The first-round greedy clear rate is already 93.3%.
3. **Test economy accessibility separately:** compare Multiplier at 6 Credits instead of 7, or High Roller at 5 instead of 6, one price change at a time. First add an effect-aware/save-for-upgrade purchase policy; current low acquisition is partly a policy artifact, not sufficient evidence that either price is wrong.
4. Add a queue-aware placement strategy and human playtests before selecting final targets. Re-run paired seeds for each candidate balance change and track modifier marginal score contributions as well as purchase counts.

## Verification

- `npm run test`: 133 tests across 9 files, including jsdom interactions and the exhaustive oracle.
- `npm run lint`: zero warnings/errors.
- `npm run build`: TypeScript and Vite production build pass.
- `npm run simulate`: 1,000 seeded runs per strategy completed; all reported balance values are unchanged.
- Real-browser visual layout, animation, screen-reader output, and physical touch behavior remain unverified because no browser is connected. DOM-level interaction tests are not a substitute for that check.
