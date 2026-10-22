import { applyModifiers } from './modifiers';
import { MIN_SCORING_SEGMENT_LENGTH, SCORING_PATTERNS } from '../data/scoring';
import type { Board, Modifier, TileValue } from '../types/game';
import type { Coordinate, Orientation, PatternDefinition, ScoringBreakdown, Segment, SegmentScore } from '../types/scoring';

/** Horizontal rows first, then vertical columns; cells retain board order. */
export const detectSegments = (board: Board): ReadonlyArray<Segment> => {
  const segments: Segment[] = [];
  const height = board.length;
  const width = board[0]?.length ?? 0;

  const scan = (orientation: Orientation, line: number, length: number) => {
    let coordinates: Coordinate[] = [];
    let values: TileValue[] = [];
    for (let offset = 0; offset <= length; offset++) {
      const row = orientation === 'horizontal' ? line : offset;
      const column = orientation === 'horizontal' ? offset : line;
      const tile = offset < length ? board[row]?.[column] : null;
      if (tile) {
        coordinates.push({ row, column });
        values.push(tile.value);
        continue;
      }
      if (values.length >= MIN_SCORING_SEGMENT_LENGTH) {
        segments.push({ coordinates, orientation, values });
      }
      coordinates = [];
      values = [];
    }
  };

  for (let row = 0; row < height; row++) scan('horizontal', row, width);
  for (let column = 0; column < width; column++) scan('vertical', column, height);
  return segments;
};

const matchesPattern = (values: ReadonlyArray<TileValue>, pattern: PatternDefinition): boolean => {
  if (values.length < pattern.minLength) return false;
  const rule = pattern.rule;
  if (rule.kind === 'fallback') return true;
  if (rule.kind === 'straight') {
    if (values.length !== rule.length) return false;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
  }
  const counts = new Map<TileValue, number>();
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
  const groups = [...counts.values()].sort((a, b) => b - a);
  return rule.sizes.every((size, index) => (groups[index] ?? 0) >= size);
};

/** Returns null for nonqualifying lengths. Straights are independent of tile order. */
export const evaluatePattern = (values: ReadonlyArray<TileValue>): PatternDefinition | null => {
  if (values.length < MIN_SCORING_SEGMENT_LENGTH) return null;
  return SCORING_PATTERNS.find(pattern => matchesPattern(values, pattern)) ?? null;
};

/** Scores maximal segments once each, including both directions at intersections. */
export const scoreBoard = (board: Board, modifiers: ReadonlyArray<Modifier> = []): ScoringBreakdown => {
  const segments: SegmentScore[] = detectSegments(board).map(segment => {
    const definition = evaluatePattern(segment.values);
    if (!definition) throw new Error('No scoring definition for qualifying segment.');
    return {
      ...segment,
      pattern: definition.name,
      basePoints: definition.basePoints,
      modifierAdjustedPoints: definition.basePoints,
      contributions: [],
    };
  });
  return applyModifiers(segments, modifiers);
};
