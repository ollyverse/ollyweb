export const PLANETS = [
  'Kibble Nebula', 'Planet Squeaky', 'The Sock Dimension', 'Belly-Rub Belt', 'Mailman Moon',
  'Zoomies Galaxy', 'Puddle Prime', 'Couch Quadrant', 'Vacuum Cleaner Void', 'The Forbidden Cat Sector',
];

export const THOUGHTS = [
  'Bone. Bone. Bone. Bone.', 'Is that… a squirrel?', "Who's a good boy? Me. It's me.",
  'I smell kibble in dimension 7.', 'This wall tastes like space.', 'Must. Not. Chase. Tail.',
  'The cat did this. I know it.', 'Left? Right? Snack?', 'I could go for a belly rub.', 'Sniffing intensifies…',
  'My fluff is load-bearing.', 'I am not fat. I am floof.', 'Black fur, big dreams.',
];

export const PRAISE = ['GOOD BOY!', 'BEST BOY!', 'BONE GET!', 'CHOMP!', 'WHAT A NOSE!'];

export function planetName(level: number) {
  const base = PLANETS[(level - 1) % PLANETS.length];
  const lap = Math.floor((level - 1) / PLANETS.length);
  return lap ? `${base} ${['II', 'III', 'IV', 'V', 'VI'][Math.min(lap - 1, 4)]}` : base;
}

export const pick = <T>(list: readonly T[]) => list[(Math.random() * list.length) | 0];
