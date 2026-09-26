// Pixel-art sprites as character maps. Olly is a black Pomeranian seen from the side,
// facing right; `flip` mirrors him.
const PAL: Record<string, string> = {
  k: '#221c30', // fur
  g: '#463c61', // face, lit fur
  m: '#52476e', // muzzle
  h: '#8f7fc0', // fluff tips
  e: '#05030a', // eye
  w: '#ffffff', // eye shine
  n: '#000000', // nose
  p: '#ff9ecb', // inner ears, cheek
  t: '#ff6fae', // tongue
};
const OUTLINE = '#fff3fb';

// cols 0-8 of rows 0-3 hold the tail plume and come from TAIL instead
const OLLY = [
  '..........k..k..',
  '.........kpkkpk.',
  '.........hkkkkkh',
  '.........kkgewmm',
  '..hgkh..kkggeemn',
  '.kkkhkkkkkgpggt.',
  'hkkkkkkkkkkghgh.',
  'hkkkkkkkkkkkh...',
  'hkkkkkkkkkkh....',
  '.hkhkkhkkkh.....',
];
const EYES_ROW = 3;
const LEGS = ['.kg.kg..kg.kg...', '..kg.kg..kg.kg..'];
const TAIL = [
  ['.hhh.....', 'hgggh....', 'hgkgh....', '.hgkh....'],
  ['..hhh....', '.hgggh...', '.hgkgh...', '..hgkh...'],
];
const BONE = ['ww.....ww', 'wwwwwwwww', '.wwwwwww.', 'wwwwwwwww', 'ww.....ww'];

/** Sprite size in pixels, excluding the 1px outline. */
export const OLLY_SIZE = { w: 16, h: 11 };
export const BONE_SIZE = { w: 9, h: 5 };

export interface OllyPose { flip?: boolean; wag?: number; step?: number; blink?: boolean }

// A tiny overlap hides seams when the scale is fractional (maze cells), but blurs crisp big sprites.
const overlap = (s: number) => (s < 6 ? 0.5 : 0);

export function drawOlly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, { flip = false, wag = 0, step = 0, blink = false }: OllyPose = {}) {
  const rows = OLLY.concat(LEGS[step]).map((row, i) => {
    if (i < TAIL[wag].length) row = TAIL[wag][i] + row.slice(9);
    return blink && i === EYES_ROW ? row.replace(/[ew]/g, 'g') : row;
  });
  const pixels: [number, number, string][] = [];
  rows.forEach((row, cy) => [...row].forEach((ch, cx) => {
    if (ch !== '.') pixels.push([flip ? x + (OLLY_SIZE.w - 1 - cx) * s : x + cx * s, y + cy * s, PAL[ch]]);
  }));

  // sticker-style outline keeps a black dog readable on a dark background
  ctx.fillStyle = OUTLINE;
  for (const [X, Y] of pixels) {
    ctx.fillRect(X - s, Y, s * 3, s);
    ctx.fillRect(X, Y - s, s, s * 3);
  }
  const e = overlap(s);
  for (const [X, Y, col] of pixels) {
    ctx.fillStyle = col;
    ctx.fillRect(X, Y, s + e, s + e);
  }
}

export function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const e = overlap(s);
  ctx.fillStyle = PAL.w;
  BONE.forEach((row, cy) => [...row].forEach((ch, cx) => { if (ch !== '.') ctx.fillRect(x + cx * s, y + cy * s, s + e, s + e); }));
}
