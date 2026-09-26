# ollyverse.com

Landing page for the Ollyverse, built with [Astro](https://astro.build) (static output, no UI framework).

```sh
npm install
npm run dev      # http://localhost:4321
npm run check    # type-check .astro + .ts
npm run build    # static site in dist/
```

## Layout

- `src/pages/` – routes: `/` (English) and `/sk/` (Slovak), both render `components/HomePage.astro`
- `src/layouts/Base.astro` – `<head>`, starfield, header, footer
- `src/components/` – page sections (Hero, MazeGame, FieldGuide, …)
- `src/i18n/ui.ts` – every piece of copy (page + game) per language
- `src/game/` – the bone maze: `maze.ts` (generation + pathfinding), `game.ts` (loop, input, rendering)
- `src/lib/` – shared bits: pixel sprites, 8-bit sound, safe localStorage
- `src/styles/global.css` – colour tokens and shared classes

## Languages

English lives at `/`, Slovak at `/sk/`. A first visit from a Slovak (or Czech) browser is sent to `/sk/`
unless the visitor already picked a language in the header.

To add a language: add it to `languages` in `src/i18n/ui.ts` with a full dictionary, add it to
`i18n.locales` in `astro.config.mjs`, and create `src/pages/<code>/index.astro` rendering `<HomePage />`.
