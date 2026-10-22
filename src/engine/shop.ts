import { ECONOMY, MODIFIER_CATALOG } from '../data/shop';
import { GAME_RULES } from '../data/game';
import type { GameState, Modifier, ShopOffer } from '../types/game';
import { createRandom } from './random';

export const calculateCreditReward = (score: number, target: number): number => {
  if (score < target) return 0;
  return ECONOMY.clearReward + Math.floor((score - target) / ECONOMY.bonusPointInterval);
};

export const generateShopOffers = (seed: number, round: number, owned: ReadonlyArray<Modifier> = []): ReadonlyArray<ShopOffer> => {
  const random = createRandom(seed);
  const pool = MODIFIER_CATALOG.filter(entry => !owned.some(modifier => modifier.id === entry.modifier.id));
  // Fisher–Yates samples without replacement and never mutates the catalog.
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, ECONOMY.offersPerShop).map(entry => ({
    ...entry, id: `round-${round}-${entry.modifier.id}`, purchased: false,
  }));
};

export const openShop = (state: GameState, seed: number): GameState => {
  if (state.phase !== 'round-result' || state.roundResult?.outcome !== 'cleared' || state.round >= GAME_RULES.roundsPerRun) return state;
  return { ...state, phase: 'shop', shopOffers: generateShopOffers(seed, state.round, state.modifiers) };
};

export const canPurchaseOffer = (state: GameState, offerId: string): boolean => {
  if (state.phase !== 'shop') return false;
  const offer = state.shopOffers.find(candidate => candidate.id === offerId);
  return Boolean(offer && !offer.purchased && !state.modifiers.some(modifier => modifier.id === offer.modifier.id) && state.credits >= offer.cost);
};

/** Resolve offers from state, never accept a caller-supplied price or modifier. */
export const purchaseOffer = (state: GameState, offerId: string): GameState => {
  if (!canPurchaseOffer(state, offerId)) return state;
  const offer = state.shopOffers.find(candidate => candidate.id === offerId)!;
  return {
    ...state,
    credits: state.credits - offer.cost,
    modifiers: [...state.modifiers, offer.modifier],
    shopOffers: state.shopOffers.map(candidate => candidate.id === offerId ? { ...candidate, purchased: true } : candidate),
  };
};
