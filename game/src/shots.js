// shots.js — deterministic scenes for the screenshots. Each scene seeds
// the game, stages its actors, runs a fixed number of fixed steps so the
// motion, trails and particles are real, then leaves the game ready to
// render one frame. main.js sets window.__shotReady once it has.

import { Wraith, Hulk, Spitter, GaleMother, Pickup } from './entities.js';

function runSteps(game, n) {
  for (let i = 0; i < n; i++) game.step(1 / 60);
}

function stagePlayer(game, x, y, aimX, aimY) {
  game.player.x = x;
  game.player.y = y;
  game.input.mouse.x = aimX;
  game.input.mouse.y = aimY;
  game.input.mouse.down = true;
}

export function buildShotScene(game, name) {
  if (name === 'title') {
    runSteps(game, 110);
    // The hero skiff waits at the bottom of the frame, lantern lit.
    game.player.x = 640;
    game.player.y = 648;
    game.fx.flash = 0.35;
    return;
  }

  if (name === 'action') {
    game.state = 'playing';
    game.director.wave = 4;
    game.director.state = 'active';
    stagePlayer(game, 430, 440, 940, 250);
    game.player.triTimer = 9;
    const rng = game.rng;
    game.enemies.push(new Wraith(880, 210, rng));
    game.enemies.push(new Wraith(960, 330, rng));
    game.enemies.push(new Wraith(760, 140, rng));
    game.enemies.push(new Wraith(240, 180, rng));
    game.enemies.push(new Wraith(615, 235, rng));
    game.enemies.push(new Wraith(705, 355, rng));
    game.enemies.push(new Hulk(1010, 470, rng));
    game.enemies.push(new Hulk(715, 545, rng));
    game.enemies.push(new Spitter(1090, 180, rng));
    game.pickups.push(new Pickup(620, 300, 'shard'));
    game.pickups.push(new Pickup(300, 560, 'tri'));
    game.pickups.push(new Pickup(1080, 590, 'heart'));
    runSteps(game, 42);
    game.input.mouse.down = false;
    game.score = 12750;
    game.best = 15200;
    game.combo = 4;
    game.comboTimer = 3;
    game.player.hp = 76;
    game.player.invulnTimer = 0;
    game.fx.burst(880, 210, { count: 10, color: '#7dfce8', speed: 200, life: 0.5, size: 2.8 });
    game.fx.flash = 0.5;
    game.banner = null;
    return;
  }

  if (name === 'boss') {
    game.state = 'playing';
    game.director.wave = 10;
    game.director.state = 'active';
    const boss = new GaleMother(660, 205, 320);
    boss.hp = 96; // phase 3: the raging endgame
    boss.enraged = true;
    game.director.boss = boss;
    game.enemies.push(boss);
    const rng = game.rng;
    game.enemies.push(new Wraith(300, 240, rng));
    game.enemies.push(new Wraith(1010, 300, rng));
    stagePlayer(game, 620, 540, 660, 220);
    game.pickups.push(new Pickup(430, 380, 'aegis'));
    game.pickups.push(new Pickup(880, 470, 'shard'));
    runSteps(game, 55);
    game.input.mouse.down = false;
    // A fan of her venom, caught mid-flight toward the skiff.
    const base = Math.atan2(game.player.y - boss.y, game.player.x - boss.x);
    for (let i = 0; i < 5; i++) {
      const orb = game.spawnOrb(boss.x, boss.y + 20, base + (i - 2) * 0.2, 252);
      void orb;
    }
    for (const o of game.orbs) {
      o.x += o.vx * 0.55;
      o.y += o.vy * 0.55;
    }
    game.score = 41200;
    game.best = 47600;
    game.kills = 74;
    game.elapsed = 431;
    game.player.hp = 58;
    game.player.invulnTimer = 0;
    game.banner = null;
    game.fx.warnStrike(760, 470, 0.9);
    game.fx.lightningStrike(210, 300);
    return;
  }

  // victory
  game.state = 'victory';
  game.director.wave = 10;
  game.score = 68450;
  game.kills = 87;
  game.elapsed = 512;
  game.best = Math.max(game.best, game.score);
  game.endT = 1.2;
  game.player.x = 640;
  game.player.y = 622;
  runSteps(game, 30);
  game.fx.embers(640, 600, 18);
  game.fx.burst(470, 640, { count: 12, color: '#ffd98a', speed: 150, life: 0.9, size: 2.6 });
  game.fx.burst(810, 640, { count: 12, color: '#ffd98a', speed: 150, life: 0.9, size: 2.6 });
  game.state = 'victory'; // runSteps with no input keeps the state, be safe
  game.endT = 1.2;
}
