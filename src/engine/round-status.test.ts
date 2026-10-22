import { expect, it } from 'vitest';
import { createInitialState, placeTile, startRound } from './game';
import { getRoundStatus } from './round-status';
import type { GameState, TileValue } from '../types/game';

it('derives live scoring and remaining moves from placements', () => {
  let state: GameState = { ...startRound(createInitialState(), 42), queue: Array.from({ length: 9 }, () => ({ value: 2 as const })) };
  expect(getRoundStatus(state)).toMatchObject({ remainingMoves: 9, complete: false, outcome: null, target: 30 });
  for (let column = 0; column < 3; column++) state = placeTile(state, 0, column);
  expect(getRoundStatus(state)).toMatchObject({ remainingMoves: 6, breakdown: { totalScore: 40 }, outcome: null });
});

it.each([true, false])('reports a completed round with target reached = %s', reached => {
  let state: GameState = { ...startRound(createInitialState(), 1), queue: Array.from({ length: 9 }, (_, index) => ({ value: (reached ? 2 : (index % 5) + 1) as TileValue })) };
  const cells = reached ? [[0, 0], [0, 1], [0, 2], [2, 0], [2, 2], [2, 4], [4, 0], [4, 2], [4, 4]] : [[0, 0], [0, 2], [0, 4], [2, 0], [2, 2], [2, 4], [4, 0], [4, 2], [4, 4]];
  cells.forEach(([row, column]) => { state = placeTile(state, row, column); });
  expect(getRoundStatus(state)).toMatchObject({ complete: true, remainingMoves: 0, outcome: reached ? 'target-reached' : 'target-missed' });
});
