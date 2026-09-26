export function planetName(planets: readonly string[], level: number) {
  const base = planets[(level - 1) % planets.length];
  const lap = Math.floor((level - 1) / planets.length);
  return lap ? `${base} ${['II', 'III', 'IV', 'V', 'VI'][Math.min(lap - 1, 4)]}` : base;
}

export const pick = <T>(list: readonly T[]) => list[(Math.random() * list.length) | 0];
