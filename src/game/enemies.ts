import { drawPixels } from '../lib/sprites';
import { DIRS, isWall, type Maze, type Point } from './maze';

export type EnemyKind = 'vacuum' | 'cat' | 'bubble';

interface KindSpec {
  /** cells per second */
  speed: (level: number) => number;
  /** chance to take a random turn instead of chasing (0 = relentless) */
  wander: number;
  /** floats straight at Olly, walls don't matter */
  ghost: boolean;
  frames: string[][];
  pal: Record<string, string>;
  outline: boolean;
  /** sprite faces left in its map */
  facesLeft: boolean;
}

const KINDS: Record<EnemyKind, KindSpec> = {
  // robot vacuum: slow, loud, always takes the shortest path
  vacuum: {
    speed: level => Math.min(3 + level * 0.35, 6.5),
    wander: 0,
    ghost: false,
    pal: { d: '#6b6f8e', s: '#d9dcef', l: '#ffffff', r: '#ff3d6e', k: '#2b2d3d', b: '#ffe38a' },
    outline: true,
    facesLeft: false,
    frames: [
      ['....dddd....', '..ddssssdd..', '.dsslsssssd.', 'dssrrssrrssd', 'dssssssssssd', 'dkkkkkkkkkkd', '.b.b.b.b.b..'],
      ['....dddd....', '..ddssssdd..', '.dsslsssssd.', 'dssrrssrrssd', 'dssssssssssd', 'dkkkkkkkkkkd', '..b.b.b.b.b.'],
    ],
  },
  // the cat: quick but gets distracted
  cat: {
    speed: level => Math.min(4.2 + level * 0.35, 8),
    wander: 0.35,
    ghost: false,
    pal: { o: '#ffa45b', q: '#d9702a', e: '#b6ff3b', k: '#1a1020', p: '#ff9ecb', w: '#fff3dc' },
    outline: true,
    facesLeft: true,
    frames: [
      ['o...o.......', 'oo.oo.......', 'ooooo.....q.', 'ekoek.....o.', 'oopoo....qo.', 'wwwooqoqooq.', '.ooqoqoqoo..', '.o.o...o.o..'],
      ['o...o.......', 'oo.oo.....q.', 'ooooo.....o.', 'ekoek....qo.', 'oopoo....o..', 'wwwooqoqooq.', '.ooqoqoqoo..', '..o.o.o.o...'],
    ],
  },
  // bath time: a soap bubble with a rubber duck, drifts through walls
  bubble: {
    speed: level => Math.min(0.9 + level * 0.12, 2.2),
    wander: 0,
    ghost: true,
    pal: { c: '#9fe8ff', w: '#ffffff', y: '#ffe066', o: '#ff9f43', k: '#1a1020' },
    outline: false,
    facesLeft: false,
    frames: [
      ['...ccccc...', '.cc.....cc.', '.c.w.....c.', 'c.w..yy...c', 'c...ykyo..c', 'c..yyyy...c', 'c..yyyyy..c', '.c.......c.', '.cc.....cc.', '...ccccc...'],
      ['...ccccc...', '.cc.....cc.', '.c.w.....c.', 'c.w...yy..c', 'c....ykyo.c', 'c...yyyy..c', 'c...yyyyy.c', '.c.......c.', '.cc.....cc.', '...ccccc...'],
    ],
  },
};

/** Which enemies roam a planet: one new kind per planet at first, then reinforcements. */
export function roster(level: number): EnemyKind[] {
  const list: EnemyKind[] = ['vacuum'];
  if (level >= 2) list.push('cat');
  if (level >= 3) list.push('bubble');
  if (level >= 5) list.push('vacuum');
  if (level >= 7) list.push('cat');
  if (level >= 9) list.push('bubble');
  return list;
}

/** The enemy kind that shows up for the first time on `level`, if any. */
export function newcomer(level: number): EnemyKind | undefined {
  const before = new Set(roster(level - 1));
  return level === 1 ? undefined : roster(level).find(k => !before.has(k));
}

export interface Enemy {
  kind: EnemyKind;
  spawn: Point;
  // grid walkers move cell to cell like Olly: from (fx,fy) to (x,y), progress t
  x: number; y: number; fx: number; fy: number; t: number;
  // ghosts float freely; (x,y) is their position
  flip: boolean; frame: number; anim: number;
}

export function createEnemy(kind: EnemyKind, spawn: Point): Enemy {
  return { kind, spawn, x: spawn.x, y: spawn.y, fx: spawn.x, fy: spawn.y, t: 1, flip: false, frame: 0, anim: 0 };
}

export function resetEnemy(e: Enemy) {
  e.x = e.fx = e.spawn.x;
  e.y = e.fy = e.spawn.y;
  e.t = 1;
}

/** Current position in cell units (cell centre = integer + 0.5 is added by the caller). */
export function enemyPos(e: Enemy): Point {
  if (KINDS[e.kind].ghost) return { x: e.x, y: e.y };
  return { x: e.fx + (e.x - e.fx) * e.t, y: e.fy + (e.y - e.fy) * e.t };
}

/**
 * Advances an enemy. `dist` is the step distance from every cell to Olly's cell,
 * `olly` is Olly's current (interpolated) position.
 */
export function moveEnemy(e: Enemy, dt: number, level: number, maze: Maze, dist: Int32Array, olly: Point) {
  const spec = KINDS[e.kind];
  const speed = spec.speed(level);
  e.anim += dt;
  if (e.anim > 0.16) { e.anim = 0; e.frame ^= 1; }

  if (spec.ghost) {
    const dx = olly.x - e.x, dy = olly.y - e.y, len = Math.hypot(dx, dy);
    if (len > 0.01) {
      const step = Math.min(len, speed * dt);
      e.x += (dx / len) * step;
      e.y += (dy / len) * step;
      if (Math.abs(dx) > 0.05) e.flip = dx < 0;
    }
    return;
  }

  e.t = Math.min(1, e.t + dt * speed);
  if (e.t < 1) return;

  // arrived: pick the next cell
  const G = maze.size;
  const back = { x: e.fx, y: e.fy };
  let options = Object.values(DIRS)
    .map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy }))
    .filter(p => !isWall(maze, p.x, p.y));
  const forward = options.filter(p => p.x !== back.x || p.y !== back.y);
  if (forward.length) options = forward;
  if (!options.length) return;

  let next: Point;
  if (Math.random() < spec.wander) {
    next = options[(Math.random() * options.length) | 0];
  } else {
    // take the neighbour closest to Olly; allow turning back if that's the way
    const all = Object.values(DIRS)
      .map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy }))
      .filter(p => !isWall(maze, p.x, p.y));
    next = all.reduce((best, p) => (dist[p.y * G + p.x] < dist[best.y * G + best.x] ? p : best), all[0]);
  }
  e.fx = e.x; e.fy = e.y;
  e.x = next.x; e.y = next.y;
  e.t = 0;
  if (next.x !== e.fx) e.flip = next.x < e.fx;
}

/** Draws an enemy centred in the cell at position `pos` (cell units), `c` = cell size in px. */
export function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, pos: Point, c: number, now: number) {
  const spec = KINDS[e.kind];
  const rows = spec.frames[e.frame];
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const s = c / (Math.max(w, h) + 1.5);
  const bob = spec.ghost ? Math.sin(now / 300) * c * 0.06 : 0;
  const x = pos.x * c + (c - w * s) / 2, y = pos.y * c + (c - h * s) / 2 + bob;
  if (spec.ghost) {
    ctx.fillStyle = 'rgba(159,232,255,.18)';
    ctx.beginPath();
    ctx.arc(pos.x * c + c / 2, pos.y * c + c / 2 + bob, (w * s) / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  drawPixels(ctx, rows, spec.pal, x, y, s, { flip: spec.facesLeft ? !e.flip : e.flip, outline: spec.outline ? undefined : null });
}
