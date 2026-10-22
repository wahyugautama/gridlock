export const TargetProgress = ({ score, target }: { readonly score: number; readonly target: number }) => (
  <div className="mb-5">
    <div className="mb-2 flex justify-between text-[10px] uppercase tracking-wider text-stone-400"><span>Target progress</span><span className="text-amber-200">{score >= target ? 'Target reached ✓' : `${Math.max(0, target - score)} points to go`}</span></div>
    <progress aria-label="Score toward round target" value={Math.min(score, target)} max={target} aria-valuetext={`${score} of ${target} points`} className="block h-1.5 w-full overflow-hidden rounded-none bg-white/10 accent-amber-200 [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:bg-amber-200 [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-300 [&::-moz-progress-bar]:bg-amber-200 motion-reduce:[&::-webkit-progress-value]:transition-none" />
  </div>
);
