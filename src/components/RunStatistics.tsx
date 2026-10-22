import type { RunStatistics as Statistics } from '../types/game';

export const RunStatistics = ({ statistics }: { readonly statistics: Statistics }) => (
  <section aria-labelledby="run-stats-title" className="mt-7 border-t border-white/10 pt-5">
    <h2 id="run-stats-title" className="mb-4 text-[10px] uppercase tracking-[0.18em] text-stone-500">Run statistics</h2>
    <dl className="grid grid-cols-3 gap-x-3 gap-y-5">
      {[
        ['Total score', statistics.totalScore], ['Best round', statistics.bestRoundScore],
        ['Tiles placed', statistics.tilesPlaced], ['Rounds played', statistics.roundsPlayed],
        ['Rounds cleared', statistics.roundsCleared],
      ].map(([label, value]) => <div key={label}><dt className="text-[10px] text-stone-500">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd></div>)}
    </dl>
    {statistics.history.length > 0 && <details className="mt-5 text-xs text-stone-400"><summary className="cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-amber-200">Round history</summary><ul className="space-y-2 pt-2">{statistics.history.map(result => <li key={result.round} className="flex justify-between gap-3"><span>Round {result.round} · {result.cleared ? 'Cleared' : 'Missed'}</span><span>{result.score} / {result.target}</span></li>)}</ul></details>}
  </section>
);
