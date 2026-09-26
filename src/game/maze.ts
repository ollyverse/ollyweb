// Maze on a block grid: size G = cells*2+1, 1 = wall, 0 = floor. Start is always (1,1).
export interface Maze { grid: Uint8Array; size: number }
export interface Point { x: number; y: number }

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
export type Dir = keyof typeof DIRS;

export function generateMaze(cells: number, loopiness = 0.06): Maze {
  const G = cells * 2 + 1;
  const g = new Uint8Array(G * G).fill(1);
  const visited = new Uint8Array(cells * cells);
  const stack: [number, number][] = [[0, 0]];
  visited[0] = 1;
  g[G + 1] = 0;

  // iterative recursive-backtracker
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = Object.values(DIRS)
      .map(([dx, dy]) => [cx + dx, cy + dy, dx, dy] as const)
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cells && ny < cells && !visited[ny * cells + nx]);
    if (!options.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = options[(Math.random() * options.length) | 0];
    visited[ny * cells + nx] = 1;
    g[(cy * 2 + 1 + dy) * G + (cx * 2 + 1 + dx)] = 0;
    g[(ny * 2 + 1) * G + (nx * 2 + 1)] = 0;
    stack.push([nx, ny]);
  }

  // knock out a few walls so there's more than one way around
  for (let i = 0; i < cells * cells * loopiness; i++) {
    const x = 1 + ((Math.random() * (G - 2)) | 0);
    const y = 1 + ((Math.random() * (G - 2)) | 0);
    if (g[y * G + x] && (x % 2 === 0) !== (y % 2 === 0)) g[y * G + x] = 0;
  }
  return { grid: g, size: G };
}

export const isWall = (m: Maze, x: number, y: number) =>
  x < 0 || y < 0 || x >= m.size || y >= m.size || m.grid[y * m.size + x] === 1;

export function openNeighbours(m: Maze, x: number, y: number) {
  return Object.values(DIRS).filter(([dx, dy]) => !isWall(m, x + dx, y + dy)).length;
}

/** Breadth-first flood from (sx,sy). `order` ends with the farthest cell; `prev` links back to the start. */
export function bfs(m: Maze, sx: number, sy: number) {
  const G = m.size;
  const prev = new Int32Array(G * G).fill(-2);
  const order = [sy * G + sx];
  prev[order[0]] = -1;
  for (let i = 0; i < order.length; i++) {
    const c = order[i], x = c % G, y = (c / G) | 0;
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx, ny = y + dy, n = ny * G + nx;
      if (!isWall(m, nx, ny) && prev[n] === -2) { prev[n] = c; order.push(n); }
    }
  }
  return { prev, order };
}

/** Cell indices from `from` (exclusive) to `to` (inclusive). */
export function pathBetween(m: Maze, from: Point, to: Point): number[] {
  const { prev } = bfs(m, from.x, from.y);
  const path: number[] = [];
  for (let c = to.y * m.size + to.x; c >= 0; c = prev[c]) path.push(c);
  return path.reverse().slice(1);
}
