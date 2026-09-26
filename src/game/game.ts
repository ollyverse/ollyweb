import { store } from '../lib/storage';
import { sfx } from '../lib/sound';
import { drawOlly, drawBone, OLLY_SIZE, BONE_SIZE } from '../lib/sprites';
import { generateMaze, isWall, openNeighbours, bfs, pathBetween, DIRS, type Dir, type Maze, type Point } from './maze';
import { planetName, pick } from './content';
import { pageText } from '../i18n/ui';

const SPEED = 11;        // cells per second
const SNIFF_COOLDOWN = 6; // seconds
const SNIFF_SHOW = 2.4;
const SIGHT = 2.6;       // cells Olly remembers around him in the dark
const CONFETTI = ['#ff8fcf', '#8ff0d0', '#ffe38a', '#c9a7ff', '#fff5fb'];

type State = 'title' | 'play' | 'win';
interface Olly extends Point { fx: number; fy: number; t: number; flip: boolean; wag: number; step: number; anim: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; bone: boolean }

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
  const fog = document.createElement('canvas');
  const fctx = fog.getContext('2d')!;
  const ui = {
    overlay: ref('overlay'), title: ref('overlay-title'), text: ref('overlay-text'), button: ref<HTMLButtonElement>('overlay-button'),
    level: ref('level'), time: ref('time'), bones: ref('bones'), sniff: ref('sniff'), sniffMeter: ref('sniff-meter'), thought: ref('thought'),
  };

  let state: State = 'title';
  let level = 1;
  let maze: Maze;
  let bone: Point;
  let olly: Olly;
  let seen: Uint8Array, trail: Uint8Array;
  let fogOn = false;
  let held: Dir | null = null;
  let run: Dir | null = null;
  let time = 0, timing = false;
  let sniffCd = 0, sniffT = 0, sniffPath: number[] = [];
  let particles: Particle[] = [];
  let bones = store.get('olly.bones', 0);
  let idle = 0, thoughtTimer = 0, lastBonk = 0;
  let dpr = 1;

  ui.bones.textContent = String(bones);
  const say = (text: string) => { ui.thought.textContent = text; };
  const cell = () => canvas.width / maze.size;

  function startLevel() {
    maze = generateMaze(Math.min(4 + level * 2, 22));
    const { order } = bfs(maze, 1, 1);
    const far = order[order.length - 1];
    bone = { x: far % maze.size, y: (far / maze.size) | 0 };
    olly = { x: 1, y: 1, fx: 1, fy: 1, t: 1, flip: false, wag: 0, step: 0, anim: 0 };
    seen = new Uint8Array(maze.size ** 2);
    trail = new Uint8Array(maze.size ** 2);
    fogOn = level >= 2;
    time = 0; timing = false; held = null; run = null;
    sniffCd = 0; sniffT = 0; sniffPath = []; particles = [];
    reveal();
    ui.level.textContent = String(level);
    ui.time.textContent = '0.0';
    resize();
  }

  function reveal() {
    const G = maze.size, { x, y } = olly;
    for (let yy = Math.floor(y - SIGHT); yy <= y + SIGHT; yy++)
      for (let xx = Math.floor(x - SIGHT); xx <= x + SIGHT; xx++)
        if (xx >= 0 && yy >= 0 && xx < G && yy < G && (xx - x) ** 2 + (yy - y) ** 2 <= SIGHT ** 2) seen[yy * G + xx] = 1;
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
    timing = true;
    idle = 0;
  }

  function arrive() {
    trail[olly.fy * maze.size + olly.fx] = 1;
    reveal();
    if (olly.x === bone.x && olly.y === bone.y) return win();
    if (run) {
      const [dx, dy] = DIRS[run];
      // a swipe runs until the corridor ends or branches
      if (isWall(maze, olly.x + dx, olly.y + dy) || openNeighbours(maze, olly.x, olly.y) > 2) run = null;
    }
  }

  function win() {
    state = 'win'; timing = false; held = null; run = null;
    bones++;
    store.set('olly.bones', bones);
    ui.bones.textContent = String(bones);
    sfx.win();

    const cx = (bone.x + 0.5) * cell(), cy = (bone.y + 0.5) * cell();
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, life: 1, color: CONFETTI[i % CONFETTI.length], bone: i % 6 === 0 });
    }

    const best = store.get<number | null>(`olly.best.${level}`, null);
    const record = best == null || time < best;
    if (record) store.set(`olly.best.${level}`, time);
    const text =
      T.found(planet(level), time.toFixed(1)) +
      '<br>' + (record ? T.record : T.best(best.toFixed(1))) +
      '<br><br>' + T.next(planet(level + 1)) +
      (level === 1 ? '<br>' + T.darkAhead : '');
    setTimeout(() => showOverlay(pick(T.praise), text, T.nextButton), 900);
  }

  function sniff() {
    if (state !== 'play' || sniffCd > 0) return;
    sfx.sniff();
    sniffPath = pathBetween(maze, olly, bone).slice(0, 15);
    sniffT = SNIFF_SHOW;
    sniffCd = SNIFF_COOLDOWN;
    say(T.sniffing);
  }

  function showOverlay(title: string, html: string, button: string) {
    ui.title.textContent = title;
    ui.text.innerHTML = html;
    ui.button.textContent = button;
    ui.overlay.hidden = false;
  }

  function begin() {
    level = state === 'win' ? level + 1 : 1;
    startLevel();
    ui.overlay.hidden = true;
    state = 'play';
    say(fogOn ? T.dark : T.welcome(planet(level)));
    sfx.woof();
  }

  function resize() {
    const size = canvas.parentElement!.getBoundingClientRect().width;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = fog.width = fog.height = Math.round(size * dpr);
    ctx.imageSmoothingEnabled = false;
  }

  /* ---------- input ---------- */
  const inView = () => { const r = canvas.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  ui.button.addEventListener('click', begin);
  addEventListener('resize', resize);
  addEventListener('keydown', e => {
    const d = KEYS[e.code];
    if (state === 'play') {
      if (d) { e.preventDefault(); held = d; run = null; }
      else if (e.code === 'Space') { e.preventDefault(); sniff(); }
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
      if (state === 'play') { held = d; run = null; }
    });
    const release = () => { b.classList.remove('on'); if (held === d) held = null; };
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
  });
  root.querySelector('[data-sniff]')?.addEventListener('pointerdown', e => { e.preventDefault(); sniff(); });

  // swipe on the maze = run down the corridor until the next junction
  let swipe: Point | null = null;
  canvas.addEventListener('pointerdown', e => { swipe = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (!swipe || state !== 'play') return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    run = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
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

    if (timing) { time += dt; ui.time.textContent = time.toFixed(1); }
    sniffCd = Math.max(0, sniffCd - dt);
    sniffT = Math.max(0, sniffT - dt);
    ui.sniff.textContent = sniffCd ? `${Math.ceil(sniffCd)}s` : T.hud.ready;
    ui.sniffMeter.style.width = `${100 * (1 - sniffCd / SNIFF_COOLDOWN)}%`;

    if (olly.t < 1) {
      olly.t = Math.min(1, olly.t + dt * SPEED);
      if (olly.t === 1) arrive();
    }
    if (olly.t === 1 && state === 'play') {
      const d = held ?? run;
      if (d) tryMove(d);
    }

    idle += dt; thoughtTimer += dt;
    if (idle > 5 && thoughtTimer > 5) { thoughtTimer = 0; say(pick(T.thoughts)); }
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

    // bone
    const bob = Math.sin(now / 250) * c * 0.08, bs = c / 11;
    ctx.save();
    ctx.shadowColor = '#ffe38a';
    ctx.shadowBlur = c * 0.6;
    drawBone(ctx, (bone.x + 0.5) * c - (BONE_SIZE.w / 2) * bs, (bone.y + 0.5) * c - (BONE_SIZE.h / 2) * bs + bob, bs);
    ctx.restore();

    // olly
    const ease = olly.t * (2 - olly.t);
    const ox = (olly.fx + (olly.x - olly.fx) * ease) * c, oy = (olly.fy + (olly.y - olly.fy) * ease) * c;
    const os = c / 22, hop = olly.t < 1 ? -Math.sin(olly.t * Math.PI) * c * 0.1 : 0;
    drawOlly(ctx, ox + (c - OLLY_SIZE.w * os) / 2, oy + (c - OLLY_SIZE.h * os) / 2 + hop, os, olly);

    // fog of war: remembered cells stay dim, a soft light follows Olly
    if (fogOn && state !== 'win') {
      fctx.globalCompositeOperation = 'source-over';
      fctx.clearRect(0, 0, W, W);
      fctx.fillStyle = 'rgba(10,6,24,.97)';
      fctx.fillRect(0, 0, W, W);
      fctx.globalCompositeOperation = 'destination-out';
      fctx.fillStyle = 'rgba(0,0,0,.5)';
      for (let i = 0; i < seen.length; i++) if (seen[i]) fctx.fillRect(f((i % G) * c), f(((i / G) | 0) * c), cl(c) + 1, cl(c) + 1);
      const cx = ox + c / 2, cy = oy + c / 2, R = c * 3.2;
      const grd = fctx.createRadialGradient(cx, cy, c * 0.5, cx, cy, R);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = grd;
      fctx.beginPath();
      fctx.arc(cx, cy, R, 0, Math.PI * 2);
      fctx.fill();
      ctx.drawImage(fog, 0, 0);
    }

    // sniff trail sits above the fog
    if (sniffT > 0) {
      const a = Math.min(1, sniffT / 0.6);
      sniffPath.forEach((p, i) => {
        const x = ((p % G) + 0.5) * c + Math.sin(now / 120 + i) * c * 0.12, y = (((p / G) | 0) + 0.5) * c;
        const s = c * (0.22 - i * 0.008);
        ctx.fillStyle = `rgba(143,240,208,${a * (1 - (i / sniffPath.length) * 0.7)})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      });
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
  fogOn = false;
  requestAnimationFrame(loop);
}
