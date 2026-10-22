import type { ScoringBreakdown } from '../types/scoring';

export const ScoreBreakdown = ({ score }: { readonly score: ScoringBreakdown }) => (
  <details className="mt-4 text-xs text-stone-400">
    <summary className="cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-amber-200">Scoring breakdown ({score.segments.length} segments)</summary>
    <ul className="mt-3 space-y-4">{score.segments.map((segment, index) => <li key={index}>
      <div className="flex justify-between gap-3"><span className="capitalize">{segment.orientation} · {segment.pattern}</span><span>{segment.basePoints} base → {segment.modifierAdjustedPoints}</span></div>
      <p className="mt-1 text-[10px] text-stone-500">{segment.coordinates.map(cell => `(${cell.row + 1}, ${cell.column + 1})`).join(' · ')}</p>
      {segment.contributions.map(contribution => <p key={contribution.modifierId} className="mt-1 text-amber-200/80">{contribution.modifierName}: +{contribution.points}</p>)}
    </li>)}</ul>
    {!score.segments.length && <p className="py-2">No qualifying segments yet.</p>}
    {score.contributions.filter(contribution => contribution.stage === 'intersection').map((contribution, index) => <p key={index} className="mt-3 text-amber-200/80">{contribution.modifierName} at {contribution.coordinates.map(cell => `(${cell.row + 1}, ${cell.column + 1})`).join(', ')}: +{contribution.points}</p>)}
    <dl className="mt-4 space-y-2 border-t border-white/10 pt-4">
      <div className="flex justify-between"><dt>Base score</dt><dd>{score.baseScore}</dd></div>
      <div className="flex justify-between"><dt>Additive bonuses</dt><dd>+{score.additiveBonus}</dd></div>
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{score.subtotal}</dd></div>
      {score.contributions.filter(contribution => contribution.stage === 'multiplier').map(contribution => <div key={contribution.modifierId} className="flex justify-between text-amber-200"><dt>{contribution.modifierName} ×{contribution.factor}</dt><dd>+{contribution.points}</dd></div>)}
      <div className="flex justify-between"><dt>Round down once</dt><dd>{score.roundingAdjustment}</dd></div>
      <div className="flex justify-between font-semibold text-stone-100"><dt>Final score</dt><dd>{score.totalScore}</dd></div>
    </dl>
  </details>
);
