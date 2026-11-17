[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Avapage/makefun-best-game-01-r2/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Avapage/makefun-best-game-01-r2/reward.svg)](https://make.fun/bounty/best-game-01)

# Stormwake — Lantern of the Drowning Sea

An original storm-ocean arena survival game, entered in
[make.fun's best-game-01 bounty](https://make.fun/bounty/best-game-01).

One lantern-skiff. One drowning sea. Ten waves of the things that hunt in
the dark — and at waves 5 and 10 the sea itself rises: the **Gale Mother**,
a horned serpent who spits venom, calls her drowned and strikes with
lightning. Keep the lantern lit, gather sunshards and the gifts of the sea,
and calm her for good.

## How to play

- **WASD / arrow keys** — sail · **Mouse** — aim · **Hold click / Space** — fire lantern flares
- **P / Esc** — pause · **M** — mute
- Foes: **Wraiths** swarm in sine packs, **Hulks** wind up and charge,
  **Spitters** keep their distance and spit venom orbs.
- Pickups: **Sunshards** (score), **Tri-Flare** (triple shot, 12 s),
  **Aegis** (a shield that eats hits, 9 s), **Ember Hearts** (+25 hull).
- Kills build a combo multiplier up to ×8; taking a hit breaks it.
- Survive all ten waves and kill the wave-10 Gale Mother to win. The best
  score is kept in your browser.

## Running it

The game is plain static files — no build step, no network. Serve the
`game/` folder with any static file server and open `index.html` in a
desktop browser:

```sh
python3 -m http.server 8080 --directory game
# then open http://localhost:8080
```

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output and writes the dossier with `vendor/makefun-game.ts`.
- `game/index.html` — the page shell and canvas.
- `game/src/main.js` — bootstrap and the fixed-step loop; also the
  deterministic screenshot scenes' entry point.
- `game/src/game.js` — the state machine and rules (title, playing,
  paused, wrecked, victory), collisions, scoring and combo.
- `game/src/entities.js` — the skiff, Wraith, Hulk, Spitter, the Gale
  Mother, bolts, orbs and pickups, all drawn in code.
- `game/src/waves.js` — the ten-wave director and the Storm Surges.
- `game/src/world.js` — the sea, foam, rock spires, night and lantern glow.
- `game/src/fx.js` — particles, rain, lightning, floating text, screen shake.
- `game/src/audio.js` — WebAudio-synthesised music and effects (no files).
- `game/src/ui.js` — HUD, title, banners, pause and results screens.
- `game/src/input.js`, `game/src/rng.js`, `game/src/shots.js` — controls,
  the seeded random generator, and the screenshot scenes.

Every picture and sound is generated in code at run time; there are no
image or audio assets. The screenshots in `screenshots/` are real renders
of the game's own code, taken from its deterministic `?shot=` scenes.

## License

MIT — see `LICENSE`.
