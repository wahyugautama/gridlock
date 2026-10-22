import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../data/game';
import { getGameIdentity } from './metadata';

describe('getGameIdentity', () => {
  it('exposes the configured release identity', () => {
    expect(getGameIdentity(GAME_CONFIG)).toBe('GRIDLOCK v0.1');
  });

  it('uses the supplied metadata without changing it', () => {
    const metadata = Object.freeze({ ...GAME_CONFIG, title: 'Test', version: '2.3' });
    const original = { ...metadata };
    expect(getGameIdentity(metadata)).toBe('Test v2.3');
    expect(metadata).toEqual(original);
  });
});
