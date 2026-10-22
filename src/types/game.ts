import type { PatternName } from './scoring';

/** Shared application metadata contract. */
export interface GameMetadata {
  readonly title: string;
  readonly version: string;
  readonly genre: string;
  readonly players: 1;
}

export type TileValue = 1 | 2 | 3 | 4 | 5;

export interface Tile {
  readonly value: TileValue;
}

export type Cell = Tile | null;
export type Board = ReadonlyArray<ReadonlyArray<Cell>>;

export type GamePhase =
  | 'menu'
  | 'playing'
  | 'round-result'
  | 'shop'
  | 'game-over'
  | 'victory';

/** Final evaluation recorded once after the ninth placement. */
export interface RoundResult {
  readonly round: number;
  readonly score: number;
  readonly target: number;
  readonly outcome: 'cleared' | 'game-over' | 'victory';
  readonly cleared: boolean;
  readonly creditsEarned: number;
}

export type ModifierEffect =
  | { readonly kind: 'patterns'; readonly patterns: ReadonlyArray<PatternName>; readonly bonus: number }
  | { readonly kind: 'sum'; readonly sum: number; readonly bonus: number }
  | { readonly kind: 'length'; readonly length: number; readonly bonus: number }
  | { readonly kind: 'intersection'; readonly bonus: number }
  | { readonly kind: 'multiplier'; readonly factor: number };

/** Unique per run. Effects are optional for metadata-only modifiers. */
export interface Modifier {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect?: ModifierEffect;
}

export interface ShopOffer {
  readonly purchased: boolean;
  readonly id: string;
  readonly modifier: Modifier;
  readonly cost: number;
}

export interface RunStatistics {
  readonly totalScore: number;
  readonly bestRoundScore: number;
  readonly tilesPlaced: number;
  readonly roundsPlayed: number;
  readonly roundsCleared: number;
  readonly history: ReadonlyArray<RoundResult>;
}

export interface GameState {
  readonly credits: number;
  readonly shopOffers: ReadonlyArray<ShopOffer>;
  readonly modifiers: ReadonlyArray<Modifier>;
  readonly statistics: RunStatistics;
  readonly phase: GamePhase;
  /** Zero in the menu; 1 through 8 during a run. */
  readonly round: number;
  readonly board: Board;
  /** Remaining tiles in placement order, all visible to the player. */
  readonly queue: ReadonlyArray<Tile>;
  readonly placements: number;
  /** Null until the ninth placement evaluates the completed board. */
  readonly roundResult: RoundResult | null;
}
