# ollyverse.com

Landing page for the Ollyverse, built with [Astro](https://astro.build) (static output, no UI framework).

```sh
npm install
npm run dev      # http://localhost:4321
npm run check    # type-check .astro + .ts
npm run build    # static site in dist/
```

## Layout

- `src/pages/` – one file per route (`index.astro` = homepage)
- `src/layouts/Base.astro` – `<head>`, starfield, header, footer
- `src/components/` – page sections (Hero, Ticker, MazeGame, FieldGuide, …)
- `src/game/` – the bone maze: `maze.ts` (generation + pathfinding), `game.ts` (loop, input, rendering), `content.ts` (planet names, Olly's thoughts)
- `src/lib/` – shared bits: pixel sprites, 8-bit sound, safe localStorage
- `src/styles/global.css` – colour tokens and shared classes
