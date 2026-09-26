// Pixel-art sprites as character maps. Olly faces right; `flip` mirrors him.
const PAL: Record<string, string> = { b: '#f3c47a', d: '#8a5230', k: '#1a1020', r: '#ff3d7f', w: '#fff3dc' };

const OLLY = [
  '.......ddb..',
  '......dbbbb.',
  '......dbbkbb',
  '......dbbbbk',
  '.......rrbb.',
  '.bbbbbbrrb..',
  '.bbbbbbbbb..',
  '.bwwbbbbbw..',
];
const LEGS = [
  ['.b.b....b.b.', '.k.k....k.k.'],
  ['..b.b..b.b..', '..k.k..k.k..'],
];
const TAIL = [[[0, 4], [0, 3]], [[0, 5], [0, 6]]];
const BONE = ['ww.....ww', 'wwwwwwwww', '.wwwwwww.', 'wwwwwwwww', 'ww.....ww'];

export const OLLY_SIZE = { w: 12, h: 10 };
export const BONE_SIZE = { w: 9, h: 5 };

export interface OllyPose { flip?: boolean; wag?: number; step?: number }

// A tiny overlap hides seams when the scale is fractional (maze cells), but blurs crisp big sprites.
const overlap = (s: number) => (s < 6 ? 0.5 : 0);

export function drawOlly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, { flip = false, wag = 0, step = 0 }: OllyPose = {}) {
  const e = overlap(s);
  const px = (cx: number, cy: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(flip ? x + (OLLY_SIZE.w - 1 - cx) * s : x + cx * s, y + cy * s, s + e, s + e);
  };
  OLLY.concat(LEGS[step]).forEach((row, cy) => [...row].forEach((ch, cx) => { if (ch !== '.') px(cx, cy, PAL[ch]); }));
  TAIL[wag].forEach(([cx, cy]) => px(cx, cy, PAL.b));
}

export function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const e = overlap(s);
  ctx.fillStyle = PAL.w;
  BONE.forEach((row, cy) => [...row].forEach((ch, cx) => { if (ch !== '.') ctx.fillRect(x + cx * s, y + cy * s, s + e, s + e); }));
}
