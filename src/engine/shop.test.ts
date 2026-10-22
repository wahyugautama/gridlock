import { describe, expect, it } from 'vitest';
import { calculateCreditReward, canPurchaseOffer, generateShopOffers, openShop, purchaseOffer } from './shop';
import { continueRun, evaluateRound, placeTile, restartRun, startRound } from './game';
import { MODIFIER_CATALOG } from '../data/shop';
import type { GameState } from '../types/game';

const clearedRound = (round = 1): GameState => {
  let state: GameState = { ...restartRun(1), round, queue: Array.from({ length: 9 }, () => ({ value: 1 as const })) };
  for (const [row, column] of [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [3, 2], [4, 2]]) state = placeTile(state, row, column);
  return state;
};

const freeze = <T,>(value: T): T => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

describe('Credits', () => {
  it.each([[29, 30, 0], [30, 30, 5], [54, 30, 5], [55, 30, 6], [79, 30, 6], [80, 30, 7], [300, 240, 7]])('rewards score %i against target %i with %i Credits', (score, target, reward) => {
    expect(calculateCreditReward(score, target)).toBe(reward);
  });
  it('starts at zero and rewards a cleared round exactly once', () => {
    expect(restartRun(1).credits).toBe(0);
    const state = clearedRound();
    expect(state.credits).toBe(15);
    expect(state.roundResult?.creditsEarned).toBe(15);
    expect(evaluateRound(state)).toBe(state);
    const shop = continueRun(state, 2);
    expect(shop.credits).toBe(15);
    expect(continueRun(shop, 3).credits).toBe(15);
  });
  it('keeps existing Credits when a round fails', () => {
    const state: GameState = { ...restartRun(1), credits: 9, placements: 9, queue: [] };
    const failed = evaluateRound(state);
    expect(failed.credits).toBe(9);
    expect(failed.roundResult?.creditsEarned).toBe(0);
    expect(continueRun(failed, 2).phase).toBe('game-over');
    expect(openShop(failed, 2)).toBe(failed);
  });
});

describe('seeded shop and purchases', () => {
  it('selects exactly three distinct offers deterministically without mutating the catalog', () => {
    const before = structuredClone(MODIFIER_CATALOG);
    expect(generateShopOffers(123, 1)).toEqual(generateShopOffers(123, 1));
    const selections = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const offers = generateShopOffers(seed, 1);
      expect(offers).toHaveLength(3);
      expect(new Set(offers.map(offer => offer.modifier.id)).size).toBe(3);
      selections.add(offers.map(offer => offer.id).join(','));
    }
    expect(selections.size).toBeGreaterThan(1);
    expect(MODIFIER_CATALOG).toEqual(before);
    expect(() => generateShopOffers(NaN, 1)).toThrow(RangeError);
  });
  it('prevents bypassing or rerolling a shop and allows leaving without a purchase', () => {
    const result = clearedRound();
    expect(startRound(result, 2)).toBe(result);
    const shop = openShop(result, 2);
    expect(shop.phase).toBe('shop');
    expect(openShop(shop, 999)).toBe(shop);
    const next = continueRun(shop, 3);
    expect(next.phase).toBe('playing');
    expect(next.round).toBe(2);
    expect(next.credits).toBe(result.credits);
    expect(next.shopOffers).toEqual([]);
    expect(next.modifiers).toEqual([]);
  });
  it('purchases immutably, checks exact affordability, and prevents duplicate purchases', () => {
    const initial = openShop(clearedRound(), 2);
    const offer = initial.shopOffers[0];
    const state = freeze({ ...initial, credits: offer.cost });
    expect(canPurchaseOffer(state, offer.id)).toBe(true);
    const bought = purchaseOffer(state, offer.id);
    expect(bought.credits).toBe(0);
    expect(bought.modifiers).toEqual([offer.modifier]);
    expect(bought.shopOffers[0].purchased).toBe(true);
    expect(purchaseOffer(bought, offer.id)).toBe(bought);
    expect(purchaseOffer({ ...bought, credits: 100 }, offer.id).modifiers).toHaveLength(1);
    expect(state.shopOffers[0].purchased).toBe(false);
    expect(state.modifiers).toEqual([]);
  });
  it('rejects insufficient funds, unknown offers, and purchases outside shop', () => {
    const state = { ...openShop(clearedRound(), 2), credits: 0 };
    expect(canPurchaseOffer(state, state.shopOffers[0].id)).toBe(false);
    expect(purchaseOffer(state, state.shopOffers[0].id)).toBe(state);
    expect(purchaseOffer(state, 'unknown')).toBe(state);
    const playing = { ...state, phase: 'playing' as const, credits: 100 };
    expect(purchaseOffer(playing, playing.shopOffers[0].id)).toBe(playing);
  });
  it('allows multiple purchases and retains Credits and modifiers into the next round', () => {
    const state = { ...openShop(clearedRound(), 2), credits: 100 };
    let bought = state;
    for (const offer of state.shopOffers) bought = purchaseOffer(bought, offer.id);
    expect(bought.modifiers).toHaveLength(3);
    expect(bought.credits).toBe(100 - state.shopOffers.reduce((sum, offer) => sum + offer.cost, 0));
    const next = continueRun(bought, 3);
    expect(next.modifiers).toEqual(bought.modifiers);
    expect(next.credits).toBe(bought.credits);
    expect(next.statistics).toEqual(bought.statistics);
    expect(next.board.flat().every(cell => cell === null)).toBe(true);
    expect(next.queue).toHaveLength(9);
    const fresh = restartRun(3);
    expect(fresh.credits).toBe(0);
    expect(fresh.shopOffers).toEqual([]);
    expect(fresh.modifiers).toEqual([]);
  });
  it('awards final-round Credits but never opens a shop after round eight', () => {
    const result = clearedRound(8);
    expect(result.credits).toBe(7);
    expect(openShop(result, 2)).toBe(result);
    expect(continueRun(result, 2).phase).toBe('victory');
    expect(continueRun(result, 2).shopOffers).toEqual([]);
  });
  it('rejects an already-owned modifier even through another offer', () => {
    const modifier = MODIFIER_CATALOG[0].modifier;
    const state = { ...openShop(clearedRound(), 2), modifiers: [modifier], credits: 100, shopOffers: [{ id: 'copy', modifier, cost: 3, purchased: false }] };
    expect(purchaseOffer(state, 'copy')).toBe(state);
    expect(canPurchaseOffer(state, 'copy')).toBe(false);
  });

  it('excludes owned modifiers and handles a nearly or fully exhausted catalog', () => {
    const owned = MODIFIER_CATALOG.slice(0, 7).map(entry => entry.modifier);
    const offers = generateShopOffers(1, 3, owned);
    expect(offers).toHaveLength(1);
    expect(offers[0].modifier.id).toBe('multiplier');
    expect(generateShopOffers(1, 3, MODIFIER_CATALOG.map(entry => entry.modifier))).toEqual([]);
    const shop = openShop({ ...clearedRound(), modifiers: MODIFIER_CATALOG.map(entry => entry.modifier) }, 2);
    expect(shop.shopOffers).toEqual([]);
    expect(continueRun(shop, 3).phase).toBe('playing');
  });
});
