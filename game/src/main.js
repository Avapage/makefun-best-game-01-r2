// main.js — bootstrap. Two ways in:
//  - live: a fixed-step loop (60 steps a second) driven by
//    requestAnimationFrame, audio unlocked on the first gesture;
//  - a screenshot scene: ?shot=title|action|boss|victory&seed=N builds
//    one deterministic frame (see shots.js) and raises
//    window.__shotReady when it is on screen.
// window.__stormwake exposes the game for play-testing.

import { Game } from './game.js';
import { Input } from './input.js';
import { makeRng } from './rng.js';
import { buildShotScene } from './shots.js';

const canvas = document.getElementById('sea');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? (shot ? 7 : Date.now() % 2147483647));

const input = new Input(canvas);
const game = new Game(ctx, input, makeRng(seed), { silent: Boolean(shot) });
window.__stormwake = game;

if (shot) {
  buildShotScene(game, shot);
  game.render();
  requestAnimationFrame(() => {
    window.__shotReady = true;
  });
} else {
  const unlock = () => game.sound.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    const dt = 1 / 60;
    let steps = 0;
    while (acc >= dt && steps < 5) {
      game.step(dt);
      acc -= dt;
      steps++;
    }
    if (steps === 5) acc = 0;
    game.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
