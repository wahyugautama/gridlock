import type { Modifier } from '../types/game';

export const ECONOMY = Object.freeze({ clearReward: 5, bonusPointInterval: 25, offersPerShop: 3 });

/** Unique IDs are stable ownership keys. All bonuses apply to the winning pattern only. */
export const MODIFIER_CATALOG: ReadonlyArray<{ readonly modifier: Modifier; readonly cost: number }> = [
  { cost: 3, modifier: { id: 'double-trouble', name: 'Double Trouble', description: 'One pair and Two pairs scoring segments gain +10 points each.', effect: { kind: 'patterns', patterns: ['One pair', 'Two pairs'], bonus: 10 } } },
  { cost: 4, modifier: { id: 'triple-threat', name: 'Triple Threat', description: 'Three-of-a-kind patterns gain +25 points.', effect: { kind: 'patterns', patterns: ['Three of a kind'], bonus: 25 } } },
  { cost: 5, modifier: { id: 'straight-shooter', name: 'Straight Shooter', description: 'Straight patterns gain +50 points.', effect: { kind: 'patterns', patterns: ['Straight'], bonus: 50 } } },
  { cost: 4, modifier: { id: 'crossfire', name: 'Crossfire', description: 'Each intersection of qualifying horizontal and vertical segments adds +10 points.', effect: { kind: 'intersection', bonus: 10 } } },
  { cost: 3, modifier: { id: 'lucky-seven', name: 'Lucky Seven', description: 'Qualifying segments with a sum of exactly 7 gain +20 points.', effect: { kind: 'sum', sum: 7, bonus: 20 } } },
  { cost: 4, modifier: { id: 'minimalist', name: 'Minimalist', description: 'Three-cell scoring segments gain +15 points.', effect: { kind: 'length', length: 3, bonus: 15 } } },
  { cost: 6, modifier: { id: 'high-roller', name: 'High Roller', description: 'Four-of-a-kind and five-of-a-kind patterns gain +40 points.', effect: { kind: 'patterns', patterns: ['Four of a kind', 'Five of a kind'], bonus: 40 } } },
  { cost: 7, modifier: { id: 'multiplier', name: 'Multiplier', description: 'Multiply the score after all bonuses by 1.25. Round down once at the end.', effect: { kind: 'multiplier', factor: 1.25 } } },
];
