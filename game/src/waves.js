// waves.js — the WaveDirector: ten waves over the Drowning Sea, each
// announced, each meaner than the last. Wraiths come first, then Spitters
// join, then Hulks; waves 5 and 10 are Storm Surges, when the Gale Mother
// rises. Kill the wave-10 Mother and the sea calms: victory.

import { Wraith, Hulk, Spitter, GaleMother, ARENA } from './entities.js';

export const TOTAL_WAVES = 10;
export const BOSS_WAVES = new Set([5, 10]);

export class WaveDirector {
  constructor(rng) {
    this.rng = rng;
    this.wave = 0;
    this.state = 'intermission'; // intermission | spawning | active | done
    this.timer = 1.6;
    this.queue = [];
    this.spawnTimer = 0;
    this.boss = null;
  }

  composition(wave) {
    const list = [];
    const add = (kind, n) => {
      for (let i = 0; i < n; i++) list.push(kind);
    };
    add('wraith', 3 + wave * 2);
    if (wave >= 2) add('spitter', wave - 1);
    if (wave >= 3) add('hulk', Math.floor((wave - 1) / 2));
    if (wave >= 7) add('spitter', 2);
    if (wave >= 8) add('hulk', 2);
    // Shuffle so kinds arrive mixed.
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  startNextWave(game) {
    this.wave++;
    this.queue = this.composition(this.wave);
    this.state = 'spawning';
    this.spawnTimer = 0;
    if (BOSS_WAVES.has(this.wave)) {
      const hp = this.wave === 5 ? 150 : 320;
      this.boss = new GaleMother(ARENA.width / 2, -70, hp);
      game.enemies.push(this.boss);
      game.onBossRise(this.boss);
    }
    game.onWaveStart(this.wave);
  }

  spawnPoint(player) {
    // Spawn at the arena edge, away from the player.
    for (let tries = 0; tries < 8; tries++) {
      const side = this.rng.int(0, 3);
      let x;
      let y;
      if (side === 0) { x = this.rng.range(40, ARENA.width - 40); y = -30; }
      else if (side === 1) { x = this.rng.range(40, ARENA.width - 40); y = ARENA.height + 30; }
      else if (side === 2) { x = -30; y = this.rng.range(40, ARENA.height - 40); }
      else { x = ARENA.width + 30; y = this.rng.range(40, ARENA.height - 40); }
      const d = Math.hypot(x - player.x, y - player.y);
      if (d > 260 || tries === 7) return { x, y };
    }
    return { x: -30, y: 100 };
  }

  update(dt, game) {
    if (this.state === 'done') return;
    if (this.state === 'intermission') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.wave >= TOTAL_WAVES) {
          this.state = 'done';
        } else {
          this.startNextWave(game);
        }
      }
      return;
    }
    if (this.state === 'spawning') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.queue.length > 0) {
        this.spawnTimer = Math.max(0.28, 0.85 - this.wave * 0.05);
        const kind = this.queue.shift();
        const pt = this.spawnPoint(game.player);
        const x = Math.max(-30, Math.min(ARENA.width + 30, pt.x));
        const y = Math.max(-30, Math.min(ARENA.height + 30, pt.y));
        if (kind === 'wraith') game.enemies.push(new Wraith(x, y, this.rng));
        else if (kind === 'hulk') game.enemies.push(new Hulk(x, y, this.rng));
        else game.enemies.push(new Spitter(x, y, this.rng));
        game.fx.spray(Math.max(10, Math.min(ARENA.width - 10, x)), Math.max(10, Math.min(ARENA.height - 10, y)), 5);
      }
      if (this.queue.length === 0) this.state = 'active';
      return;
    }
    // active: wave clears when nothing hostile remains
    if (game.enemies.length === 0) {
      if (this.wave >= TOTAL_WAVES) {
        this.state = 'done';
        game.onVictory();
      } else {
        this.state = 'intermission';
        this.timer = 3.2;
        game.onWaveCleared(this.wave);
      }
    }
  }
}
