# Development

## Setup

```sh
nvm use            # Node 22 from .nvmrc (22.12+ required by Astro)
npm ci
npm run dev        # http://localhost:4321  (Slovak: http://localhost:4321/sk/)
```

| Script | Does |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run check` | `astro check` — type-checks `.astro` and `.ts`; keep it at 0 errors / 0 warnings |
| `npm run build` | static build into `dist/` |
| `npm run preview` | serves `dist/` like production |

## Handy while working on the game

- `/?planet=5` (dev server only) starts a run on planet 5, e.g. to see all enemy kinds at once.
- Scores live in `localStorage` (`olly.*` keys). Clear them in devtools → Application → Local Storage.
- Sound can be toggled with the ♪ button in the header (`olly.muted`).

## Testing on a phone

```sh
npm run dev -- --host     # prints a Network URL, e.g. http://192.168.1.20:4321
```

Open that URL on a phone in the same Wi-Fi. For a quick check without a phone use the browser devtools device
toolbar; test a small phone (375×553), a regular one (390×664) and landscape (844×390).

## Testing the container locally

```sh
docker build -t ollyweb .
docker run --rm -p 8080:8080 ollyweb
curl -I localhost:8080/        # 200
curl -I localhost:8080/sk      # 301, Location: /sk/  (relative, no :8080)
```

## Common changes

### Change or add text

Edit `src/i18n/ui.ts`. Add the key to `en` **and** `sk` — `sk` is typed as `typeof en`, so `npm run check`
fails until both exist. Strings with markup (`<b>`, `<br />`) are rendered with `set:html`/`innerHTML`;
they are our own strings, never user input.

### Add a language

1. Add the code to `languages` in `src/i18n/ui.ts` and a full dictionary (`const de: typeof en = { … }`),
   then add it to the `ui` record.
2. Add it to `i18n.locales` in `astro.config.mjs`.
3. Create `src/pages/<code>/index.astro`:
   ```astro
   ---
   import HomePage from '../../components/HomePage.astro';
   ---
   <HomePage />
   ```
4. Optional: extend the first-visit redirect in `src/layouts/Base.astro`.

### Add a page section

Create `src/components/MySection.astro` (scoped `<style>`, strings from `useText(Astro.currentLocale)`) and
place it in `src/components/HomePage.astro`.

### Add an enemy

1. In `src/game/enemies.ts` add a kind to `EnemyKind` and `KINDS`: `speed(level)`, `wander` (0–1),
   `ghost` (ignores walls), two animation `frames` (char maps), `pal`, `outline`, `facesLeft`.
2. Put it into `roster(level)` — `newcomer()` picks it up automatically for the "New threat" teaser.
3. Add `name`, `desc`, `caught`, `panic` for it under `game.enemies` in **every** language in `src/i18n/ui.ts`.
4. Play it with `/?planet=N` and make sure Olly can still escape.

### Draw / edit a sprite

Sprites are arrays of equal-length strings; each character is a palette key, `.` is transparent:

```ts
const BONE = ['ww.....ww', 'wwwwwwwww', '.wwwwwww.', 'wwwwwwwww', 'ww.....ww'];
drawPixels(ctx, BONE, { w: '#ffffff' }, x, y, pixelSize, { outline: null });
```

Olly's map is in `src/lib/sprites.ts`: the tail (`TAIL`, 2 frames) and legs (`LEGS`, 2 frames) are swapped in
for animation, `EYES_ROW` is blanked for blinking.
