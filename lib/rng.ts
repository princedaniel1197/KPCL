// Single seeded RNG for the whole synthetic world.
// mulberry32 — deterministic, fast, good enough for data generation.
// Same seed => identical data and identical headline numbers on every build.

export const WORLD_SEED = 0x4b50434c; // "KPCL"

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a named sub-stream so generators stay independent of call order. */
export function stream(name: string): Rng {
  let h = WORLD_SEED;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 2654435761);
  }
  return mulberry32(h >>> 0);
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function randFloat(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Approximate normal via central limit. Sum of 6 uniforms has SD √(6/12)=√0.5,
 *  so dividing (s−3) by √0.5 yields a unit-variance term scaled by `sd`. */
export function randNormal(rng: Rng, mean: number, sd: number): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rng();
  return mean + ((s - 3) / Math.sqrt(0.5)) * sd;
}

export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
