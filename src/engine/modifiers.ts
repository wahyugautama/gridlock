import type { Modifier, ModifierEffect } from '../types/game';
import type { ModifierContribution, ScoringBreakdown, SegmentScore } from '../types/scoring';

type EffectKind = ModifierEffect['kind'];
type Evaluators = { [K in EffectKind]: (effect: Extract<ModifierEffect, { kind: K }>, segments: ReadonlyArray<SegmentScore>, modifier: Modifier) => ModifierContribution[] };

const segmentBonuses = (segments: ReadonlyArray<SegmentScore>, modifier: Modifier, bonus: number, matches: (segment: SegmentScore) => boolean): ModifierContribution[] =>
  segments.flatMap((segment, index) => matches(segment) ? [{
    modifierId: modifier.id, modifierName: modifier.name, stage: 'segment' as const,
    points: bonus, coordinates: segment.coordinates, segmentIndices: [index],
  }] : []);

/** Effect handlers are independent of modifier IDs and React. */
const evaluators: Evaluators = {
  patterns: (effect, segments, modifier) => segmentBonuses(segments, modifier, effect.bonus, segment => effect.patterns.includes(segment.pattern)),
  sum: (effect, segments, modifier) => segmentBonuses(segments, modifier, effect.bonus, segment => segment.values.reduce((sum, value) => sum + value, 0) === effect.sum),
  length: (effect, segments, modifier) => segmentBonuses(segments, modifier, effect.bonus, segment => segment.values.length === effect.length),
  intersection: (effect, segments, modifier) => {
    const contributions: ModifierContribution[] = [];
    segments.forEach((horizontal, h) => {
      if (horizontal.orientation !== 'horizontal') return;
      segments.forEach((vertical, v) => {
        if (vertical.orientation !== 'vertical') return;
        const intersection = horizontal.coordinates.find(cell => vertical.coordinates.some(other => cell.row === other.row && cell.column === other.column));
        if (intersection) contributions.push({ modifierId: modifier.id, modifierName: modifier.name, stage: 'intersection', points: effect.bonus, coordinates: [intersection], segmentIndices: [h, v] });
      });
    });
    return contributions;
  },
  // Final factors are handled after all additive effects.
  multiplier: () => [],
};

const evaluateEffect = (effect: ModifierEffect, segments: ReadonlyArray<SegmentScore>, modifier: Modifier): ModifierContribution[] => {
  switch (effect.kind) {
    case 'patterns': return evaluators.patterns(effect, segments, modifier);
    case 'sum': return evaluators.sum(effect, segments, modifier);
    case 'length': return evaluators.length(effect, segments, modifier);
    case 'intersection': return evaluators.intersection(effect, segments, modifier);
    case 'multiplier': return evaluators.multiplier(effect, segments, modifier);
  }
};

/** Base → segment/intersection additions → final factors → one floor operation. */
export const applyModifiers = (baseSegments: ReadonlyArray<SegmentScore>, owned: ReadonlyArray<Modifier>): ScoringBreakdown => {
  // Defensive deduplication also prevents malformed state from stacking an ID.
  const modifiers = owned.filter((modifier, index) => owned.findIndex(other => other.id === modifier.id) === index)
    .slice().sort((a, b) => a.id.localeCompare(b.id));
  const additions = modifiers.flatMap(modifier => modifier.effect ? evaluateEffect(modifier.effect, baseSegments, modifier) : []);
  const segments = baseSegments.map((segment, index) => {
    const contributions = additions.filter(contribution => contribution.stage === 'segment' && contribution.segmentIndices[0] === index);
    return { ...segment, contributions, modifierAdjustedPoints: segment.basePoints + contributions.reduce((sum, contribution) => sum + contribution.points, 0) };
  });
  const baseScore = segments.reduce((sum, segment) => sum + segment.basePoints, 0);
  const additiveBonus = additions.reduce((sum, contribution) => sum + contribution.points, 0);
  const subtotal = baseScore + additiveBonus;
  let multiplier = 1;
  let runningTotal = subtotal;
  const factors: ModifierContribution[] = [];
  for (const modifier of modifiers) {
    if (modifier.effect?.kind !== 'multiplier') continue;
    const factor = modifier.effect.factor;
    const next = runningTotal * factor;
    factors.push({ modifierId: modifier.id, modifierName: modifier.name, stage: 'multiplier', points: next - runningTotal, factor, coordinates: [], segmentIndices: [] });
    multiplier *= factor;
    runningTotal = next;
  }
  const totalScore = Math.floor(runningTotal);
  return { segments, baseScore, additiveBonus, subtotal, multiplier, unroundedTotal: runningTotal, roundingAdjustment: totalScore - runningTotal, contributions: [...additions, ...factors], totalScore };
};
