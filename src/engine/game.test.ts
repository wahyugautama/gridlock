import { describe, expect, it } from 'vitest';
import type { GamePhase, GameState } from '../types/game';
import { canPlaceTile, createInitialState, getRemainingMoves, isRoundComplete, placeTile, startRound } from './game';

const playing = () => startRound(createInitialState(), 42);
const completeRound = (state: GameState): GameState => {
  let current = state;
  for (let index = 0; index < 9; index++) {
    current = placeTile(current, Math.floor(index / 5), index % 5);
  }
  return current;
};

const freezeState = (state: GameState): GameState => {
  state.board.forEach(row => { row.forEach(tile => { if (tile) Object.freeze(tile); }); Object.freeze(row); });
  state.queue.forEach(Object.freeze);
  Object.freeze(state.board);
  Object.freeze(state.queue);
  return Object.freeze(state);
};

describe('round initialization', () => {
  it('creates independent empty 5x5 boards in the menu', () => {
    const state = createInitialState();
    expect(state.phase).toBe('menu');
    expect(state.round).toBe(0);
    expect(state.board).toEqual(Array.from({ length: 5 }, () => Array(5).fill(null)));
    expect(new Set(state.board).size).toBe(5);
    expect(createInitialState().board).not.toBe(state.board);
    expect(getRemainingMoves(state)).toBe(0);
    expect(isRoundComplete(state)).toBe(false);
  });

  it('starts round one with nine reproducible integer tiles between 1 and 5', () => {
    const state = playing();
    expect(state.phase).toBe('playing');
    expect(state.round).toBe(1);
    expect(state.queue).toHaveLength(9);
    expect(state).toEqual(playing());
    expect(state.queue).not.toEqual(startRound(createInitialState(), 43).queue);
    for (let seed = 0; seed < 100; seed++) {
      for (const tile of startRound(createInitialState(), seed).queue) {
        expect(Number.isInteger(tile.value)).toBe(true);
        expect(tile.value).toBeGreaterThanOrEqual(1);
        expect(tile.value).toBeLessThanOrEqual(5);
      }
    }
    expect(getRemainingMoves(state)).toBe(9);
  });

  it('clears the board, queue progress, and result when advancing from shop', () => {
    const state: GameState = freezeState({ ...completeRound(playing()), phase: 'shop', roundResult: { round: 1, score: 50, target: 40, outcome: 'cleared', cleared: true, creditsEarned: 5 } });
    const next = startRound(state, 7);
    expect(next.round).toBe(2);
    expect(next.board.flat().every(cell => cell === null)).toBe(true);
    expect(next.queue).toHaveLength(9);
    expect(next.placements).toBe(0);
    expect(next.roundResult).toBeNull();
    expect(state.board.flat().filter(Boolean)).toHaveLength(9);
  });

  it('cannot restart an active round or start round nine', () => {
    const state = playing();
    expect(startRound(state, 1)).toBe(state);
    const last: GameState = { ...state, phase: 'shop', round: 8 };
    expect(startRound(last, 1)).toBe(last);
    expect(startRound({ ...state, phase: 'shop', round: 7 }, 1).round).toBe(8);
  });

  it.each([-1, 1.5, NaN, Infinity, 4294967296])('rejects invalid seed %s', seed => {
    expect(() => startRound(createInitialState(), seed)).toThrow(RangeError);
  });
});

describe('tile placement', () => {
  it('places the first queued tile immutably and consumes exactly one tile', () => {
    const state = freezeState(playing());
    const snapshot = structuredClone(state);
    expect(canPlaceTile(state, 4, 4)).toBe(true);
    const next = placeTile(state, 4, 4);
    expect(next.board[4][4]).toEqual(state.queue[0]);
    expect(next.board.flat().filter(Boolean)).toHaveLength(1);
    expect(next.queue).toEqual(state.queue.slice(1));
    expect(next.placements).toBe(1);
    expect(getRemainingMoves(next)).toBe(8);
    expect(next.phase).toBe('playing');
    expect(state).toEqual(snapshot);
  });

  it('rejects replacing a tile without consuming the queue', () => {
    const state = placeTile(playing(), 0, 0);
    expect(canPlaceTile(state, 0, 0)).toBe(false);
    expect(placeTile(state, 0, 0)).toBe(state);
    expect(state.queue).toHaveLength(8);
  });

  it.each([[-1, 0], [0, -1], [5, 0], [0, 5], [0.5, 0], [0, 0.5], [NaN, 0], [0, Infinity]])('rejects coordinates (%s, %s)', (row, column) => {
    const state = playing();
    expect(canPlaceTile(state, row, column)).toBe(false);
    expect(placeTile(state, row, column)).toBe(state);
  });

  it.each<GamePhase>(['menu', 'round-result', 'shop', 'game-over', 'victory'])('rejects placement during %s', phase => {
    const state: GameState = { ...playing(), phase };
    expect(canPlaceTile(state, 0, 0)).toBe(false);
    expect(placeTile(state, 0, 0)).toBe(state);
    if (phase !== 'menu' && phase !== 'shop') expect(startRound(state, 1)).toBe(state);
  });

  it('rejects placement with an empty queue', () => {
    const state = { ...playing(), queue: [] };
    expect(placeTile(state, 0, 0)).toBe(state);
  });

  it('consumes tiles in order and completes only after nine placements', () => {
    const initial = playing();
    let state = initial;
    initial.queue.forEach((tile, index) => {
      expect(isRoundComplete(state)).toBe(false);
      state = placeTile(freezeState(state), Math.floor(index / 5), index % 5);
      expect(state.board[Math.floor(index / 5)][index % 5]).toEqual(tile);
      expect(getRemainingMoves(state)).toBe(8 - index);
    });
    expect(isRoundComplete(state)).toBe(true);
    expect(state.phase).toBe('round-result');
    expect(state.roundResult).toMatchObject({ round: 1, target: 30 });
    expect(state.queue).toEqual([]);
    expect(state.board.flat().filter(Boolean)).toHaveLength(9);
    expect(placeTile(state, 4, 4)).toBe(state);
  });
});
