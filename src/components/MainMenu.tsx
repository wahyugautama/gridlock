import { SCORING_PATTERNS } from '../data/scoring';

interface Props {
  readonly hasRun: boolean;
  readonly round: number;
  readonly showHelp: boolean;
  readonly onPlay: () => void;
  readonly onResume: () => void;
  readonly onHelp: () => void;
  readonly onClear: () => void;
}
const button = 'min-h-11 w-full border border-white/20 px-5 py-3 text-sm transition-colors hover:border-amber-200 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 motion-reduce:transition-none';

export const MainMenu = ({ hasRun, round, showHelp, onPlay, onResume, onHelp, onClear }: Props) => (
  <section aria-labelledby="menu-title" className="py-8">
    <p className="text-xs uppercase tracking-[0.25em] text-amber-200">Single-player roguelike puzzle</p>
    <h2 id="menu-title" className="mt-5 text-5xl font-bold tracking-tighter sm:text-6xl">GRIDLOCK<span className="text-amber-200">.</span></h2>
    <p className="mt-4 text-sm leading-6 text-stone-400">Nine tiles. Eight rounds. Make every placement count.</p>
    <div className="mt-8 space-y-3">
      {hasRun && <button className={`${button} border-amber-200 text-amber-200`} onClick={onResume}>Resume Run · Round {round}</button>}
      <button className={button} onClick={onPlay}>Play</button>
      <button className={button} onClick={onHelp} aria-expanded={showHelp} aria-controls="instructions">How to Play</button>
      <button className={`${button} text-stone-400`} onClick={onClear}>Clear Save / Reset</button>
    </div>
    {showHelp && <section id="instructions" className="mt-8 border-t border-white/10 pt-6 text-sm leading-6 text-stone-300">
      <h3 className="text-lg font-semibold text-amber-200">How to Play</h3>
      <ol className="mt-4 list-decimal space-y-3 pl-5">
        <li>Place the next tile in an empty cell on the 5×5 board. All nine tiles are visible. Tiles cannot move or be replaced.</li>
        <li>Build horizontal or vertical runs of at least three occupied cells. Only the highest pattern in each full run scores. Intersections score in both directions; diagonals do not score.</li>
        <li>Meet the target after your ninth placement to clear the round. A miss ends your run. Clear round eight to win.</li>
        <li>Earn 5 Credits per clear, plus 1 for every full 25 points above target. Between rounds, buy permanent upgrades or save your Credits. Each modifier can be owned once.</li>
        <li>Continue starts a new empty board. Credits and modifiers carry forward. Your run saves automatically on this browser.</li>
      </ol>
      <p className="mt-4 text-xs text-stone-400">Keyboard: Tab into the board, arrow keys to move, Enter or Space to place. Select a scoring line to highlight it. Escape cancels restart confirmation.</p>
      <dl className="mt-5 space-y-1">{SCORING_PATTERNS.map(pattern => <div key={pattern.name} className="flex justify-between gap-3"><dt>{pattern.name}</dt><dd>{pattern.basePoints} pts</dd></div>)}</dl>
      <p className="mt-4 text-xs text-stone-400">Straights require all five values, in any order. Full houses require five tiles. Bonuses apply before the final multiplier; the final score rounds down once. Extending a line may change its pattern or bonuses.</p>
    </section>}
    <p className="mt-8 text-[10px] leading-5 text-stone-500">v0.1 · Local saves only · No accounts or online services</p>
  </section>
);
