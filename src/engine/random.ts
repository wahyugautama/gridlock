/** Local seeded generator; callers own the generator and never share mutable state. */
export const createRandom = (seed: number): (() => number) => {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Seed must be an unsigned 32-bit integer.');
  }
  let cursor = seed >>> 0;
  return () => {
    cursor = (cursor + 0x6d2b79f5) >>> 0;
    let value = Math.imul(cursor ^ (cursor >>> 15), cursor | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
