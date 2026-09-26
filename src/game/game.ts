import { store } from '../lib/storage';
import { sfx } from '../lib/sound';
import { drawOlly, drawBone, OLLY_SIZE, BONE_SIZE } from '../lib/sprites';
import { generateMaze, isWall, bfs, distances, pathBetween, DIRS, type Dir, type Maze, type Point } from './maze';
import { roster, newcomer, createEnemy, resetEnemy, moveEnemy, enemyPos, drawEnemy, isStunned, type Enemy } from './enemies';
import { planetName, pick } from './content';
import { pageText } from '../i18n/ui';

const SPEED = 8;          // Olly, cells per second
const LIVES = 3;
const GRACE = 1.3;        // seconds enemies wait at the start and after a catch
const INVULNERABLE = 1.6; // seconds Olly can't be caught after a respawn
const CAUGHT_PAUSE = 1.1;
const HIT_RADIUS = 0.6;   // cells
const BARK_COOLDOWN = 5;
const BARK_RADIUS = 3.5;  // cells
const BARK_STUN = 2.5;    // seconds
const BARK_RING = 0.45;   // seconds the shock ring is visible
const SNIFF_COOLDOWN = 6;
const SNIFF_SHOW = 2.4;
const CONFETTI = ['#ff8fcf', '#8ff0d0', '#ffe38a', '#c9a7ff', '#fff5fb'];

type State = 'title' | 'play' | 'win' | 'over';
interface Olly extends Point { fx: number; fy: number; t: number; flip: boolean; wag: number; step: number; anim: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; bone: boolean }

// dev only: /?planet=5 starts a run on planet 5
const FIRST_PLANET = (import.meta.env.DEV && Number(new URLSearchParams(location.search).get('planet'))) || 1;

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

/** Wires up the maze game inside `root`; elements are found via `data-ref`. */
export function mountMazeGame(root: HTMLElement) {
  const T = pageText().game;
  const planet = (n: number) => planetName(T.planets, n);
  const ref = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-ref="${name}"]`)!;
  const canvas = ref<HTMLCanvasElement>('canvas');
  const ctx = canvas.getContext('2d')!;
  const ui = {
    overlay: ref('overlay'), title: ref('overlay-title'), text: ref('overlay-text'), abilities: ref('abilities'), button: ref<HTMLButtonElement>('overlay-button'),
    level: ref('level'), lives: ref('lives'), bark: ref('bark'), barkMeter: ref('bark-meter'), sniff: ref('sniff'), sniffMeter: ref('sniff-meter'), thought: ref('thought'),
  };

  let state: State = 'title';
  let level = 1;
  let lives = LIVES;
  let maze: Maze;
  let bone: Point;
  let olly: Olly;
  let enemies: Enemy[] = [];
  let chase: Int32Array;    // steps from every cell to Olly, steers the enemies
  let trail: Uint8Array;
  let held: Dir | null = null;   // keyboard / pad button held down: walk while held
  let run: Dir | null = null;    // touch: keep walking until a wall (Pac-Man style)
  let queued: Dir | null = null; // touch: next turn, taken at the first opening
  let time = 0, timing = false;
  let grace = 0, invulnerable = 0, pause = 0;
  let barkCd = 0, barkT = 0, barkAt: Point = { x: 0, y: 0 };
  let sniffCd = 0, sniffT = 0, sniffPath: number[] = [];
  let particles: Particle[] = [];
  let bones = store.get('olly.bones', 0);
  let idle = 0, thoughtTimer = 0, panicTimer = 0, lastBonk = 0;
  let dpr = 1;

  const say = (text: string) => { ui.thought.textContent = text; };
  const cell = () => canvas.width / maze.size;
  const paintLives = () => { ui.lives.textContent = '♥'.repeat(lives) + '·'.repeat(LIVES - lives); };
  const ollyPos = (): Point => {
    const ease = olly.t * (2 - olly.t);
    return { x: olly.fx + (olly.x - olly.fx) * ease, y: olly.fy + (olly.y - olly.fy) * ease };
  };

  function startLevel() {
    // the maze stays small and loopy (room to dodge); the enemies make it harder
    maze = generateMaze(Math.min(5 + Math.floor(level / 2), 9), 0.3);
    const G = maze.size;
    const { order } = bfs(maze, 1, 1);
    const far = order[order.length - 1];
    bone = { x: far % G, y: (far / G) | 0 };
    olly = { x: 1, y: 1, fx: 1, fy: 1, t: 1, flip: false, wag: 0, step: 0, anim: 0 };
    trail = new Uint8Array(G * G);

    // enemies start far from Olly, never on the bone, spread over distinct cells
    const fromStart = distances(maze, 1, 1);
    const maxD = fromStart[far];
    const spots = order.filter(c => fromStart[c] >= Math.max(4, maxD * 0.45) && c !== far);
    enemies = roster(level).map(kind => {
      const i = (Math.random() * spots.length) | 0;
      const c = spots.splice(i, 1)[0] ?? far;
      return createEnemy(kind, { x: c % G, y: (c / G) | 0 });
    });

    chase = fromStart;
    time = 0; timing = false; held = null; run = null; queued = null;
    grace = GRACE; invulnerable = 0; pause = 0;
    barkCd = 0; barkT = 0;
    sniffCd = 0; sniffT = 0; sniffPath = []; particles = [];
    ui.level.textContent = String(level);
    paintLives();
    resize();
  }

  function tryMove(dir: Dir) {
    const [dx, dy] = DIRS[dir];
    if (isWall(maze, olly.x + dx, olly.y + dy)) {
      const now = performance.now();
      if (now - lastBonk > 250) { sfx.bonk(); lastBonk = now; }
      run = null;
      return;
    }
    olly.fx = olly.x; olly.fy = olly.y;
    olly.x += dx; olly.y += dy; olly.t = 0;
    if (dx) olly.flip = dx < 0;
    chase = distances(maze, olly.x, olly.y);
    timing = true;
    idle = 0;
  }

  function arrive() {
    trail[olly.fy * maze.size + olly.fx] = 1;
    if (olly.x === bone.x && olly.y === bone.y) win();
  }

  const canGo = (d: Dir) => !isWall(maze, olly.x + DIRS[d][0], olly.y + DIRS[d][1]);

  /** Called whenever Olly stands on a cell centre. */
  function nextStep() {
    if (held) return tryMove(held);
    if (queued && canGo(queued)) { run = queued; queued = null; }
    if (run) {
      if (canGo(run)) tryMove(run);
      else run = null;
    }
  }

  /** Touch input: remember the direction and take it as soon as the maze allows. */
  function steer(d: Dir) {
    if (state !== 'play') return;
    queued = d;
    const [dx, dy] = DIRS[d];
    if (olly.t < 1 && olly.x - olly.fx === -dx && olly.y - olly.fy === -dy) {
      // turning around mid-step: reverse right away
      [olly.x, olly.fx] = [olly.fx, olly.x];
      [olly.y, olly.fy] = [olly.fy, olly.y];
      olly.t = 1 - olly.t;
      if (dx) olly.flip = dx < 0;
      chase = distances(maze, olly.x, olly.y);
      run = d; queued = null;
    }
  }

  const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch {} };

  function burst(x: number, y: number) {
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, life: 1, color: CONFETTI[i % CONFETTI.length], bone: i % 6 === 0 });
    }
  }

  function win() {
    state = 'win'; timing = false; held = null; run = null; queued = null;
    bones++;
    store.set('olly.bones', bones);
    store.set('olly.bestPlanet', Math.max(store.get('olly.bestPlanet', 0), level + 1));
    sfx.win();
    burst((bone.x + 0.5) * cell(), (bone.y + 0.5) * cell());

    const best = store.get<number | null>(`olly.best.${level}`, null);
    if (best == null || time < best) store.set(`olly.best.${level}`, time);
    const coming = newcomer(level + 1);
    const text =
      T.found(planet(level), time.toFixed(1)) +
      '<br>' + (best == null || time < best ? T.record : T.best(best.toFixed(1))) +
      '<br><br>' + T.next(planet(level + 1)) +
      (coming ? '<br><br>' + T.newThreat(T.enemies[coming].name, T.enemies[coming].desc) : '');
    setTimeout(() => showOverlay(pick(T.praise), text, T.nextButton), 900);
  }

  function caught(e: Enemy) {
    lives--;
    paintLives();
    held = null; run = null; queued = null;
    sfx.caught();
    buzz([60, 40, 60]);
    const line = T.enemies[e.kind].caught;
    if (lives > 0) {
      say(`${line} ${T.livesLeft(lives)}`);
      pause = CAUGHT_PAUSE;
      return;
    }
    state = 'over'; timing = false;
    say(line);
    const best = Math.max(store.get('olly.bestPlanet', 0), level);
    store.set('olly.bestPlanet', best);
    const text = `${line}<br><br>${T.gameOver(planet(level), level, best)}<br>${T.bonesTotal(bones)}`;
    setTimeout(() => showOverlay(T.gameOverTitle, text, T.retry), 1000);
  }

  function respawn() {
    olly = { ...olly, x: 1, y: 1, fx: 1, fy: 1, t: 1 };
    enemies.forEach(resetEnemy);
    chase = distances(maze, 1, 1);
    grace = GRACE;
    invulnerable = INVULNERABLE;
  }

  /** Stuns every enemy within reach; stunned enemies freeze and can be walked through. */
  function bark() {
    if (state !== 'play' || barkCd > 0 || pause > 0) return;
    sfx.woof();
    barkAt = ollyPos();
    barkT = BARK_RING;
    barkCd = BARK_COOLDOWN;
    for (const e of enemies) {
      const p = enemyPos(e);
      if (Math.hypot(p.x - barkAt.x, p.y - barkAt.y) <= BARK_RADIUS) e.stun = BARK_STUN;
    }
    say(T.barking);
    buzz(30);
  }

  function sniff() {
    if (state !== 'play' || sniffCd > 0 || pause > 0) return;
    sfx.sniff();
    sniffPath = pathBetween(maze, olly, bone).slice(0, 15);
    sniffT = SNIFF_SHOW;
    sniffCd = SNIFF_COOLDOWN;
    say(T.sniffing);
  }

  function showOverlay(title: string, html: string, button: string) {
    ui.abilities.hidden = true; // only the intro screen explains the abilities
    ui.title.textContent = title;
    ui.text.innerHTML = html;
    ui.button.textContent = button;
    ui.overlay.hidden = false;
    root.classList.remove('playing');
  }

  function begin() {
    if (state === 'win') level++;
    else { level = FIRST_PLANET; lives = LIVES; }
    startLevel();
    ui.overlay.hidden = true;
    state = 'play';
    root.classList.add('playing');
    // phones: bring the whole cabinet (maze + controls) into view
    if (matchMedia('(max-width: 1099px)').matches) root.scrollIntoView({ behavior: 'smooth', block: 'center' });
    say(T.welcome(planet(level)));
    sfx.woof();
  }

  function resize() {
    const size = canvas.parentElement!.getBoundingClientRect().width;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = Math.round(size * dpr);
    ctx.imageSmoothingEnabled = false;
  }

  /* ---------- input ---------- */
  const inView = () => { const r = canvas.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  ui.button.addEventListener('click', begin);
  addEventListener('resize', resize);
  addEventListener('keydown', e => {
    const d = KEYS[e.code];
    if (state === 'play') {
      if (d) { e.preventDefault(); held = d; run = null; queued = null; }
      else if (e.code === 'Space') { e.preventDefault(); bark(); }
      else if (e.code === 'KeyE') sniff();
    } else if (!ui.overlay.hidden && (e.code === 'Enter' || (e.code === 'Space' && inView()))) {
      e.preventDefault();
      begin();
    }
  });
  addEventListener('keyup', e => { if (KEYS[e.code] === held) held = null; });
  addEventListener('blur', () => { held = null; });

  root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(b => {
    const d = b.dataset.dir as Dir;
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      b.classList.add('on');
      if (state === 'play') { held = d; steer(d); }
    });
    const release = () => { b.classList.remove('on'); if (held === d) held = null; };
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
  });
  root.querySelector('[data-sniff]')?.addEventListener('pointerdown', e => { e.preventDefault(); sniff(); });
  root.querySelector('[data-bark]')?.addEventListener('pointerdown', e => { e.preventDefault(); bark(); });

  // on the maze: swipe = steer, tap = bark
  let swipe: Point | null = null;
  canvas.addEventListener('pointerdown', e => { swipe = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (!swipe || state !== 'play') return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return bark();
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });

  /* ---------- loop ---------- */
  function update(dt: number) {
    olly.anim += dt;
    if (olly.anim > 0.14) {
      olly.anim = 0;
      olly.wag ^= 1;
      if (olly.t < 1 || state === 'win') olly.step ^= 1;
    }
    for (const p of particles) { p.x += p.vx * dpr; p.y += p.vy * dpr; p.vy += 0.25; p.life -= dt * 0.7; }
    particles = particles.filter(p => p.life > 0);
    if (state !== 'play') return;

    if (timing) time += dt;
    barkCd = Math.max(0, barkCd - dt);
    barkT = Math.max(0, barkT - dt);
    ui.bark.textContent = barkCd ? `${Math.ceil(barkCd)}s` : T.hud.ready;
    ui.barkMeter.style.width = `${100 * (1 - barkCd / BARK_COOLDOWN)}%`;
    sniffCd = Math.max(0, sniffCd - dt);
    sniffT = Math.max(0, sniffT - dt);
    ui.sniff.textContent = sniffCd ? `${Math.ceil(sniffCd)}s` : T.hud.ready;
    ui.sniffMeter.style.width = `${100 * (1 - sniffCd / SNIFF_COOLDOWN)}%`;

    if (pause > 0) {
      pause -= dt;
      if (pause <= 0) respawn();
      return;
    }
    grace = Math.max(0, grace - dt);
    invulnerable = Math.max(0, invulnerable - dt);

    if (olly.t < 1) {
      olly.t = Math.min(1, olly.t + dt * SPEED);
      if (olly.t === 1) arrive();
    }
    if (olly.t === 1 && state === 'play') nextStep();
    if (state !== 'play') return;

    const me = ollyPos();
    let nearest: { e: Enemy; d: number } | null = null;
    for (const e of enemies) {
      if (!grace) moveEnemy(e, dt, level, maze, chase, me);
      if (isStunned(e)) continue; // harmless while dizzy
      const p = enemyPos(e), d = Math.hypot(p.x - me.x, p.y - me.y);
      if (!nearest || d < nearest.d) nearest = { e, d };
    }
    if (nearest && !invulnerable && nearest.d < HIT_RADIUS) return caught(nearest.e);

    idle += dt; thoughtTimer += dt; panicTimer = Math.max(0, panicTimer - dt);
    if (nearest && nearest.d < 2.5 && !panicTimer) {
      panicTimer = 4;
      say(T.enemies[nearest.e.kind].panic);
    } else if (idle > 5 && thoughtTimer > 5) {
      thoughtTimer = 0;
      say(pick(T.thoughts));
    }
  }

  function render(now: number) {
    const W = canvas.width, c = cell(), G = maze.size, hue = (level * 47 + 250) % 360;
    const f = Math.floor, cl = Math.ceil;
    ctx.fillStyle = '#0f0a22';
    ctx.fillRect(0, 0, W, W);

    // floor + walls
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const X = f(x * c), Y = f(y * c), w = cl((x + 1) * c) - X, h = cl((y + 1) * c) - Y;
      if (maze.grid[y * G + x]) {
        ctx.fillStyle = `hsl(${hue} 45% ${30 + ((x * 7 + y * 13) % 5)}%)`;
        ctx.fillRect(X, Y, w, h);
        if (!isWall(maze, x, y - 1)) { ctx.fillStyle = `hsl(${hue} 85% 80%)`; ctx.fillRect(X, Y, w, Math.max(2, h * 0.18)); }
        if ((x * 31 + y * 17) % 11 === 0) {
          const s = Math.max(1, c * 0.08);
          ctx.fillStyle = 'rgba(255,243,220,.6)';
          ctx.fillRect(X + w * 0.6, Y + h * 0.5, s, s);
        }
      } else if ((x + y) % 2) {
        ctx.fillStyle = 'rgba(120,90,200,.06)';
        ctx.fillRect(X, Y, w, h);
      }
      if (trail[y * G + x]) { // paw prints
        const s = Math.max(1, c * 0.12);
        ctx.fillStyle = 'rgba(255,245,251,.22)';
        ctx.fillRect(X + c * 0.3, Y + c * 0.35, s, s);
        ctx.fillRect(X + c * 0.55, Y + c * 0.55, s, s);
      }
    }

    // sniff trail
    if (sniffT > 0) {
      const a = Math.min(1, sniffT / 0.6);
      sniffPath.forEach((p, i) => {
        const x = ((p % G) + 0.5) * c + Math.sin(now / 120 + i) * c * 0.12, y = (((p / G) | 0) + 0.5) * c;
        const s = c * (0.22 - i * 0.008);
        ctx.fillStyle = `rgba(143,240,208,${a * (1 - (i / sniffPath.length) * 0.7)})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      });
    }

    // bone
    const bob = Math.sin(now / 250) * c * 0.08, bs = c / 11;
    ctx.save();
    ctx.shadowColor = '#ffe38a';
    ctx.shadowBlur = c * 0.6;
    drawBone(ctx, (bone.x + 0.5) * c - (BONE_SIZE.w / 2) * bs, (bone.y + 0.5) * c - (BONE_SIZE.h / 2) * bs + bob, bs);
    ctx.restore();

    // olly (flickers while he can't be caught)
    const me = ollyPos();
    if (!(invulnerable > 0 && Math.floor(now / 90) % 2)) {
      const os = c / 22, hop = olly.t < 1 ? -Math.sin(olly.t * Math.PI) * c * 0.1 : 0;
      drawOlly(ctx, me.x * c + (c - OLLY_SIZE.w * os) / 2, me.y * c + (c - OLLY_SIZE.h * os) / 2 + hop, os, olly);
    }

    // enemies (shivering while they wait for the go)
    for (const e of enemies) {
      const p = enemyPos(e);
      const shake = grace > 0 && state === 'play' ? Math.sin(now / 30) * 0.03 : 0;
      drawEnemy(ctx, e, { x: p.x + shake, y: p.y }, c, now);
    }

    // bark shock ring
    if (barkT > 0) {
      const k = 1 - barkT / BARK_RING;
      ctx.strokeStyle = `rgba(255,227,138,${1 - k})`;
      ctx.lineWidth = Math.max(2, c * 0.12);
      ctx.beginPath();
      ctx.arc((barkAt.x + 0.5) * c, (barkAt.y + 0.5) * c, BARK_RADIUS * c * (0.3 + 0.7 * k), 0, Math.PI * 2);
      ctx.stroke();
    }

    // caught flash
    if (pause > 0) {
      ctx.fillStyle = `rgba(255,111,174,${0.35 * (pause / CAUGHT_PAUSE)})`;
      ctx.fillRect(0, 0, W, W);
    }

    // confetti
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.bone) drawBone(ctx, p.x, p.y, c / 14);
      else { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, c * 0.15, c * 0.15); }
    }
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render(now);
    requestAnimationFrame(loop);
  }

  // a demo maze sits behind the title screen
  startLevel();
  requestAnimationFrame(loop);
}
