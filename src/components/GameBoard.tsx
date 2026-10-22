import { useRef, useState, type KeyboardEvent } from 'react';
import { canPlaceTile } from '../engine/game';
import type { GameState } from '../types/game';
import type { ScoringBreakdown } from '../types/scoring';
import { Motion } from './Motion';

interface GameBoardProps {
  readonly state: GameState;
  readonly score: ScoringBreakdown;
  readonly selectedSegment: number | null;
  readonly onPlace: (row: number, column: number) => void;
}

export const GameBoard = ({ state, score, selectedSegment, onPlace }: GameBoardProps) => {
  const [active, setActive] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const size = state.board.length;
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const row = Math.floor(index / size);
    const column = index % size;
    const destinations: Record<string, number> = {
      ArrowLeft: row * size + Math.max(0, column - 1), ArrowRight: row * size + Math.min(size - 1, column + 1),
      ArrowUp: Math.max(0, row - 1) * size + column, ArrowDown: Math.min(size - 1, row + 1) * size + column,
      Home: event.ctrlKey ? 0 : row * size, End: event.ctrlKey ? size * size - 1 : row * size + size - 1,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    buttons.current[destinations[event.key]]?.focus();
  };
  return (
    <div role="group" aria-label="Game board" aria-describedby="board-help" className="grid grid-cols-5 gap-1.5 rounded-sm border border-white/15 bg-[#191919] p-2 sm:gap-2.5 sm:p-3">
      {state.board.flatMap((row, rowIndex) => row.map((tile, columnIndex) => {
        const index = rowIndex * size + columnIndex;
        const legal = canPlaceTile(state, rowIndex, columnIndex);
        const matching = score.segments.filter(segment => segment.coordinates.some(cell => cell.row === rowIndex && cell.column === columnIndex));
        const selected = selectedSegment !== null && score.segments[selectedSegment]?.coordinates.some(cell => cell.row === rowIndex && cell.column === columnIndex);
        return <button key={index} ref={element => { buttons.current[index] = element; }} type="button" tabIndex={active === index ? 0 : -1} aria-disabled={!legal}
          onFocus={() => setActive(index)} onKeyDown={event => handleKey(event, index)} onClick={() => { if (legal) onPlace(rowIndex, columnIndex); }}
          aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}, ${tile ? `tile ${tile.value}` : 'empty'}${matching.length ? `, scoring: ${matching.map(segment => segment.pattern).join(' and ')}` : ''}${!legal ? ', unavailable for placement' : ''}`}
          data-occupied={Boolean(tile)} data-scored={matching.length > 0} data-selected={Boolean(selected)}
          className="group relative flex aspect-square min-w-0 touch-manipulation items-center justify-center rounded-sm border border-white/10 bg-[#202020] text-3xl font-semibold tabular-nums text-[#f0ede5] transition-[background-color,border-color] duration-150 aria-[disabled=false]:cursor-pointer aria-[disabled=false]:hover:border-amber-200/70 aria-[disabled=false]:hover:bg-amber-200/10 aria-[disabled=false]:active:bg-amber-200/20 aria-disabled:cursor-default focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-100 data-[occupied=true]:border-white/20 data-[occupied=true]:bg-[#30302d] data-[scored=true]:border-amber-200/40 data-[scored=true]:bg-[#393328] data-[scored=true]:text-amber-100 data-[selected=true]:ring-2 data-[selected=true]:ring-amber-200 motion-reduce:transition-none sm:text-4xl">
          {tile ? <Motion tile>{tile.value}</Motion> : <span aria-hidden="true" className="text-amber-200/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">{legal ? state.queue[0]?.value : ''}</span>}
          {matching.length > 0 && <span aria-hidden="true" className="absolute bottom-1 right-1 text-[8px] leading-none text-amber-200">{matching.length > 1 ? '↔↕' : matching[0].orientation === 'horizontal' ? '↔' : '↕'}</span>}
        </button>;
      }))}
    </div>
  );
};
