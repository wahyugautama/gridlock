import { describe, expect, it } from 'vitest';
import { ROUND_TARGETS } from '../data/game';
import type { GameState, Modifier, Tile } from '../types/game';
import { continueRun, evaluateRound, getRoundTarget, placeTile, restartRun, startRound } from './game';

const cross = [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [3, 2], [4, 2]];
const isolated = [[0, 0], [0, 2], [0, 4], [2, 0], [2, 2], [2, 4], [4, 0], [4, 2], [4, 4]];
const complete = (state: GameState, win = true): GameState => {
  let current: GameState = { ...state, queue: Array.from({ length: 9 }, (): Tile => ({ value: 1 })) };
  for (const [row, column] of win ? cross : isolated) current = placeTile(current, row, column);
  return current;
};
const freeze = (state: GameState): GameState => {
  const deepFreeze = (value: unknown) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
  };
  deepFreeze(state);
  return state;
};

describe('run progression', () => {
  it('uses all eight configurable targets', () => {
    expect(ROUND_TARGETS).toEqual([30, 45, 65, 90, 120, 155, 195, 240]);
    ROUND_TARGETS.forEach((target, index) => expect(getRoundTarget(index + 1)).toBe(target));
    expect(() => getRoundTarget(0)).toThrow(RangeError);
    expect(() => getRoundTarget(9)).toThrow(RangeError);
  });

  it('records no result before the ninth move and clears at exactly the target', () => {
    let state: GameState = { ...restartRun(1), queue: [1, 1, 2, 2, 2, 3, 3, 3, 4].map(value => ({ value } as Tile)) };
    // Three distinct horizontal pairs, separated by empty rows: 10 + 10 + 10.
    const cells = [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2], [4, 0], [4, 1], [4, 2]];
    cells.forEach(([row, column], index) => {
      if (index < 9) expect(state.roundResult).toBeNull();
      state = placeTile(state, row, column);
    });
    expect(state.roundResult).toMatchObject({ score: 30, target: 30, cleared: true, outcome: 'cleared' });
    expect(state.phase).toBe('round-result');
    expect(state.round).toBe(1);
    expect(state.statistics).toMatchObject({ totalScore: 30, tilesPlaced: 9, roundsPlayed: 1, roundsCleared: 1 });
    expect(evaluateRound(state)).toBe(state);
    expect(placeTile(state, 4, 4)).toBe(state);
  });

  it('resets round data but preserves purchased modifiers and cumulative statistics', () => {
    const modifier: Modifier = { id: 'owned', name: 'Owned modifier', description: 'Preserved for future effects' };
    const result = freeze(complete({ ...restartRun(1), modifiers: [modifier] }));
    const snapshot = structuredClone(result);
    const next = continueRun(continueRun(result, 2), 2);
    expect(next.phase).toBe('playing');
    expect(next.round).toBe(2);
    expect(next.board.flat().every(cell => cell === null)).toBe(true);
    expect(next.queue).toEqual(startRound({ ...result, phase: 'shop' }, 2).queue);
    expect(next.queue).toHaveLength(9);
    expect(next.placements).toBe(0);
    expect(next.roundResult).toBeNull();
    expect(next.modifiers).toEqual([modifier]);
    expect(next.statistics).toEqual(result.statistics);
    expect(result).toEqual(snapshot);
    expect(continueRun(next, 3)).toBe(next);
  });

  it('records failure, then enters game-over only on acknowledgment', () => {
    const result = complete(restartRun(1), false);
    expect(result.phase).toBe('round-result');
    expect(result.roundResult).toMatchObject({ score: 0, cleared: false, outcome: 'game-over' });
    expect(startRound(result, 2)).toBe(result);
    const ended = continueRun(freeze(result), 2);
    expect(ended.phase).toBe('game-over');
    expect(ended.round).toBe(1);
    expect(ended.statistics).toMatchObject({ roundsPlayed: 1, roundsCleared: 0, tilesPlaced: 9 });
    expect(continueRun(ended, 3)).toBe(ended);
    expect(startRound(ended, 3)).toBe(ended);
  });

  it('plays all eight rounds, preserves totals, and never starts a ninth round', () => {
    let state = restartRun(1);
    for (let round = 1; round <= 8; round++) {
      expect(state.round).toBe(round);
      state = complete(state);
      expect(state.phase).toBe('round-result');
      expect(state.roundResult).toMatchObject({ round, score: 300, target: ROUND_TARGETS[round - 1], cleared: true });
      expect(state.statistics).toMatchObject({ totalScore: round * 300, tilesPlaced: round * 9, roundsPlayed: round, roundsCleared: round });
      expect(state.statistics.history).toHaveLength(round);
      state = continueRun(freeze(state), round + 1);
      if (state.phase === 'shop') state = continueRun(state, round + 1);
    }
    expect(state.phase).toBe('victory');
    expect(state.round).toBe(8);
    expect(state.statistics.bestRoundScore).toBe(300);
    expect(startRound(state, 9)).toBe(state);
    expect(continueRun(state, 9)).toBe(state);
  });

  it('failing round eight is game-over, not victory, and retains previous scores', () => {
    let state = restartRun(1);
    for (let round = 1; round < 8; round++) state = continueRun(continueRun(complete(state), round + 1), round + 1);
    state = continueRun(complete(state, false), 9);
    expect(state.phase).toBe('game-over');
    expect(state.statistics).toMatchObject({ totalScore: 2100, roundsCleared: 7, roundsPlayed: 8, tilesPlaced: 72 });
  });

  it.each(['playing', 'round-result', 'game-over', 'victory'] as const)('restarts from %s with no carried run data', phase => {
    const old = freeze({ ...complete(restartRun(1)), phase, modifiers: [{ id: 'x', name: 'x', description: 'x' }] });
    const fresh = restartRun(99);
    expect(fresh.phase).toBe('playing');
    expect(fresh.round).toBe(1);
    expect(fresh.modifiers).toEqual([]);
    expect(fresh.statistics).toEqual({ totalScore: 0, bestRoundScore: 0, tilesPlaced: 0, roundsPlayed: 0, roundsCleared: 0, history: [] });
    expect(fresh.board.flat().every(cell => cell === null)).toBe(true);
    expect(fresh.queue).toHaveLength(9);
    expect(fresh.roundResult).toBeNull();
    expect(old.statistics.roundsPlayed).toBe(1);
  });
});
