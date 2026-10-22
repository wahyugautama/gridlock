# GRIDLOCK v0.1

A locally playable, single-player roguelike puzzle prototype. Eight rounds, nine tiles per round, and a permanent modifier collection built during each run. No authentication, accounts, multiplayer, backend, leaderboards, or monetization.

## Run locally

Use Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Choose **Play**, or **Resume Run** if a valid save exists. **How to Play** explains the rules. Do not open `dist/index.html` directly with `file://`; serve it through Vite preview or another static HTTP server.

```sh
npm run test       # engine and DOM interaction tests
npm run lint       # TypeScript/JavaScript and Hooks checks
npm run build      # typecheck and production build into dist/
npm run preview    # serve the production build locally
npm run simulate -- 1000 1  # 1,000 seeded runs per strategy
```

Stack: Vite, React, TypeScript, Tailwind CSS, Vitest, npm. Zod validates local save data. The production game runs entirely in the browser.

## Game rules

- Each round starts with an empty 5×5 board and a visible queue of nine integer tiles valued 1–5.
- Place the next tile in an empty cell. Tiles cannot move or be replaced.
- After nine placements, the final score must meet or exceed the target. Failure ends the run. Clearing round eight wins.
- Round targets: **30, 45, 65, 90, 120, 155, 195, 240**. These are provisional balancing values.
- Results pause for acknowledgment. Cleared rounds 1–7 lead to a shop, then the next round. Board and queue reset; Credits, modifiers, and cumulative statistics persist.

Only maximal horizontal and vertical occupied runs of at least three cells score. Empty cells and edges bound runs; smaller subsets inside a run do not score separately. Intersections contribute in both directions. Diagonals never score. Each segment scores only its highest-ranking pattern:

| Priority | Pattern | Points |
| --- | --- | ---: |
| 1 | Five of a kind | 150 |
| 2 | Straight (five consecutive values, in any order) | 100 |
| 3 | Four of a kind | 80 |
| 4 | Full house (3+2, five tiles) | 65 |
| 5 | Three of a kind | 40 |
| 6 | Two pairs | 25 |
| 7 | One pair (segment of at least three tiles) | 10 |
| 8 | No combination | 5 |

Patterns are limited by actual segment length. Adding a tile may change a pattern or remove a length-based modifier bonus, so live score can decrease.

## Credits and modifiers

Start with 0 Credits. Each clear awards **5 + floor((score − target) / 25)** Credits; failure awards zero. The round-eight clear also earns Credits. Rewards are recorded once from the final adjusted score.

Shops offer up to three distinct, seeded, unowned modifiers. Buy multiple affordable offers or leave without purchasing. No rerolls. Each modifier can be owned once per run. When fewer than three unowned modifiers remain, fewer offers appear; when all are owned the shop can still be left.

| Modifier | Effect | Credits |
| --- | --- | ---: |
| Double Trouble | +10 per winning One pair or Two pairs segment | 3 |
| Triple Threat | +25 per Three of a kind segment | 4 |
| Straight Shooter | +50 per Straight segment | 5 |
| Crossfire | +10 per cell shared by qualifying horizontal and vertical segments | 4 |
| Lucky Seven | +20 per qualifying segment whose values sum to exactly 7 | 3 |
| Minimalist | +15 per three-cell scoring segment | 4 |
| High Roller | +40 per Four of a kind or Five of a kind segment | 6 |
| Multiplier | ×1.25 after all additions | 7 |

Double Trouble awards one bonus per Two pairs segment, not per pair, and does not apply to a Full house. Crossfire counts each qualifying intersection once. Segment additions and intersection additions are applied before final multipliers; round down once at the end. For example, `[1,1,5]` with Double Trouble, Lucky Seven, Minimalist, and Multiplier scores `floor((10+10+20+15)×1.25) = 68`.

## Controls and feedback

Click/tap an empty cell, or Tab into the board and use arrows to navigate and Enter/Space to place. Home/End move to row boundaries; Ctrl+Home/End move to board boundaries. Occupied cells remain inspectable but reject placement. Select a scoring-line button to highlight its cells. Detailed breakdowns separate base points, modifier additions, intersections, multipliers, and rounding.

Motion follows the system's reduced-motion setting. Menu is available during a run without resetting it. Play/New Run asks for confirmation while an unfinished run exists. Escape cancels confirmation; focus is trapped in the dialog and restored afterward.

## Local saves

One automatic save is kept under `gridlock.active-run` in localStorage for this browser and origin. Valid saves open on the main menu with Resume Run. The board, remaining queue, phase, fixed shop offers and purchases, modifiers, Credits, results, and statistics are saved after state changes. Finished runs can also be resumed to inspect their summary. Reloading does not award rewards again or reroll offers.

The save has an explicit schema version and ruleset version. Loading validates shape, board/queue counts, value ranges, unique modifier IDs, catalog prices, purchase status, phase/result consistency, history, final score, rewards, Credits, and aggregate statistics. Modifier effects are reconstructed from the built-in catalog, never trusted from disk.

Invalid and incompatible saves cannot resume. They remain untouched until you choose Play to replace them or **Clear Save / Reset** to remove them. Reset asks for confirmation and clears only GRIDLOCK's key, leaving other localStorage data alone. If storage is blocked or full, a warning appears and play continues in memory. Failed save deletion is reported rather than claimed successful.

Saves are not synchronized between devices, browsers, ports, or origins. Avoid playing in multiple tabs: the most recent write wins. This is validation for robust local play, not anti-cheat or a replay proof of historical results. Changing rules or catalog meanings requires a ruleset-version bump; there is no save migration in v0.1.

## Project structure

- `src/engine/`: pure game state transitions, scoring, modifier pipeline, shop, save validation, simulation, and unit tests.
- `src/data/`: game rules, targets, scoring priorities, modifier catalog, and prices.
- `src/types/`: shared state, scoring, and modifier contracts.
- `src/components/`: React rendering, controls, menus, confirmation, scoring feedback, and DOM interaction tests.
- `src/hooks/`: reduced-motion subscription.
- `src/storage/`: browser localStorage adapter; the engine does not access browser APIs.
- `scripts/simulate.ts`: deterministic simulation CLI.
- `reports/`: audit and simulation artifacts.
- `docs/engine.md`: engine API and extension instructions.

## Developer documentation

See [engine API and modifier architecture](docs/engine.md), including how to add scoring patterns or modifiers and how to version save changes. See [the v0.1 audit](reports/audit-v0.1.md) and [raw simulation results](reports/simulation.json) for balance findings. The audit predates the release-menu/save work. No balance changes from its recommendations were applied.

## Known limitations

- Initial balance is difficult: the audit's immediate-score greedy policy won 4 of 1,000 runs; this does not represent optimal queue-aware or human play.
- No undo, tile movement, replacement, rerolls, audio, cloud saves, or save migration.
- One local save slot; storage loss/private browsing may discard progress. No cross-tab conflict handling.
- DOM tests cover keyboard, touch-style input, dialogs, save/reload, purchases, and transitions. Real-device layouts, physical touch gestures, and screen-reader speech still need manual verification; no connected browser was available during development.
- Uses modern browser features (Web Crypto, localStorage, `inert`, media queries, Web Animations). A local server is required; file URLs are unsupported.
