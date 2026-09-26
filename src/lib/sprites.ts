// Pixel-art sprites as character maps. Olly is a black Pomeranian seen from the front,
// his tail plume sticks out on one side; `flip` puts it on the other side.
const PAL: Record<string, string> = {
  k: '#1c1726', // fur
  g: '#463c61', // face
  m: '#52476e', // muzzle
  h: '#7a6aa3', // fluff tips
  e: '#05030a', // eye
  w: '#ffffff', // eye shine
  n: '#000000', // nose
  p: '#ff9ecb', // inner ears, cheeks
  t: '#ff6fae', // tongue
  r: '#ff8fcf', // bow
};
const OUTLINE = '#fff3fb';

const OLLY = [
  '......k......k......',
  '...r.kpk....kpk.....',
  '..rrrkppkkkkppk.h...',
  '..hrkkkkkkkkkkkkkh..',
  '.hkkkkggggggggkkkkh.',
  'hkkkkggggggggggkkkkh',
  'hkkkgewggggggewgkkkh',
  'hkkkgeeggggggeegkkkh',
  'hkkkppgmmnnmmgppkkkh',
  'hkkkkggmmttmmggkkkkh',
  'hkkkkkhgmmmmghkkkkkh',
  '.hkkhkhkkhkkhkhkkkh.',
  '.hkkkkkkkkkkkkkkkkh.',
  '..hkkkkkkkkkkkkkkh..',
  '...hkkhkkkkkkhkkh...',
];
const EYES_ROW = 6;
const FEET = ['....kgk......kgk....', '...kgk........kgk...'];
// tail plume: 3 extra columns on the right, starting at row 1
const TAIL = [
  ['...', '.hh', 'hgh', 'hgh', 'gh.', 'kh.', 'h..'],
  ['...', '...', '.hh', 'hgh', 'hgh', 'ggh', 'kh.', 'h..'],
];
const BONE = ['ww.....ww', 'wwwwwwwww', '.wwwwwww.', 'wwwwwwwww', 'ww.....ww'];

/** Sprite size in pixels, excluding the 1px outline. */
export const OLLY_SIZE = { w: 23, h: 16 };
export const BONE_SIZE = { w: 9, h: 5 };

export interface OllyPose { flip?: boolean; wag?: number; step?: number; blink?: boolean }

// A tiny overlap hides seams when the scale is fractional (maze cells), but blurs crisp big sprites.
const overlap = (s: number) => (s < 6 ? 0.5 : 0);

export function drawOlly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, { flip = false, wag = 0, step = 0, blink = false }: OllyPose = {}) {
  const rows = OLLY.concat(FEET[step]).map((row, i) => {
    if (blink && i === EYES_ROW) row = row.replace(/[ew]/g, 'g');
    return row + (TAIL[wag][i - 1] ?? '');
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
