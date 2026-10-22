import type { Tile } from '../types/game';

export const TileQueue = ({ queue }: { readonly queue: ReadonlyArray<Tile> }) => (
  <section aria-labelledby="queue-title" className="mt-5">
    <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
      <h2 id="queue-title" className="text-stone-400">Tile queue</h2>
      <span className="text-amber-200/80">{queue.length ? 'Next tile first →' : 'Queue complete'}</span>
    </div>
    <ol aria-label="Remaining tiles in placement order" className="grid min-h-11 grid-cols-9 gap-1 sm:gap-2">
      {queue.map((tile, index) => (
        <li key={index} aria-label={`${tile.value}${index === 0 ? ', next tile' : ''}`} aria-current={index === 0 ? 'step' : undefined} className="flex aspect-square min-w-0 flex-1 items-center justify-center rounded-sm border border-white/10 bg-white/[0.025] text-lg font-semibold tabular-nums text-stone-400 aria-[current=step]:border-amber-300/60 aria-[current=step]:bg-amber-300/10 aria-[current=step]:text-amber-200 aria-[current=step]:border-b-2 sm:text-xl">
          {tile.value}
        </li>
      ))}
      {queue.length === 0 && <li className="col-span-9 flex items-center text-xs text-stone-500">All tiles placed. Your board is complete.</li>}
    </ol>
  </section>
);
