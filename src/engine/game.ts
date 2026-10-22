import { GAME_RULES, ROUND_TARGETS } from '../data/game';
import type { Board, GameState, RoundResult, Tile, TileValue } from '../types/game';

import { scoreBoard } from './scoring';
import { createRandom } from './random';
import { calculateCreditReward, openShop } from './shop';

const createBoard = (): Board =>
  Array.from({ length: GAME_RULES.boardSize }, () =>
    Array.from({ length: GAME_RULES.boardSize }, () => null),
  );

/** Seeded PRNG with local state only: identical seeds produce identical queues. */
const createQueue = (seed: number): ReadonlyArray<Tile> => {
  const random = createRandom(seed);
  return Array.from({ length: GAME_RULES.placementsPerRound }, () => {
    const sample = random();
    const range = GAME_RULES.maxTileValue - GAME_RULES.minTileValue + 1;
    return { value: (Math.floor(sample * range) + GAME_RULES.minTileValue) as TileValue };
  });
};

export const createInitialState = (): GameState => ({
  phase: 'menu',
  credits: 0,
  shopOffers: [],
  modifiers: [],
  statistics: { totalScore: 0, bestRoundScore: 0, tilesPlaced: 0, roundsPlayed: 0, roundsCleared: 0, history: [] },
  round: 0,
  board: createBoard(),
  queue: [],
  placements: 0,
  roundResult: null,
});

/** Starts a round only after explicit input. Invalid phase transitions are no-ops. */
export const startRound = (state: GameState, seed: number): GameState => {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Round seed must be an unsigned 32-bit integer.');
  }
  if (state.phase !== 'menu' && state.phase !== 'shop') return state;
  const round = state.phase === 'menu' ? 1 : state.round + 1;
  if (round > GAME_RULES.roundsPerRun) return state;

  return {
    ...state,
    phase: 'playing',
    shopOffers: [],
    round,
    board: createBoard(),
    queue: createQueue(seed),
    placements: 0,
    roundResult: null,
  };
};

export const getRemainingMoves = (state: GameState): number =>
  Math.max(0, Math.min(state.queue.length, GAME_RULES.placementsPerRound - state.placements));

export const isRoundComplete = (state: GameState): boolean =>
  state.round > 0 && state.placements === GAME_RULES.placementsPerRound;

/** Coordinates are zero-based. Occupied cells cannot be moved or replaced. */
export const canPlaceTile = (state: GameState, row: number, column: number): boolean => {
  if (state.phase !== 'playing' || getRemainingMoves(state) === 0) return false;
  if (!Number.isInteger(row) || !Number.isInteger(column)) return false;
  if (row < 0 || column < 0 || row >= GAME_RULES.boardSize || column >= GAME_RULES.boardSize) return false;
  return state.board[row]?.[column] === null;
};

/** Illegal placements return the original state without consuming a tile. */
export const placeTile = (state: GameState, row: number, column: number): GameState => {
  if (!canPlaceTile(state, row, column)) return state;
  const tile = state.queue[0];
  const placements = state.placements + 1;
  const next: GameState = {
    ...state,
    statistics: { ...state.statistics, tilesPlaced: state.statistics.tilesPlaced + 1 },
    board: state.board.map((cells, rowIndex) =>
      rowIndex === row
        ? cells.map((cell, columnIndex) => columnIndex === column ? tile : cell)
        : cells,
    ),
    queue: state.queue.slice(1),
    placements,
    phase: 'playing',
  };
  return isRoundComplete(next) ? evaluateRound(next) : next;
};

export const getRoundTarget = (round: number): number => {
  const target = ROUND_TARGETS[round - 1];
  if (target === undefined) throw new RangeError('Round must be between 1 and 8.');
  return target;
};

/** Called once on the final placement; records the result without advancing. */
export const evaluateRound = (state: GameState): GameState => {
  if (state.phase !== 'playing' || !isRoundComplete(state) || state.roundResult) return state;
  const score = scoreBoard(state.board, state.modifiers).totalScore;
  const target = getRoundTarget(state.round);
  const cleared = score >= target;
  const result: RoundResult = {
    round: state.round, score, target, cleared,
    creditsEarned: calculateCreditReward(score, target),
    outcome: !cleared ? 'game-over' : state.round === GAME_RULES.roundsPerRun ? 'victory' : 'cleared',
  };
  return {
    ...state,
    phase: 'round-result',
    credits: state.credits + result.creditsEarned,
    roundResult: result,
    statistics: {
      ...state.statistics,
      totalScore: state.statistics.totalScore + score,
      bestRoundScore: Math.max(state.statistics.bestRoundScore, score),
      roundsPlayed: state.statistics.roundsPlayed + 1,
      roundsCleared: state.statistics.roundsCleared + Number(cleared),
      history: [...state.statistics.history, result],
    },
  };
};

/** Player-driven progression through results, shop, and terminal screens. */
export const continueRun = (state: GameState, seed: number, expected?: Pick<GameState, 'phase' | 'round'>): GameState => {
  // Reject actions queued by an earlier screen rather than advancing twice.
  if (expected && (expected.phase !== state.phase || expected.round !== state.round)) return state;
  if (state.phase === 'shop') return startRound(state, seed);
  if (state.phase !== 'round-result' || !state.roundResult) return state;
  if (state.roundResult.outcome === 'cleared') return openShop(state, seed);
  return { ...state, phase: state.roundResult.outcome };
};

export const restartRun = (seed: number): GameState => startRound(createInitialState(), seed);
