import { expect, it } from 'vitest';
import { parseSave, serializeSave, RULESET_VERSION, SAVE_VERSION } from './save';
import { continueRun, placeTile, restartRun } from './game';
import { purchaseOffer } from './shop';
import type { GameState } from '../types/game';

const complete = (state: GameState, clear = true) => {
  let next: GameState = { ...state, queue: Array.from({ length: 9 }, () => ({ value: 1 as const })) };
  const cells = clear ? [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [3, 2], [4, 2]] : [[0, 0], [0, 2], [0, 4], [2, 0], [2, 2], [2, 4], [4, 0], [4, 2], [4, 4]];
  cells.forEach(([row, col]) => { next = placeTile(next, row, col); });
  return next;
};
const check = (state: GameState) => expect(parseSave(serializeSave(state))).toEqual({ status: 'ready', state });

it('round-trips every run phase, partial board, queues, offers, and purchases', () => {
  let state = restartRun(123);
  check(state);
  check(placeTile(state, 0, 0));
  for (let round = 1; round <= 8; round++) {
    state = complete(state);
    check(state);
    state = continueRun(state, round);
    check(state);
    if (state.phase === 'shop') {
      for (const offer of state.shopOffers) { state = purchaseOffer(state, offer.id); check(state); }
      state = continueRun(state, round + 100);
      check(state);
    }
  }
  expect(state.phase).toBe('victory');
  const failed = complete(restartRun(1), false);
  check(failed);
  check(continueRun(failed, 2));
});

it('rejects malformed JSON, oversized data, incompatible versions, and rulesets', () => {
  expect(parseSave(null).status).toBe('empty');
  for (const raw of ['', '{', 'null', '[]', '{}', 'x'.repeat(100001)]) expect(parseSave(raw).status).toBe('invalid');
  expect(parseSave(JSON.stringify({ version: SAVE_VERSION + 1, ruleset: RULESET_VERSION, state: {} })).status).toBe('incompatible');
  expect(parseSave(JSON.stringify({ version: SAVE_VERSION, ruleset: 'old', state: {} })).status).toBe('incompatible');
});

it('rejects invalid board, queue, phase, counters, Credits, and modifiers', () => {
  const original = JSON.parse(serializeSave(restartRun(1)));
  const mutations = [
    { board: [] }, { queue: [] }, { phase: 'unknown' }, { round: 9 }, { placements: 1 },
    { credits: -1 }, { credits: 50 }, { modifiers: ['unknown'] },
    { modifiers: ['minimalist', 'minimalist'] },
    { board: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ value: 6 }))) },
    { queue: [{ value: 1.5 }] }, { roundResult: {} }, { shopOffers: [{}] },
  ];
  mutations.forEach(change => expect(parseSave(JSON.stringify({ ...original, state: { ...original.state, ...change } })).status).toBe('invalid'));
});

it('rejects tampered results, histories, prices and purchase status', () => {
  const shop = continueRun(complete(restartRun(1)), 2);
  const original = JSON.parse(serializeSave(shop));
  for (const edit of [
    (state: typeof original.state) => { state.statistics.totalScore++; },
    (state: typeof original.state) => { state.statistics.tilesPlaced++; },
    (state: typeof original.state) => { state.statistics.history[0].creditsEarned++; },
    (state: typeof original.state) => { state.roundResult.score++; },
    (state: typeof original.state) => { state.shopOffers[0].cost = 0; },
    (state: typeof original.state) => { state.shopOffers[0].purchased = true; },
    (state: typeof original.state) => { state.phase = 'victory'; },
  ]) {
    const changed = structuredClone(original);
    edit(changed.state);
    expect(parseSave(JSON.stringify(changed)).status).toBe('invalid');
  }
});
