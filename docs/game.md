# Operation: Bone — game design

## Goal

Guide Olly from the top-left corner to the bone (always the farthest cell of the maze). Each bone moves you to
the next planet. Three lives per run; a run ends when they are gone.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | arrows / WASD (walk while held) | swipe, or tap a d-pad arrow — Olly keeps running until a wall; the next turn is queued |
| **Bark** (special ability) | Space | tap the maze, or **BARK/HAF** |
| Sniff | E | **SNIFF/ŇUCH** |
| Start / next / retry | Enter | the overlay button |

- **Bark** stuns every enemy within **3.5 cells** for **2.5 s**; stunned enemies freeze, show dizzy stars and
  can be walked through. Cooldown **5 s**.
- **Sniff** shows the next 15 cells of the shortest path to the bone for 2.4 s. Cooldown **6 s**.

## Planets and difficulty

The maze stays small (`5 + ⌊planet / 2⌋` cells per side, max 9) with extra wall openings (`loopiness` 0.3) so there are always
detours. Difficulty comes from enemies:

| Enemy | First planet | Speed (cells/s) | Behaviour |
|---|---|---|---|
| Vroomba (robot vacuum) | 1 | 2.8 + 0.3·planet, max 6 | shortest path to Olly, 12 % wrong turns |
| Cat | 2 | 3.9 + 0.3·planet, max 7.2 | chases, 35 % random turns |
| Bath time (bubble + duck) | 3 | 0.8 + 0.1·planet, max 1.9 | floats straight at Olly **through walls** |
| 2nd Vroomba / 2nd cat / 2nd bubble | 5 / 7 / 9 | as above | |

Olly runs at **8 cells/s**. Enemies spawn far from the start and wait **1.3 s** before moving.

## Getting caught

Touching an active enemy (closer than 0.6 cells) costs a life: pink flash, a line from the enemy
("Slurped up by the Vroomba!"), Olly and all enemies reset to their start cells, enemies wait 1.3 s again and
Olly is invulnerable (blinking) for 1.6 s. At zero lives: **Game over** with the best planet reached.

## Records

Stored in the browser: total bones, best planet (`olly.bestPlanet`), best time per planet (`olly.best.<n>`).

## Tuning knobs

| Where | What |
|---|---|
| top of `src/game/game.ts` | `SPEED`, `LIVES`, `GRACE`, `INVULNERABLE`, `HIT_RADIUS`, `BARK_*`, `SNIFF_*` |
| `startLevel()` in `game.ts` | maze size formula and loopiness (`generateMaze(cells, 0.3)`) |
| `KINDS` in `src/game/enemies.ts` | per-enemy `speed(level)`, `wander`, `ghost` |
| `roster()` in `enemies.ts` | which enemies appear on which planet |

Rule of thumb: when adding pressure, add an escape too (bark, loops, grace time).
