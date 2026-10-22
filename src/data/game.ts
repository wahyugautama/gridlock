import type { GameMetadata } from '../types/game';

export const GAME_CONFIG = Object.freeze({
  title: 'GRIDLOCK',
  version: '0.1',
  genre: 'Roguelike puzzle',
  players: 1,
} satisfies GameMetadata);

export const GAME_RULES = Object.freeze({
  boardSize: 5,
  roundsPerRun: 8,
  placementsPerRound: 9,
  minTileValue: 1,
  maxTileValue: 5,
} as const);

/** Initial balancing targets, indexed by round minus one. */
export const ROUND_TARGETS = Object.freeze([30, 45, 65, 90, 120, 155, 195, 240] as const);
