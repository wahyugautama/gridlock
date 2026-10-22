import type { TileValue } from './game';

export type Orientation = 'horizontal' | 'vertical';
export type PatternName =
  | 'Five of a kind'
  | 'Straight'
  | 'Four of a kind'
  | 'Full house'
  | 'Three of a kind'
  | 'Two pairs'
  | 'One pair'
  | 'No combination';

export interface Coordinate {
  readonly row: number;
  readonly column: number;
}

export interface Segment {
  readonly coordinates: ReadonlyArray<Coordinate>;
  readonly orientation: Orientation;
  readonly values: ReadonlyArray<TileValue>;
}

export interface PatternDefinition {
  readonly name: PatternName;
  readonly basePoints: number;
  readonly minLength: number;
  readonly rule:
    | { readonly kind: 'groups'; readonly sizes: ReadonlyArray<number> }
    | { readonly kind: 'straight'; readonly length: number }
    | { readonly kind: 'fallback' };
}

export interface ModifierContribution {
  readonly modifierId: string;
  readonly modifierName: string;
  readonly stage: 'segment' | 'intersection' | 'multiplier';
  readonly points: number;
  readonly coordinates: ReadonlyArray<Coordinate>;
  readonly segmentIndices: ReadonlyArray<number>;
  readonly factor?: number;
}

export interface SegmentScore extends Segment {
  readonly contributions: ReadonlyArray<ModifierContribution>;
  readonly pattern: PatternName;
  readonly basePoints: number;
  readonly modifierAdjustedPoints: number;
}

export interface ScoringBreakdown {
  readonly baseScore: number;
  readonly additiveBonus: number;
  readonly subtotal: number;
  readonly multiplier: number;
  readonly unroundedTotal: number;
  readonly roundingAdjustment: number;
  readonly contributions: ReadonlyArray<ModifierContribution>;
  readonly segments: ReadonlyArray<SegmentScore>;
  readonly totalScore: number;
}
