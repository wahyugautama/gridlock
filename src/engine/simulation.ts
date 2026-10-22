import { GAME_RULES } from '../data/game';
import { MODIFIER_CATALOG } from '../data/shop';
import type { GameState } from '../types/game';
import { canPlaceTile, continueRun, placeTile, restartRun } from './game';
import { createRandom } from './random';
import { scoreBoard } from './scoring';
import { canPurchaseOffer, purchaseOffer } from './shop';

export type Strategy = 'random' | 'greedy';

/** Greedy maximizes the full immediate board score; ties are seeded random. */
export const choosePlacement = (state: GameState, strategy: Strategy, random: () => number): readonly [number, number] => {
  const candidates: Array<{ cell: readonly [number, number]; score: number }> = [];
  state.board.forEach((row, r) => row.forEach((_, c) => {
    if (!canPlaceTile(state, r, c)) return;
    const next = strategy === 'greedy' ? placeTile(state, r, c) : state;
    candidates.push({ cell: [r, c], score: strategy === 'greedy' ? scoreBoard(next.board, next.modifiers).totalScore : 0 });
  }));
  if (!candidates.length) throw new Error('Simulation requested a move without legal cells.');
  const best = Math.max(...candidates.map(candidate => candidate.score));
  const tied = candidates.filter(candidate => candidate.score === best);
  return tied[Math.floor(random() * tied.length)].cell;
};

/** Both strategies buy affordable offers cheapest-first, then by ID. No lookahead. */
export const simulate = (strategy: Strategy, runs = 1000, firstSeed = 1) => {
  if (!Number.isInteger(runs) || runs < 1) throw new RangeError('Runs must be a positive integer.');
  if (!Number.isInteger(firstSeed) || firstSeed < 0 || firstSeed + runs - 1 > 0xffffffff) throw new RangeError('Seeds must fit unsigned 32-bit integers.');
  const rounds = Array.from({ length: GAME_RULES.roundsPerRun }, (_, index) => ({ round: index + 1, entered: 0, cleared: 0, scoreSum: 0, creditsSum: 0 }));
  const purchases = Object.fromEntries(MODIFIER_CATALOG.map(entry => [entry.modifier.id, { offered: 0, purchased: 0 }]));
  let victories = 0;
  let earned = 0;
  let spent = 0;
  let endingCredits = 0;
  for (let run = 0; run < runs; run++) {
    const seed = firstSeed + run;
    // Separate environment and decision streams: both strategies see the same queues/shops at each reached round.
    const environment = createRandom(seed);
    const decisions = createRandom((seed ^ 0xa5a5a5a5) >>> 0);
    const nextSeed = () => Math.floor(environment() * 4294967296);
    let state = restartRun(nextSeed());
    while (state.phase !== 'game-over' && state.phase !== 'victory') {
      if (state.phase === 'playing') {
        if (state.placements === 0) rounds[state.round - 1].entered++;
        const [row, column] = choosePlacement(state, strategy, decisions);
        state = placeTile(state, row, column);
      } else if (state.phase === 'round-result') {
        const result = state.roundResult!;
        const stats = rounds[state.round - 1];
        stats.scoreSum += result.score;
        stats.creditsSum += result.creditsEarned;
        stats.cleared += Number(result.cleared);
        earned += result.creditsEarned;
        state = continueRun(state, nextSeed());
      } else if (state.phase === 'shop') {
        const offers = [...state.shopOffers].sort((a, b) => a.cost - b.cost || a.modifier.id.localeCompare(b.modifier.id));
        for (const offer of offers) {
          purchases[offer.modifier.id].offered++;
          if (!canPurchaseOffer(state, offer.id)) continue;
          state = purchaseOffer(state, offer.id);
          purchases[offer.modifier.id].purchased++;
          spent += offer.cost;
        }
        state = continueRun(state, nextSeed());
      } else throw new Error(`Unexpected simulation phase: ${state.phase}`);
    }
    victories += Number(state.phase === 'victory');
    endingCredits += state.credits;
  }
  return {
    strategy, runs, firstSeed, lastSeed: firstSeed + runs - 1,
    purchasePolicy: 'cheapest affordable first; ID breaks equal-price ties; buy all affordable unowned offers',
    rounds: rounds.map(round => ({ ...round,
      survivalRate: round.cleared / runs,
      conditionalClearRate: round.entered ? round.cleared / round.entered : null,
      averageScore: round.entered ? round.scoreSum / round.entered : null,
      averageCreditsEarned: round.entered ? round.creditsSum / round.entered : null,
    })),
    averageCreditsEarned: earned / runs, averageCreditsSpent: spent / runs, averageEndingCredits: endingCredits / runs,
    purchases: Object.entries(purchases).map(([id, counts]) => ({ id, ...counts, frequencyPerRun: counts.purchased / runs, purchaseRateWhenOffered: counts.offered ? counts.purchased / counts.offered : null })),
    victories, victoryRate: victories / runs,
  };
};
