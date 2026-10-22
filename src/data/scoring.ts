import type { PatternDefinition } from '../types/scoring';

export const MIN_SCORING_SEGMENT_LENGTH = 3;

/** Highest priority first. Group sizes describe distinct values, not adjacency. */
export const SCORING_PATTERNS: ReadonlyArray<PatternDefinition> = [
  { name: 'Five of a kind', basePoints: 150, minLength: 5, rule: { kind: 'groups', sizes: [5] } },
  { name: 'Straight', basePoints: 100, minLength: 5, rule: { kind: 'straight', length: 5 } },
  { name: 'Four of a kind', basePoints: 80, minLength: 4, rule: { kind: 'groups', sizes: [4] } },
  { name: 'Full house', basePoints: 65, minLength: 5, rule: { kind: 'groups', sizes: [3, 2] } },
  { name: 'Three of a kind', basePoints: 40, minLength: 3, rule: { kind: 'groups', sizes: [3] } },
  { name: 'Two pairs', basePoints: 25, minLength: 4, rule: { kind: 'groups', sizes: [2, 2] } },
  { name: 'One pair', basePoints: 10, minLength: 3, rule: { kind: 'groups', sizes: [2] } },
  { name: 'No combination', basePoints: 5, minLength: 3, rule: { kind: 'fallback' } },
];
