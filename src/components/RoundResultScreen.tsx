import { useEffect, useRef } from 'react';
import type { GameState } from '../types/game';

interface Props {
  readonly state: GameState;
  readonly onContinue: () => void;
  readonly onRestart: () => void;
}

export const RoundResultScreen = ({ state, onContinue, onRestart }: Props) => {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [state.phase, state.round]);
  const result = state.roundResult;
  if (!result) return null;
  const terminal = state.phase === 'game-over' || state.phase === 'victory';
  const title = state.phase === 'victory' ? 'Victory' : state.phase === 'game-over' ? 'Game Over' : result.cleared ? 'Round Clear' : 'Target Missed';
  const buttonLabel = terminal ? 'Start New Run' : result.outcome === 'victory' ? 'View Victory' : result.outcome === 'game-over' ? 'View Run Summary' : 'Visit Shop';

  return (
    <section data-failed={!result.cleared} aria-labelledby="result-title" className="group rounded-sm data-[failed=true]:border-red-300/30 data-[failed=true]:bg-red-300/[0.035] border border-amber-200/20 bg-amber-200/[0.035] px-6 py-10 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200 group-data-[failed=true]:text-red-200">{terminal ? 'Run complete' : `Round ${result.round} result`}</p>
      <p aria-hidden="true" className="mt-5 text-2xl text-amber-200 group-data-[failed=true]:text-red-200">{result.cleared ? '✓' : '×'}</p>
      <h2 ref={heading} tabIndex={-1} id="result-title" className="mt-4 text-4xl font-semibold tracking-tight text-amber-100 outline-none group-data-[failed=true]:text-red-200">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-stone-400">{state.phase === 'victory' ? 'All eight rounds cleared. The grid is yours.' : result.cleared ? 'Target reached. Every placement counted.' : 'Your final score fell below the target. A fresh grid awaits.'}</p>
      <dl className="my-8 grid grid-cols-2 divide-x divide-white/10"><div><dt className="text-xs text-stone-500">Final score</dt><dd className="mt-2 text-4xl font-semibold tabular-nums text-amber-200">{result.score}</dd></div><div><dt className="text-xs text-stone-500">Target</dt><dd className="mt-2 text-4xl font-semibold tabular-nums">{result.target}</dd></div></dl>
      <p className="mb-5 text-sm text-amber-200">+{result.creditsEarned} Credits earned · {state.credits} available</p>
      <button type="button" onClick={terminal ? onRestart : onContinue} className="w-full rounded-md bg-amber-200 px-5 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 motion-reduce:transition-none">{buttonLabel}</button>
    </section>
  );
};
