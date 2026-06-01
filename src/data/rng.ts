// Deterministic pseudo-random helpers for the factory generators. The fixture
// must be byte-stable across runs (no Date.now / Math.random), so every
// generated value derives from an integer seed via mulberry32. Same seed →
// same sequence, every time.

export type Rng = () => number; // returns [0, 1)

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Integer in [min, max] inclusive.
export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// Float in [min, max), rounded to `decimals`.
export function float(rng: Rng, min: number, max: number, decimals = 1): number {
  const v = min + rng() * (max - min);
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Round to a multiple of `increment` (e.g. salary increment 0.10), 2 decimals.
export function roundToIncrement(value: number, increment: number): number {
  return Math.round(Math.round(value / increment) * increment * 100) / 100;
}

export const round1 = (v: number): number => Math.round(v * 10) / 10;
export const round2 = (v: number): number => Math.round(v * 100) / 100;
