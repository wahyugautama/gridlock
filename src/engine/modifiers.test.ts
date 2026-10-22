import { describe, expect, it } from 'vitest';
import { MODIFIER_CATALOG } from '../data/shop';
import type { Board, TileValue } from '../types/game';
import { scoreBoard } from './scoring';
import { evaluateRound, restartRun } from './game';

const owned = (...ids: string[]) => ids.map(id => MODIFIER_CATALOG.find(entry => entry.modifier.id === id)!.modifier);
const boardFrom = (rows: ReadonlyArray<ReadonlyArray<TileValue | null>>): Board => Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, column) => {
  const value = rows[row]?.[column];
  return value == null ? null : { value };
}));
const row = (values: TileValue[]) => boardFrom([values]);

const cases: Array<[string, TileValue[], number]> = [
  ['double-trouble', [1, 1, 2], 20],
  ['double-trouble', [1, 1, 2, 2], 35],
  ['double-trouble', [1, 1, 1, 2, 2], 65],
  ['triple-threat', [2, 2, 2], 65],
  ['triple-threat', [2, 2, 2, 3, 4], 65],
  ['triple-threat', [2, 2, 2, 2], 80],
  ['straight-shooter', [3, 1, 5, 2, 4], 150],
  ['straight-shooter', [1, 2, 3, 4], 5],
  ['lucky-seven', [1, 2, 4], 25],
  ['lucky-seven', [1, 1, 5], 30],
  ['lucky-seven', [1, 1, 1, 4], 60],
  ['lucky-seven', [1, 2, 5], 5],
  ['lucky-seven', [2, 5], 0],
  ['minimalist', [1, 2, 3], 20],
  ['minimalist', [1, 1, 1], 55],
  ['minimalist', [1, 2, 3, 4], 5],
  ['high-roller', [2, 2, 2, 2], 120],
  ['high-roller', [2, 2, 2, 2, 1], 120],
  ['high-roller', [2, 2, 2, 2, 2], 190],
  ['high-roller', [2, 2, 2, 1, 1], 65],
  ['multiplier', [1, 2, 3], 6],
  ['multiplier', [1, 1, 2], 12],
];

describe('modifier effects', () => {
  it('defines the requested eight unique modifiers and prices', () => {
    expect(MODIFIER_CATALOG.map(entry => [entry.modifier.name, entry.cost])).toEqual([
      ['Double Trouble', 3], ['Triple Threat', 4], ['Straight Shooter', 5], ['Crossfire', 4],
      ['Lucky Seven', 3], ['Minimalist', 4], ['High Roller', 6], ['Multiplier', 7],
    ]);
    expect(new Set(MODIFIER_CATALOG.map(entry => entry.modifier.id)).size).toBe(8);
  });
  it.each(cases)('%s scores %j as %i', (id, values, expected) => {
    const board = row(values);
    const result = scoreBoard(board, owned(id));
    expect(result.totalScore).toBe(expected);
    expect(result.baseScore).toBe(scoreBoard(board).totalScore);
    expect(result.baseScore + result.contributions.reduce((sum, contribution) => sum + contribution.points, 0) + result.roundingAdjustment).toBe(result.totalScore);
  });

  it('counts one Crossfire bonus per qualifying crossing, not per direction', () => {
    const board = boardFrom([[null, 1], [1, 1, 1], [null, 1]]);
    const result = scoreBoard(board, owned('crossfire'));
    expect(result.totalScore).toBe(90);
    expect(result.contributions).toEqual([{ modifierId: 'crossfire', modifierName: 'Crossfire', stage: 'intersection', points: 10, coordinates: [{ row: 1, column: 1 }], segmentIndices: [0, 1] }]);
    expect(result.segments.map(segment => segment.modifierAdjustedPoints)).toEqual([40, 40]);
  });
  it('counts multiple intersections and excludes nonqualifying perpendicular runs', () => {
    const full = boardFrom(Array.from({ length: 5 }, () => [1, 1, 1, 1, 1]));
    expect(scoreBoard(full, owned('crossfire'))).toMatchObject({ baseScore: 1500, additiveBonus: 250, totalScore: 1750 });
    const short = boardFrom([[null, 1], [1, 1, 1]]);
    expect(scoreBoard(short, owned('crossfire')).totalScore).toBe(40);
    expect(scoreBoard(row([1, 1, 1]), owned('crossfire')).contributions).toEqual([]);
  });

  it('adds all matching bonuses before multiplying, independent of ownership order', () => {
    const board = row([1, 1, 5]);
    const modifiers = owned('multiplier', 'minimalist', 'lucky-seven', 'double-trouble');
    const result = scoreBoard(board, modifiers);
    expect(result).toMatchObject({ baseScore: 10, additiveBonus: 45, subtotal: 55, multiplier: 1.25, unroundedTotal: 68.75, roundingAdjustment: -0.75, totalScore: 68 });
    expect(result.segments[0].modifierAdjustedPoints).toBe(55);
    expect(result).toEqual(scoreBoard(board, [...modifiers].reverse()));
    expect(result.contributions).toHaveLength(4);
  });
  it('multiplies Crossfire and segment bonuses together', () => {
    const board = boardFrom([[null, 1], [1, 1, 1], [null, 1]]);
    expect(scoreBoard(board, owned('crossfire', 'minimalist', 'triple-threat', 'multiplier'))).toMatchObject({ baseScore: 80, additiveBonus: 90, subtotal: 170, totalScore: 212 });
  });
  it('rounds only once across the entire board', () => {
    const board = boardFrom([[1, 2, 3], [], [1, 2, 3], [], [1, 2, 3]]);
    expect(scoreBoard(board, owned('multiplier')).totalScore).toBe(18);
  });
  it('does not create points on empty or nonqualifying boards', () => {
    const modifiers = MODIFIER_CATALOG.map(entry => entry.modifier);
    expect(scoreBoard(boardFrom([]), modifiers).totalScore).toBe(0);
    expect(scoreBoard(row([1, 1]), modifiers).totalScore).toBe(0);
  });
  it('deduplicates modifier IDs defensively without mutating inputs', () => {
    const board = row([1, 1, 5]);
    board.forEach(cells => { cells.forEach(cell => { if (cell) Object.freeze(cell); }); Object.freeze(cells); });
    Object.freeze(board);
    const modifiers = Object.freeze(owned('double-trouble', 'double-trouble', 'multiplier', 'multiplier'));
    expect(scoreBoard(board, modifiers)).toEqual(scoreBoard(board, owned('double-trouble', 'multiplier')));
    expect(modifiers).toHaveLength(4);
  });
  it('uses the final rounded score for results, statistics, and Credit rewards', () => {
    const result = evaluateRound({ ...restartRun(1), placements: 9, queue: [], board: row([1, 1, 5]), modifiers: owned('double-trouble', 'lucky-seven', 'minimalist', 'multiplier') });
    expect(result.roundResult).toMatchObject({ score: 68, target: 30, creditsEarned: 6 });
    expect(result.statistics.totalScore).toBe(68);
    expect(result.credits).toBe(6);
  });
});
