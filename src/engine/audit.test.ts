import { expect, it } from 'vitest';
import { continueRun, evaluateRound, placeTile, restartRun } from './game';
import { evaluatePattern, scoreBoard } from './scoring';
import { MODIFIER_CATALOG } from '../data/shop';
import { simulate } from './simulation';
import type { GameState, TileValue } from '../types/game';

it('checks all 3,875 possible value sequences of lengths 3–5 against an independent scoring oracle', () => {
  for (let length = 3; length <= 5; length++) {
    for (let code = 0; code < 5 ** length; code++) {
      const values = Array.from({ length }, (_, i) => (Math.floor(code / 5 ** i) % 5 + 1) as TileValue);
      const counts = [1, 2, 3, 4, 5].map(value => values.filter(tile => tile === value).length);
      const pairs = counts.filter(count => count === 2).length;
      const expected = counts.includes(5) ? 150 : length === 5 && counts.every(count => count === 1) ? 100 : counts.includes(4) ? 80 : counts.includes(3) && pairs === 1 ? 65 : counts.includes(3) ? 40 : pairs === 2 ? 25 : pairs === 1 ? 10 : 5;
      expect(evaluatePattern(values)?.basePoints).toBe(expected);
    }
  }
});

it('does not let a queued action from the result screen skip the shop', () => {
  const base = restartRun(1);
  const result = evaluateRound({ ...base, placements: 9, queue: [], board: base.board.map((row, r) => row.map((_, c) => r === 2 || c === 2 ? { value: 1 } : null)) });
  const expected = { phase: result.phase, round: result.round };
  const shop = continueRun(result, 2, expected);
  expect(shop.phase).toBe('shop');
  expect(continueRun(shop, 2, expected)).toBe(shop);
  const next = continueRun(shop, 3, { phase: shop.phase, round: shop.round });
  expect(next.round).toBe(2);
  expect(continueRun(next, 3, { phase: shop.phase, round: shop.round })).toBe(next);
});

it.each([1, 2, 3, 4, 5, 6, 7, 8])('fails round %i and cannot reward or advance twice', round => {
  let state: GameState = { ...restartRun(1), round, credits: 12 };
  for (const [r, c] of [[0, 0], [0, 2], [0, 4], [2, 0], [2, 2], [2, 4], [4, 0], [4, 2], [4, 4]]) state = placeTile(state, r, c);
  expect(state.roundResult?.outcome).toBe('game-over');
  expect(state.credits).toBe(12);
  expect(evaluateRound(state)).toBe(state);
  expect(placeTile(state, 1, 1)).toBe(state);
  const ended = continueRun(state, 2);
  expect(ended.phase).toBe('game-over');
  expect(continueRun(ended, 2)).toBe(ended);
});

it('detects nonmonotonic scores when a maximal run changes winning pattern', () => {
  const state = restartRun(1);
  const board = state.board.map((row, r) => row.map((_, c) => r === 0 && c < 3 ? { value: 1 as const } : null));
  expect(scoreBoard(board).totalScore).toBe(40);
  // Extending cannot subdivide a maximal run; additions may alter modifier eligibility.
  const longer = board.map((row, r) => row.map((tile, c) => r === 0 && c === 3 ? { value: 2 as const } : tile));
  const minimalist = MODIFIER_CATALOG.find(entry => entry.modifier.id === 'minimalist')!.modifier;
  expect(scoreBoard(board, [minimalist]).totalScore).toBe(55);
  expect(scoreBoard(longer, [minimalist]).totalScore).toBe(40);
  expect(scoreBoard(longer).segments).toHaveLength(1);
});

it('reproduces simulations and conserves currency', () => {
  const first = simulate('greedy', 20, 1);
  expect(first).toEqual(simulate('greedy', 20, 1));
  expect(first.averageCreditsEarned - first.averageCreditsSpent).toBeCloseTo(first.averageEndingCredits);
  first.rounds.forEach((round, i) => {
    expect(round.cleared).toBeLessThanOrEqual(round.entered);
    if (i) expect(round.entered).toBe(first.rounds[i - 1].cleared);
  });
  expect(first.victories).toBe(first.rounds[7].cleared);
});

it('reconciles every subset of the eight modifiers and is invariant under board transposition', () => {
  const state = restartRun(1);
  const board = state.board.map((row, r) => row.map((_, c) => r < 3 && c < 3 ? { value: ((r + c) % 3 + 1) as TileValue } : null));
  const transposed = board[0].map((_, column) => board.map(row => row[column]));
  for (let mask = 0; mask < 256; mask++) {
    const modifiers = MODIFIER_CATALOG.filter((_, i) => mask & (1 << i)).map(entry => entry.modifier);
    const score = scoreBoard(board, modifiers);
    expect(score.totalScore).toBe(Math.floor(score.subtotal * score.multiplier));
    expect(score.baseScore + score.contributions.reduce((sum, contribution) => sum + contribution.points, 0) + score.roundingAdjustment).toBe(score.totalScore);
    expect(scoreBoard(transposed, modifiers).totalScore).toBe(score.totalScore);
    expect(scoreBoard(board, modifiers.slice().reverse())).toEqual(score);
  }
});
