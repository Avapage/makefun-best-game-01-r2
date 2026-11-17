// game.js — Stormwake's state machine and rules. States: title, playing,
// paused, over, victory. Owns the entities, collisions, scoring and
// combo, damage, pickups, the Gale Mother's lightning, banners and the
// fixed-step loop. Rendering paints sea, actors, night and lantern glow,
// weather, then the UI.

import { SoundBank } from './audio.js';
import { Effects } from './fx.js';
import { World } from './world.js';
import { Skiff, Bolt, Orb, Pickup, Wraith, ARENA, dist2 } from './entities.js';
import { WaveDirector, BOSS_WAVES } from './waves.js';
import { drawHud, drawBanner, drawTitle, drawPause, drawEndScreen } from './ui.js';

const BEST_KEY = 'stormwake-best';

export class Game {
  constructor(ctx, input, rng, { silent = false } = {}) {
    this.ctx = ctx;
    this.input = input;
    this.rng = rng;
    this.width = ARENA.width;
    this.height = ARENA.height;
    this.sound = new SoundBank();
    this.silent = silent;
    this.world = new World(rng, this.width, this.height);
    this.fx = new Effects(rng, this.width, this.height);
    this.best = 0;
    try {
      this.best = Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      this.best = 0;
    }
    this.muted = false;
    this.time = 0;
    this.resetToTitle();
  }

  resetToTitle() {
    this.state = 'title';
    this.player = new Skiff(this.width / 2, this.height * 0.62);
    this.enemies = [];
    this.bolts = [];
    this.orbs = [];
    this.pickups = [];
    this.pendingStrikes = [];
    this.director = new WaveDirector(this.rng);
    this.score = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.endT = 0;
    this.combo = 1;
    this.comboChain = 0;
    this.comboTimer = 0;
    this.banner = null;
    this.stormTimer = this.rng.range(2.5, 5);
    // Ambient hunters drift behind the title veil.
    this.ambient = [];
    for (let i = 0; i < 5; i++) {
      const w = new Wraith(this.rng.range(120, this.width - 120), this.rng.range(80, 300), this.rng);
      w.orbitPhase = this.rng.range(0, Math.PI * 2);
      w.orbitR = this.rng.range(140, 380);
      this.ambient.push(w);
    }
  }

  startRun() {
    this.player = new Skiff(this.width / 2, this.height * 0.62);
    this.enemies = [];
    this.bolts = [];
    this.orbs = [];
    this.pickups = [];
    this.pendingStrikes = [];
    this.director = new WaveDirector(this.rng);
    this.score = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.endT = 0;
    this.combo = 1;
    this.comboChain = 0;
    this.comboTimer = 0;
    this.banner = null;
    this.state = 'playing';
  }

  // ------------------------------------------------------------ events
  onWaveStart(wave) {
    if (BOSS_WAVES.has(wave)) {
      this.setBanner('STORM SURGE', 'The Gale Mother rises — break her, and the sea is yours', '#ff9a7a', 44);
      this.sound.roar();
      this.fx.shake(0.5);
    } else {
      this.setBanner(`WAVE ${wave}`, wave === 1 ? 'The drowned come for the light' : '', '#eaf6ff', 46);
      this.sound.waveHorn();
    }
  }

  onWaveCleared(wave) {
    const bonus = 200 + wave * 50;
    this.score += bonus;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
    this.setBanner(`WAVE ${wave} CLEARED`, `+${bonus} salvage · hull patched`, '#ffd98a', 34);
  }

  onBossRise() {
    this.fx.shake(0.7);
  }

  onBossEnrage(boss) {
    this.setBanner('SHE RAGES', 'The Gale Mother calls the lightning down', '#ff6a55', 40);
    this.fx.shake(0.8);
    this.fx.burst(boss.x, boss.y, { count: 30, color: '#ff8a5c', speed: 300, life: 0.6, size: 3.4 });
    this.sound.roar();
  }

  onVictory() {
    if (this.state !== 'playing') return;
    this.state = 'victory';
    this.endT = 0;
    this.score += 2500;
    this.saveBest();
    for (const e of this.enemies) {
      this.fx.burst(e.x, e.y, { count: 16, color: '#ffd98a', speed: 260, life: 0.7, size: 3 });
    }
    this.enemies = [];
    this.orbs = [];
    this.sound.powerup();
  }

  setBanner(title, sub, color, size) {
    this.banner = { title, sub, color, size, t: 0, ttl: 2.6 };
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        /* private mode: best score just won't persist */
      }
    }
  }

  // ------------------------------------------------------------ combat
  spawnOrb(x, y, angle, speed) {
    this.orbs.push(new Orb(x, y, angle, speed));
  }

  summonWraiths(n) {
    const boss = this.director.boss;
    if (!boss) return;
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const w = new Wraith(boss.x + Math.cos(a) * 90, boss.y + Math.sin(a) * 90, this.rng);
      this.enemies.push(w);
      this.fx.spray(w.x, w.y, 6);
    }
    this.fx.text(boss.x, boss.y - 70, 'SHE CALLS HER DROWNED', '#7fd4c9', 16);
  }

  callLightning(x, y) {
    this.pendingStrikes.push({ x, y, t: 0, ttl: 0.9 });
    this.fx.warnStrike(x, y, 0.9);
  }

  fireBolts() {
    const p = this.player;
    const spread = p.triTimer > 0 ? [-0.17, 0, 0.17] : [0];
    for (const off of spread) {
      this.bolts.push(new Bolt(p.x + Math.cos(p.aim) * 26, p.y + Math.sin(p.aim) * 26, p.aim + off));
    }
    p.fireTimer = 0.145;
    this.sound.shoot();
    this.fx.burst(p.x + Math.cos(p.aim) * 30, p.y + Math.sin(p.aim) * 30, {
      count: 2, color: '#ffd98a', speed: 90, life: 0.18, size: 2,
    });
  }

  hurtPlayer(dmg) {
    const p = this.player;
    if (p.invulnTimer > 0 || this.state !== 'playing') return;
    if (p.shielded) {
      p.invulnTimer = 0.5;
      this.fx.burst(p.x, p.y, { count: 10, color: '#7ec3ff', speed: 200, life: 0.35, size: 2.6 });
      this.fx.text(p.x, p.y - 34, 'AEGIS HOLDS', '#7ec3ff', 15);
      this.sound.hit();
      return;
    }
    p.hp -= dmg;
    p.invulnTimer = 0.75;
    this.comboChain = 0;
    this.combo = 1;
    this.fx.shake(0.42);
    this.fx.burst(p.x, p.y, { count: 14, color: '#ff8a5c', speed: 240, life: 0.5, size: 3 });
    this.sound.hurt();
    if (p.hp <= 0) {
      p.hp = 0;
      this.state = 'over';
      this.endT = 0;
      this.saveBest();
      this.fx.shake(1);
      this.fx.burst(p.x, p.y, { count: 60, color: '#ffb03a', speed: 380, life: 1, size: 4 });
      this.fx.embers(p.x, p.y, 26);
      this.sound.burst(true);
    }
  }

  killEnemy(e) {
    e.dead = true;
    this.kills++;
    this.comboChain++;
    this.comboTimer = 4;
    this.combo = Math.min(8, 1 + Math.floor(this.comboChain / 3));
    const gain = e.score * this.combo;
    this.score += gain;
    this.fx.text(e.x, e.y - e.radius - 6, `+${gain}`, '#ffe9b0', e.kind === 'boss' ? 26 : 16);
    const big = e.kind === 'hulk' || e.kind === 'boss';
    this.fx.burst(e.x, e.y, {
      count: big ? 34 : 16,
      color: e.kind === 'wraith' ? '#7dfce8' : e.kind === 'spitter' ? '#c69aff' : '#ffb03a',
      speed: big ? 320 : 230,
      life: 0.6,
      size: big ? 3.6 : 2.8,
    });
    this.fx.spray(e.x, e.y, big ? 14 : 7);
    this.fx.shake(big ? 0.4 : 0.14);
    this.sound.burst(big);
    // The sea gives up its gifts.
    const roll = this.rng.next();
    if (e.kind === 'boss') {
      this.dropPickup(e.x - 30, e.y, 'heart');
      this.dropPickup(e.x + 30, e.y, 'tri');
      this.dropPickup(e.x, e.y + 26, 'shard');
    } else if (e.kind === 'hulk') {
      this.dropPickup(e.x, e.y, 'shard');
      if (roll < 0.3) this.dropPickup(e.x + 16, e.y, 'heart');
    } else if (roll < 0.07) this.dropPickup(e.x, e.y, 'tri');
    else if (roll < 0.13) this.dropPickup(e.x, e.y, 'aegis');
    else if (roll < 0.18) this.dropPickup(e.x, e.y, 'heart');
    else if (roll < 0.38) this.dropPickup(e.x, e.y, 'shard');
    if (e.kind === 'boss' && this.director.wave >= 10) {
      this.onVictory();
    }
  }

  dropPickup(x, y, kind) {
    this.pickups.push(new Pickup(x, y, kind));
  }

  applyPickup(pick) {
    const p = this.player;
    if (pick.pickupKind === 'shard') {
      this.score += 50 * this.combo;
      this.fx.text(p.x, p.y - 34, `+${50 * this.combo} SUNSHARD`, '#ffd94f', 15);
      this.sound.pickup();
    } else if (pick.pickupKind === 'tri') {
      p.triTimer = 12;
      this.fx.text(p.x, p.y - 34, 'TRI-FLARE!', '#5ee8ff', 19);
      this.sound.powerup();
    } else if (pick.pickupKind === 'aegis') {
      p.shieldTimer = 9;
      this.fx.text(p.x, p.y - 34, 'AEGIS RAISED', '#7ec3ff', 19);
      this.sound.powerup();
    } else if (pick.pickupKind === 'heart') {
      p.hp = Math.min(p.maxHp, p.hp + 25);
      this.fx.text(p.x, p.y - 34, '+25 HULL', '#ff9a7a', 19);
      this.fx.embers(p.x, p.y, 12);
      this.sound.powerup();
    }
    this.fx.burst(pick.x, pick.y, { count: 8, color: '#ffffff', speed: 130, life: 0.3, size: 2.2 });
  }

  // ------------------------------------------------------------ update
  step(dt) {
    this.time += dt;
    const input = this.input;
    // Global keys.
    if (input.justPressed('KeyM')) {
      this.muted = !this.muted;
      this.sound.setMuted(this.muted);
    }
    if (this.state === 'title') {
      if (input.justPressed('Enter', 'Space') || input.justPressed('MouseDown')) this.startRun();
    } else if (this.state === 'over' || this.state === 'victory') {
      this.endT += dt;
      if (this.endT > 0.6 && (input.justPressed('Enter', 'Space') || input.justPressed('MouseDown'))) {
        this.resetToTitle();
        this.startRun();
      }
    } else if (this.state === 'playing') {
      if (input.justPressed('KeyP', 'Escape')) this.state = 'paused';
      else this.updatePlay(dt);
    } else if (this.state === 'paused') {
      if (input.justPressed('KeyP', 'Escape', 'Enter')) this.state = 'playing';
    }

    // Ambient storm lightning behind everything.
    this.stormTimer -= dt;
    if (this.stormTimer <= 0) {
      this.stormTimer = this.rng.range(3.5, 8);
      this.fx.flash = Math.max(this.fx.flash, 0.55);
      if (this.state !== 'title') this.sound.thunder();
    }

    if (this.state === 'title') {
      for (const w of this.ambient) {
        w.t += dt;
        w.x = this.width / 2 + Math.cos(this.time * 0.16 + w.orbitPhase) * w.orbitR;
        w.y = this.height * 0.4 + Math.sin(this.time * 0.22 + w.orbitPhase * 2) * 130;
      }
    }

    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.ttl) this.banner = null;
    }
    this.fx.update(dt);
    if (!this.silent) this.sound.update(this.state === 'playing' ? 0.4 + this.director.wave * 0.06 : 0.15);
    input.endStep();
  }

  updatePlay(dt) {
    this.elapsed += dt;
    const p = this.player;
    p.update(dt, this.input, this.fx);
    if ((this.input.mouse.down || this.input.down('Space')) && p.fireTimer <= 0) this.fireBolts();

    this.director.update(dt, this);

    for (const e of this.enemies) e.update(dt, this);
    for (const b of this.bolts) b.update(dt);
    for (const o of this.orbs) o.update(dt);
    for (const pk of this.pickups) pk.update(dt, this);

    // Telegraphs resolve into strikes.
    for (const s of this.pendingStrikes) {
      s.t += dt;
      if (s.t >= s.ttl && !s.done) {
        s.done = true;
        this.fx.lightningStrike(s.x, s.y);
        this.fx.shake(0.3);
        this.sound.thunder();
        if (Math.hypot(p.x - s.x, p.y - s.y) < 52) this.hurtPlayer(18);
      }
    }
    this.pendingStrikes = this.pendingStrikes.filter((s) => !s.done);

    // Bolts vs enemies.
    for (const b of this.bolts) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const rr = e.radius + b.radius;
        if (dist2(b, e) < rr * rr) {
          b.dead = true;
          e.hp -= 1;
          this.fx.burst(b.x, b.y, { count: 3, color: '#ffe9b0', speed: 130, life: 0.25, size: 2 });
          if (e.hp <= 0) this.killEnemy(e);
          else this.sound.hit();
          break;
        }
      }
    }
    // Orbs vs player.
    for (const o of this.orbs) {
      if (o.dead) continue;
      const rr = o.radius + p.radius - 4;
      if (dist2(o, p) < rr * rr) {
        o.dead = true;
        this.hurtPlayer(o.damage);
      }
    }
    // Enemies vs player.
    for (const e of this.enemies) {
      if (e.dead) continue;
      const rr = e.radius + p.radius - 6;
      if (dist2(e, p) < rr * rr) {
        this.hurtPlayer(e.contact);
        if (e.kind === 'wraith') this.killEnemy(e);
        else {
          // Shove heavier foes off so they cannot grind the hull.
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          e.x += (dx / d) * 26;
          e.y += (dy / d) * 26;
        }
      }
    }
    // Pickups vs player.
    for (const pk of this.pickups) {
      if (pk.dead) continue;
      const rr = pk.radius + p.radius + 4;
      if (dist2(pk, p) < rr * rr) {
        pk.dead = true;
        this.applyPickup(pk);
      }
    }
    // Combo decay.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboChain = 0;
        this.combo = 1;
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bolts = this.bolts.filter((b) => !b.dead);
    this.orbs = this.orbs.filter((o) => !o.dead);
    this.pickups = this.pickups.filter((pk) => !pk.dead);
  }

  // ------------------------------------------------------------ render
  render() {
    const ctx = this.ctx;
    const t = this.time;
    ctx.save();
    const off = this.fx.offset();
    ctx.translate(off.x, off.y);
    this.world.drawSea(ctx, t);
    this.fx.drawStrikeWarnings(ctx);
    for (const pk of this.pickups) pk.draw(ctx, t);
    // Boss first (its body is the backdrop), then the rest.
    const boss = this.director ? this.director.boss : null;
    if (boss && this.enemies.includes(boss)) boss.draw(ctx, t);
    for (const e of this.enemies) if (e !== boss) e.draw(ctx, t);
    if (this.state === 'title') for (const w of this.ambient) w.draw(ctx, t);
    if (!(this.state === 'over' && this.endT > 0.2)) this.player.draw(ctx, t);
    for (const b of this.bolts) b.draw(ctx);
    for (const o of this.orbs) o.draw(ctx, t);
    this.fx.drawParticles(ctx);
    // Night and lantern light.
    this.world.drawDarkness(ctx, 0.30);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.world.drawGlow(ctx, this.player.x, this.player.y, 215);
    if (boss && this.enemies.includes(boss)) {
      this.world.drawGlow(ctx, boss.x, boss.y, 190, 'rgba(255, 110, 60, 0.16)');
    }
    for (const pk of this.pickups) this.world.drawGlow(ctx, pk.x, pk.y, 44, 'rgba(255, 230, 160, 0.20)');
    ctx.restore();
    this.world.drawVignette(ctx);
    this.fx.drawTexts(ctx);
    this.fx.drawRain(ctx);
    ctx.restore();

    // UI (unshaken).
    if (this.state === 'playing' || this.state === 'paused') {
      drawHud(ctx, this);
      drawBanner(ctx, this);
    }
    if (this.state === 'title') drawTitle(ctx, this, t);
    if (this.state === 'paused') drawPause(ctx, this);
    if (this.state === 'over') drawEndScreen(ctx, this, false);
    if (this.state === 'victory') drawEndScreen(ctx, this, true);
    this.fx.drawLightning(ctx);
  }
}
