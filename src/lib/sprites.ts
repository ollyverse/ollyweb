// Pixel-art sprites as character maps. Olly is a black Pomeranian seen from the side,
// facing right; `flip` mirrors him.
const PAL: Record<string, string> = {
  k: '#221c30', // fur
  d: '#2d2540', // fur, lit
  g: '#463c61', // plume, face
  m: '#5e5380', // muzzle
  h: '#8f7fc0', // fluff tips, mane
  e: '#05030a', // eye
  w: '#ffffff', // eye shine
  n: '#000000', // nose
  p: '#ff9ecb', // inner ears, cheek
  t: '#ff6fae', // tongue
};
const OUTLINE = '#fff3fb';

// cols 0-9 of rows 0-3 hold the tail plume and come from TAIL instead
const OLLY = [
  '.............h...h....',
  '............kpk.kpk...',
  '...........kkppkppkk..',
  '..........kddddddddk..',
  'hgdkkkkdgkkddddggdddk.',
  '.hdkkkkkdkgddddewgggm.',
  '..hdkkkkkkgdddgeegmmmn',
  '..kdddkkkkggdgppggmmt.',
  '.kddkkkkkkgghdggggmt..',
  'hkdkkkkkkkkgghdghh....',
  'hkkkkkkkkkkkgdghh.....',
  'hkkkkkkkkkkkkgdh......',
  'hdkkkkkkkkkkkdh.......',
  '.hdkkkkkkkkkkdh.......',
  '..hdhdkkkkhdhdh.......',
];
const TAIL_W = 10;
const EYES_ROW = 5;
const TAIL = [
  ['...hhhh...', '..hggggh..', '.hgdddggh.', 'hgddkkddgh'],
  ['....hhhh..', '...hggggh.', '..hgdddggh', '.hgddkkddg'],
];
const LEGS = [
  ['...kd.kd...kd.kd......', '...kg.kg...kg.kg......'],
  ['..kd..kd...kd..kd.....', '..kg..kg...kg..kg.....'],
];
const BONE = ['ww.....ww', 'wwwwwwwww', '.wwwwwww.', 'wwwwwwwww', 'ww.....ww'];

/** Sprite size in pixels, excluding the 1px outline. */
export const OLLY_SIZE = { w: 22, h: 17 };
export const BONE_SIZE = { w: 9, h: 5 };

export interface OllyPose { flip?: boolean; wag?: number; step?: number; blink?: boolean }

// A tiny overlap hides seams when the scale is fractional (maze cells), but blurs crisp big sprites.
const overlap = (s: number) => (s < 6 ? 0.5 : 0);

export interface PixelOptions { flip?: boolean; outline?: string | null }

/** Draws a character-map sprite at (x,y) with pixel size `s`; `.` is transparent. */
export function drawPixels(
  ctx: CanvasRenderingContext2D, rows: readonly string[], pal: Record<string, string>,
  x: number, y: number, s: number, { flip = false, outline = OUTLINE }: PixelOptions = {},
) {
  const w = Math.max(...rows.map(r => r.length));
  const pixels: [number, number, string][] = [];
  rows.forEach((row, cy) => [...row].forEach((ch, cx) => {
    if (ch !== '.') pixels.push([flip ? x + (w - 1 - cx) * s : x + cx * s, y + cy * s, pal[ch]]);
  }));

  // sticker-style outline keeps dark sprites readable on a dark background
  if (outline) {
    ctx.fillStyle = outline;
    for (const [X, Y] of pixels) {
      ctx.fillRect(X - s, Y, s * 3, s);
      ctx.fillRect(X, Y - s, s, s * 3);
    }
  }
  const e = overlap(s);
  for (const [X, Y, col] of pixels) {
    ctx.fillStyle = col;
    ctx.fillRect(X, Y, s + e, s + e);
  }
}

export function drawOlly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, { flip = false, wag = 0, step = 0, blink = false }: OllyPose = {}) {
  const rows = OLLY.concat(LEGS[step]).map((row, i) => {
    if (i < TAIL[wag].length) row = TAIL[wag][i] + row.slice(TAIL_W);
    return blink && i === EYES_ROW ? row.replace(/[ew]/g, 'd') : row;
  });
  drawPixels(ctx, rows, PAL, x, y, s, { flip });
}

export function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  drawPixels(ctx, BONE, PAL, x, y, s, { outline: null });
}
