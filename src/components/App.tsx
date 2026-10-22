import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, GAME_RULES } from '../data/game';
import { continueRun, createInitialState, placeTile, restartRun } from '../engine/game';
import { getRoundStatus } from '../engine/round-status';
import { GameBoard } from './GameBoard';
import { TileQueue } from './TileQueue';
import { RoundResultScreen } from './RoundResultScreen';
import { RunStatistics } from './RunStatistics';
import { ShopScreen } from './ShopScreen';
import { purchaseOffer } from '../engine/shop';
import { ScoreBreakdown } from './ScoreBreakdown';
import { AnimatedScore } from './AnimatedScore';
import { TargetProgress } from './TargetProgress';
import { ScoringSegments } from './ScoringSegments';
import { Motion } from './Motion';
import { MainMenu } from './MainMenu';
import { ConfirmReset } from './ConfirmReset';
import { loadLocalRun, saveLocalRun, clearLocalRun } from '../storage/local-save';

// Randomness enters at the UI boundary; engine functions stay deterministic.
const createSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const createRun = () => restartRun(createSeed());

export const App = () => {
  const [loaded] = useState(loadLocalRun);
  const [state, setState] = useState(() => loaded.state ?? createInitialState());
  const [menu, setMenu] = useState(true);
  const [help, setHelp] = useState(false);
  const [pending, setPending] = useState<'restart' | 'clear' | null>(null);
  const [saveMessage, setSaveMessage] = useState(() => ({
    invalid: 'Saved data is invalid and cannot be resumed. Play starts fresh; Clear Save removes it.',
    incompatible: 'This save uses an incompatible version. Play starts fresh; Clear Save removes it.',
    unavailable: 'Browser storage is unavailable. You can play, but progress may not survive a reload.',
    empty: '', ready: 'Saved run found. Choose Resume Run to continue.',
  })[loaded.status]);
  useEffect(() => {
    if (state.phase === 'menu') return;
    setSaveMessage(saveLocalRun(state) ? 'Progress saved on this browser.' : 'Could not save progress. Keep this tab open; storage may be blocked or full.');
  }, [state]);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);
  const roundHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!menu && state.phase === 'playing') roundHeading.current?.focus();
  }, [state.phase, state.round, runKey, menu]);
  const status = getRoundStatus(state);
  const handlePlace = (row: number, column: number) => {
    setSelectedSegment(null);
    setState(current => placeTile(current, row, column));
  };
  const handleBuy = (offerId: string) => setState(current => purchaseOffer(current, offerId));
  const startNewRun = () => {
    setMenu(false);
    setPending(null);
    setState(createRun());
    setSelectedSegment(null);
    setRunKey(key => key + 1);
  };
  const handleNewRun = () => {
    if (['playing', 'round-result', 'shop'].includes(state.phase)) setPending('restart');
    else startNewRun();
  };
  const handleConfirm = () => {
    if (pending === 'restart') { startNewRun(); return; }
    const cleared = clearLocalRun();
    setState(createInitialState());
    setMenu(true);
    setPending(null);
    setSelectedSegment(null);
    setSaveMessage(cleared ? 'Save cleared. Ready for a new run.' : 'Could not remove the save from browser storage. Enable storage and try Clear Save again.');
  };
  const handleContinue = () => {
    setSelectedSegment(null);
    const seed = createSeed();
    setState(current => continueRun(current, seed, { phase: state.phase, round: state.round }));
  };

  return (
    <div className="flex min-h-svh flex-col bg-[#141414] font-mono text-[#f0ede5] selection:bg-amber-200 selection:text-black">
      <div inert={pending !== null} className="flex flex-1 flex-col">
      <a href="#main" className="sr-only z-50 bg-amber-200 p-3 text-black focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to game</a>
      <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-6 grid-cols-2 gap-1"><span className="bg-amber-200" /><span className="bg-amber-200" /><span className="bg-amber-200" /><span className="border border-amber-200" /></span>
          <h1 className="text-sm font-bold tracking-[0.18em]">{GAME_CONFIG.title}</h1>
          <span className="hidden text-[10px] text-stone-500 sm:inline">v{GAME_CONFIG.version}</span>
        </div>
        <div className="flex gap-2">
        {!menu && <button type="button" onClick={() => setMenu(true)} className="min-h-11 px-3 text-xs text-stone-300 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-200">Menu</button>}
        {!menu && <button type="button" onClick={handleNewRun} className="min-h-11 rounded-sm border border-white/15 px-4 py-2 text-xs text-stone-300 transition-colors hover:border-amber-200/50 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 motion-reduce:transition-none">New Run <span aria-hidden="true">↗</span></button>}
        </div>
      </header>

      <main id="main" tabIndex={-1} data-shop={state.phase === 'shop'} className="mx-auto w-full max-w-[520px] flex-1 px-3 py-6 outline-none sm:px-5 data-[shop=true]:max-w-4xl sm:py-12">
        <p role="status" className="mb-4 text-[10px] leading-5 text-stone-400">{saveMessage}</p>
        {menu ? <MainMenu hasRun={state.phase !== 'menu'} round={state.round} showHelp={help} onPlay={handleNewRun} onResume={() => setMenu(false)} onHelp={() => setHelp(value => !value)} onClear={() => setPending('clear')} /> : <Motion key={`${runKey}-${state.round}-${state.phase}`}>
        <div className="mb-6 flex items-end justify-between">
          <div><p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">Make every tile count</p><h2 ref={roundHeading} tabIndex={-1} className="text-xl font-semibold outline-none">Round {state.round}<span className="text-stone-500"> / {GAME_RULES.roundsPerRun}</span></h2></div>
          <div className="text-right"><p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">Moves left</p><p className="mt-1 text-3xl font-semibold tabular-nums text-amber-200">{status.remainingMoves}</p></div>
        </div>

        <p className="mb-5 text-xs text-amber-200/80">{state.credits} Credits · {state.modifiers.length} active modifiers</p>
        {state.phase === 'playing' ? <>
        <div className="mb-5 grid grid-cols-2 divide-x divide-white/10 rounded-sm border border-white/10 bg-white/[0.02] py-4">
          <div className="px-5"><p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Current score</p><p className="mt-1 text-3xl font-semibold tabular-nums"><AnimatedScore value={status.breakdown.totalScore} /></p></div>
          <div className="px-5"><p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Target</p><p className="mt-1 text-3xl font-semibold tabular-nums text-stone-400">{status.target}</p></div>
        </div>

        <TargetProgress score={status.breakdown.totalScore} target={status.target} />
        <GameBoard state={state} score={status.breakdown} selectedSegment={selectedSegment} onPlace={handlePlace} />
        <p id="board-help" className="mt-3 text-[10px] leading-5 text-stone-400">Arrow keys navigate · Enter or Space places · Amber cells score</p>
        <TileQueue queue={state.queue} />
        <ScoringSegments score={status.breakdown} selected={selectedSegment} onSelect={setSelectedSegment} />

        <div role="status" aria-live="polite" aria-atomic="true" className="mt-6 min-h-20 border-t border-white/10 pt-5">
          <p className="text-xs leading-5 text-stone-400">Place the highlighted tile in an empty cell. Build horizontal or vertical lines of 3 or more to score.</p>
          <span className="sr-only">{status.remainingMoves} moves remaining. Current score {status.breakdown.totalScore}. Target {status.target}.</span>
        </div>
        </> : state.phase === 'shop' ? <ShopScreen state={state} onBuy={handleBuy} onContinue={handleContinue} /> : <RoundResultScreen state={state} onContinue={handleContinue} onRestart={handleNewRun} />}
        {state.phase !== 'playing' && state.phase !== 'shop' && <section className="mt-6" aria-label="Completed round board">
          <GameBoard state={state} score={status.breakdown} selectedSegment={selectedSegment} onPlace={handlePlace} />
          <p id="board-help" className="mt-3 text-[10px] text-stone-400">Final board · Select a scoring line to inspect its cells.</p>
          <ScoringSegments score={status.breakdown} selected={selectedSegment} onSelect={setSelectedSegment} />
        </section>}
        {state.modifiers.length > 0 && <details className="mt-6 text-xs text-stone-400"><summary className="cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-amber-200">Active modifiers ({state.modifiers.length})</summary><ul className="mt-2 space-y-3">{state.modifiers.map((modifier) => <li key={modifier.id}><strong className="text-stone-200">{modifier.name}</strong><p className="mt-1 leading-5">{modifier.description}</p></li>)}</ul></details>}
        <RunStatistics statistics={state.statistics} />
        {state.phase !== 'shop' && <ScoreBreakdown score={status.breakdown} />}
        </Motion>}
      </main>
      <footer className="border-t border-white/[0.08] px-5 py-4 text-center text-[9px] uppercase tracking-[0.15em] text-stone-500">Roguelike puzzle · Eight-round run · v{GAME_CONFIG.version}</footer>
      </div>
      {pending && <ConfirmReset clear={pending === 'clear'} onConfirm={handleConfirm} onCancel={() => setPending(null)} />}
    </div>
  );
};
