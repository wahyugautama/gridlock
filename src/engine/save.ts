import { z } from 'zod';
import { MODIFIER_CATALOG } from '../data/shop';
import { GAME_RULES } from '../data/game';
import { getRoundTarget } from './game';
import { calculateCreditReward } from './shop';
import { scoreBoard } from './scoring';
import type { GameState } from '../types/game';

export const SAVE_VERSION = 1;
export const RULESET_VERSION = 'gridlock-0.1-1';
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const tile = z.object({ value: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) }).strict();
const result = z.object({ round: integer.min(1).max(8), score: integer, target: integer, cleared: z.boolean(), outcome: z.enum(['cleared', 'game-over', 'victory']), creditsEarned: integer }).strict();
const schema = z.object({
  phase: z.enum(['playing', 'round-result', 'shop', 'game-over', 'victory']),
  round: integer.min(1).max(8), credits: integer, placements: integer.max(9),
  board: z.array(z.array(tile.nullable()).length(5)).length(5), queue: z.array(tile).max(9),
  modifiers: z.array(z.string()).max(8),
  shopOffers: z.array(z.object({ id: z.string(), modifier: z.string(), cost: integer, purchased: z.boolean() }).strict()).max(3),
  roundResult: result.nullable(),
  statistics: z.object({ totalScore: integer, bestRoundScore: integer, tilesPlaced: integer, roundsPlayed: integer.max(8), roundsCleared: integer.max(8), history: z.array(result).max(8) }).strict(),
}).strict();

export type LoadResult = { status: 'ready'; state: GameState } | { status: 'empty' | 'invalid' | 'incompatible' | 'unavailable'; state: null };
const assert = (condition: boolean) => { if (!condition) throw new Error('Invalid save invariants'); };
const entryFor = (id: string) => {
  const entry = MODIFIER_CATALOG.find(entry => entry.modifier.id === id);
  if (!entry) throw new Error('Unknown modifier');
  return entry;
};

export const serializeSave = (state: GameState): string => JSON.stringify({ version: SAVE_VERSION, ruleset: RULESET_VERSION, state: {
  ...state, modifiers: state.modifiers.map(modifier => modifier.id),
  shopOffers: state.shopOffers.map(offer => ({ ...offer, modifier: offer.modifier.id })),
} });

/** Treat disk data as untrusted; reconstruct effects from the canonical catalog. */
export const parseSave = (raw: string | null): LoadResult => {
  if (raw === null) return { status: 'empty', state: null };
  try {
    if (raw.length > 100_000) throw new Error('Oversized save');
    const envelope = z.object({ version: z.number(), ruleset: z.string(), state: z.unknown() }).strict().parse(JSON.parse(raw));
    if (envelope.version !== SAVE_VERSION || envelope.ruleset !== RULESET_VERSION) return { status: 'incompatible', state: null };
    const data = schema.parse(envelope.state);
    assert(new Set(data.modifiers).size === data.modifiers.length);
    const modifiers = data.modifiers.map(id => entryFor(id).modifier);
    const offers = data.shopOffers.map(offer => {
      const entry = entryFor(offer.modifier);
      assert(offer.cost === entry.cost && offer.id === `round-${data.round}-${offer.modifier}`);
      assert(offer.purchased === data.modifiers.includes(offer.modifier));
      return { ...offer, modifier: entry.modifier };
    });
    assert(new Set(offers.map(offer => offer.id)).size === offers.length);
    assert(data.phase === 'shop' || offers.length === 0);
    assert(data.board.flat().filter(Boolean).length === data.placements);
    const playing = data.phase === 'playing';
    assert(playing ? data.placements < 9 && data.queue.length === 9 - data.placements && data.roundResult === null : data.placements === 9 && data.queue.length === 0 && data.roundResult !== null);
    const history = data.statistics.history;
    assert(history.length === data.round - (playing ? 1 : 0));
    history.forEach((record, index) => {
      assert(record.round === index + 1 && record.target === getRoundTarget(record.round));
      assert(record.cleared === (record.score >= record.target));
      assert(record.creditsEarned === calculateCreditReward(record.score, record.target));
      assert(record.outcome === (!record.cleared ? 'game-over' : record.round === GAME_RULES.roundsPerRun ? 'victory' : 'cleared'));
      if (index < history.length - 1 || playing) assert(record.outcome === 'cleared');
    });
    const totalEarned = history.reduce((sum, result) => sum + result.creditsEarned, 0);
    assert(data.credits === totalEarned - data.modifiers.reduce((sum, id) => sum + entryFor(id).cost, 0));
    assert(data.statistics.totalScore === history.reduce((sum, result) => sum + result.score, 0));
    assert(data.statistics.bestRoundScore === Math.max(0, ...history.map(result => result.score)));
    assert(data.statistics.roundsPlayed === history.length && data.statistics.roundsCleared === history.filter(result => result.cleared).length);
    assert(data.statistics.tilesPlaced === (data.round - 1) * 9 + data.placements);
    if (data.roundResult) {
      assert(JSON.stringify(data.roundResult) === JSON.stringify(history.at(-1)));
      const scoringModifiers = modifiers.filter(modifier => !offers.some(offer => offer.purchased && offer.modifier.id === modifier.id));
      assert(scoreBoard(data.board, scoringModifiers).totalScore === data.roundResult.score);
      if (data.phase === 'shop') assert(data.roundResult.outcome === 'cleared' && data.round < 8);
      if (data.phase === 'victory') assert(data.roundResult.outcome === 'victory');
      if (data.phase === 'game-over') assert(data.roundResult.outcome === 'game-over');
    }
    return { status: 'ready', state: { ...data, modifiers, shopOffers: offers } };
  } catch { return { status: 'invalid', state: null }; }
};
