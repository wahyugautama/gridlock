import type { ScoringBreakdown } from '../types/scoring';

export const ScoringSegments = ({ score, selected, onSelect }: { readonly score: ScoringBreakdown; readonly selected: number | null; readonly onSelect: (index: number | null) => void }) => (
  <section aria-labelledby="segments-title" className="mt-5">
    <h3 id="segments-title" className="mb-2 text-[10px] uppercase tracking-[0.16em] text-stone-400">Scoring lines · {score.segments.length}</h3>
    {!score.segments.length && <p className="border-l-2 border-white/10 py-2 pl-3 text-xs leading-5 text-stone-400">No scoring lines yet. Connect at least three tiles horizontally or vertically.</p>}
    <div className="space-y-2">{score.segments.map((segment, index) => <button key={index} type="button" aria-pressed={selected === index} onClick={() => onSelect(selected === index ? null : index)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-xs transition-colors hover:border-amber-200/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 aria-pressed:border-amber-200 aria-pressed:bg-amber-200/5 motion-reduce:transition-none">
      <span><span className="mr-2 text-amber-200" aria-label={segment.orientation}>{segment.orientation === 'horizontal' ? '↔' : '↕'}</span>{segment.pattern}<span className="mt-1 block text-[10px] text-stone-400">{segment.basePoints} base{segment.contributions.map(contribution => ` · +${contribution.points} ${contribution.modifierName}`).join('')}</span></span>
      <span className="shrink-0 font-semibold tabular-nums text-amber-200">{segment.modifierAdjustedPoints} pts</span>
    </button>)}</div>
    {score.contributions.filter(contribution => contribution.stage !== 'segment').map((contribution, index) => <p key={index} className="mt-2 flex justify-between gap-3 text-xs text-amber-200/80"><span>{contribution.modifierName}{contribution.factor ? ` ×${contribution.factor}` : ' · intersection'}</span><span>+{contribution.points}</span></p>)}
    {score.roundingAdjustment !== 0 && <p className="mt-2 text-[10px] text-stone-400">Final rounding adjustment: {score.roundingAdjustment}</p>}
  </section>
);
