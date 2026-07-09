import { createNoise2D } from 'simplex-noise'

export type Noise2D = (x: number, y: number) => number

/** Deterministic, seedable PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface NoiseSet {
  continent: Noise2D
  height: Noise2D
  mountain: Noise2D
  temperature: Noise2D
  humidity: Noise2D
}

export function makeNoiseSet(seed: number): NoiseSet {
  return {
    continent: createNoise2D(mulberry32(seed + 1)),
    height: createNoise2D(mulberry32(seed + 2)),
    mountain: createNoise2D(mulberry32(seed + 3)),
    temperature: createNoise2D(mulberry32(seed + 4)),
    humidity: createNoise2D(mulberry32(seed + 5)),
  }
}

/** Fractional Brownian motion — layered octaves. Returns roughly [-1, 1]. */
export function fbm(
  noise: Noise2D,
  x: number,
  z: number,
  frequency: number,
  octaves: number,
  persistence = 0.5,
): number {
  let amplitude = 1
  let sum = 0
  let norm = 0
  let freq = frequency
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * freq, z * freq)
    norm += amplitude
    amplitude *= persistence
    freq *= 2
  }
  return sum / norm
}

/** Deterministic hash of an integer coordinate pair -> [0, 1). */
export function hash2(x: number, z: number, seed: number): number {
  let h = seed >>> 0
  h = Math.imul(h ^ (x | 0), 0x9e3779b1)
  h = Math.imul(h ^ (z | 0), 0x85ebca77)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae3d)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
