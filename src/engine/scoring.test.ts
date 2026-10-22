import { describe, expect, it } from 'vitest';
import type { Board, TileValue } from '../types/game';
import type { PatternName } from '../types/scoring';
import { detectSegments, evaluatePattern, scoreBoard } from './scoring';

type Row = ReadonlyArray<TileValue | null>;
const boardFrom = (rows: ReadonlyArray<Row>): Board =>
  Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, column) => {
    const value = rows[row]?.[column];
    return value == null ? null : { value };
  }));

const cases: Array<[TileValue[], PatternName, number]> = [
  [[2, 2, 2, 2, 2], 'Five of a kind', 150],
  [[1, 2, 3, 4, 5], 'Straight', 100],
  [[5, 4, 3, 2, 1], 'Straight', 100],
  [[3, 1, 5, 2, 4], 'Straight', 100],
  [[2, 2, 2, 2], 'Four of a kind', 80],
  [[2, 1, 2, 2, 2], 'Four of a kind', 80],
  [[3, 2, 3, 2, 3], 'Full house', 65],
  [[3, 3, 3], 'Three of a kind', 40],
  [[3, 1, 3, 3], 'Three of a kind', 40],
  [[3, 1, 3, 2, 3], 'Three of a kind', 40],
  [[2, 1, 2, 1], 'Two pairs', 25],
  [[2, 1, 3, 2, 1], 'Two pairs', 25],
  [[2, 1, 2], 'One pair', 10],
  [[2, 1, 3, 2], 'One pair', 10],
  [[1, 2, 3, 4, 4], 'One pair', 10],
  [[1, 2, 3], 'No combination', 5],
  [[1, 2, 3, 4], 'No combination', 5],
];

describe('pattern scoring and precedence', () => {
  it.each(cases)('scores %j as %s for %i points only', (values, pattern, points) => {
    expect(evaluatePattern(values)).toMatchObject({ name: pattern, basePoints: points });
    const result = scoreBoard(boardFrom([values]));
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toMatchObject({ pattern, basePoints: points, modifierAdjustedPoints: points });
    expect(result.totalScore).toBe(points);
  });

  it.each<{ values: TileValue[] }>([{ values: [] }, { values: [1] }, { values: [1, 1] }, { values: [1, 2] }])('does not score a short run $values', ({ values }) => {
    const board = boardFrom([values]);
    expect(scoreBoard(board)).toMatchObject({ segments: [], totalScore: 0 });
    expect(evaluatePattern(values)).toBeNull();
  });
});

describe('maximal segment detection', () => {
  it('stops at empty cells and excludes short fragments', () => {
    const board = boardFrom([[1, 1, null, 1, 1], [null, 2, 3, 4, null]]);
    expect(detectSegments(board)).toEqual([{
      orientation: 'horizontal', values: [2, 3, 4],
      coordinates: [{ row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 }],
    }]);
  });

  it('detects a vertical run bounded by empties', () => {
    const board = boardFrom([[], [null, 3], [null, 3], [null, 3], []]);
    expect(detectSegments(board)).toEqual([{
      orientation: 'vertical', values: [3, 3, 3],
      coordinates: [{ row: 1, column: 1 }, { row: 2, column: 1 }, { row: 3, column: 1 }],
    }]);
    expect(scoreBoard(board).totalScore).toBe(40);
  });

  it('counts a shared tile in both directions', () => {
    const board = boardFrom([[], [null, null, 2], [null, 2, 2, 2], [null, null, 2]]);
    const result = scoreBoard(board);
    expect(result.totalScore).toBe(80);
    expect(result.segments.map(segment => segment.orientation)).toEqual(['horizontal', 'vertical']);
    for (const segment of result.segments) {
      expect(segment.coordinates).toContainEqual({ row: 2, column: 2 });
      expect(segment.pattern).toBe('Three of a kind');
    }
  });

  it('scores full-length runs once, with no overlapping subsegments', () => {
    const board = boardFrom(Array.from({ length: 5 }, () => [1, 1, 1, 1, 1]));
    const result = scoreBoard(board);
    expect(result.segments).toHaveLength(10);
    expect(result.totalScore).toBe(1500);
    expect(result.segments.every(segment => segment.coordinates.length === 5)).toBe(true);
    expect(result.segments[4].coordinates).toEqual(Array.from({ length: 5 }, (_, column) => ({ row: 4, column })));
    expect(result.segments[9].coordinates).toEqual(Array.from({ length: 5 }, (_, row) => ({ row, column: 4 })));
  });

  it('scores separate qualifying rows independently', () => {
    expect(scoreBoard(boardFrom([[1, 1, 1], [], [2, 3, 4]])).totalScore).toBe(45);
  });

  it('returns zero for an empty board and ignores diagonals', () => {
    expect(scoreBoard(boardFrom([]))).toMatchObject({ segments: [], totalScore: 0 });
    expect(scoreBoard([])).toMatchObject({ segments: [], totalScore: 0 });
    expect(scoreBoard(boardFrom([[1], [null, 1], [null, null, 1]]))).toMatchObject({ segments: [], totalScore: 0 });
  });

  it('is deterministic and leaves frozen input unchanged', () => {
    const board = boardFrom([[3, 1, 5, 2, 4]]);
    const snapshot = structuredClone(board);
    board.forEach(row => { row.forEach(tile => { if (tile) Object.freeze(tile); }); Object.freeze(row); });
    Object.freeze(board);
    expect(scoreBoard(board)).toEqual(scoreBoard(board));
    expect(board).toEqual(snapshot);
  });
});
