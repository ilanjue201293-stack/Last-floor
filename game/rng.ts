export function hashSeed(value: string | number): number {
  let x = typeof value === "number" ? value | 0 : 0;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    x = Math.imul(x ^ text.charCodeAt(i), 0x45d9f3b);
    x = (x << 13) | (x >>> 19);
  }
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededPick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

export function dateSeed(date = new Date()): number {
  const value = date.toISOString().slice(0, 10);
  return hashSeed(`DAILY:${value}`);
}
