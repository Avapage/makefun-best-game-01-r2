// entities.js — everything that floats, hunts or explodes on the
// Drowning Sea, each drawn in code: the lantern-skiff (the player), the
// three drowned hunters (Wraith, Hulk, Spitter), the Gale Mother boss, the
// player's flare bolts, enemy venom orbs and the pickups the sea gives up.

export const ARENA = { width: 1280, height: 720 };

let nextId = 1;
function base(kind, x, y, radius, hp) {
  return { id: nextId++, kind, x, y, vx: 0, vy: 0, radius, hp, maxHp: hp, dead: false, t: 0 };
}

// ---------------------------------------------------------------- skiff
export class Skiff {
  constructor(x, y) {
    Object.assign(this, base('skiff', x, y, 20, 100));
    this.aim = -Math.PI / 2;
    this.fireTimer = 0;
    this.triTimer = 0; // tri-flare power-up seconds left
    this.shieldTimer = 0; // aegis seconds left
    this.invulnTimer = 0;
    this.thrust = 0;
  }

  get shielded() {
    return this.shieldTimer > 0;
  }

  update(dt, input, fx) {
    this.t += dt;
    this.fireTimer -= dt;
    this.triTimer = Math.max(0, this.triTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    const axis = input.moveAxis();
    const speed = 272;
    this.vx += (axis.x * speed - this.vx) * Math.min(1, dt * 9);
    this.vy += (axis.y * speed - this.vy) * Math.min(1, dt * 9);
    this.x = clamp(this.x + this.vx * dt, 30, ARENA.width - 30);
    this.y = clamp(this.y + this.vy * dt, 40, ARENA.height - 30);
    this.thrust = Math.hypot(this.vx, this.vy) / speed;
    this.aim = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);
    if (this.thrust > 0.25 && Math.random() < dt * 22) {
      fx.spray(this.x - Math.cos(this.aim) * 6, this.y - Math.sin(this.aim) * 6, 1);
    }
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    // Wake.
    ctx.fillStyle = 'rgba(190, 230, 250, 0.13)';
    ctx.beginPath();
    ctx.ellipse(-Math.cos(this.aim) * 20, -Math.sin(this.aim) * 20, 26, 12, this.aim, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(this.aim);
    ctx.scale(1.28, 1.28);
    // Hull.
    const hull = ctx.createLinearGradient(0, -14, 0, 14);
    hull.addColorStop(0, '#8a5a30');
    hull.addColorStop(0.5, '#6e4525');
    hull.addColorStop(1, '#54331b');
    ctx.fillStyle = hull;
    ctx.strokeStyle = '#2e1c0e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.quadraticCurveTo(14, -13, -8, -13);
    ctx.quadraticCurveTo(-24, -10, -26, 0);
    ctx.quadraticCurveTo(-24, 10, -8, 13);
    ctx.quadraticCurveTo(14, 13, 26, 0);
    ctx.fill();
    ctx.stroke();
    // Teal trim + deck planks.
    ctx.strokeStyle = 'rgba(64, 224, 208, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, -7);
    ctx.quadraticCurveTo(0, -10, -18, -7);
    ctx.moveTo(20, 7);
    ctx.quadraticCurveTo(0, 10, -18, 7);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-14, -8, 3, 16);
    ctx.fillRect(-4, -10, 3, 20);
    // Bow foam + mast base ring.
    ctx.strokeStyle = 'rgba(230, 248, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 0, 7, -0.9, 0.9);
    ctx.stroke();
    ctx.strokeStyle = '#2e1c0e';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Lantern mast glow (drawn unrotated so the flame stays round).
    const flicker = 1 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23) * 0.05;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#3a2a16';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.beginPath();
    ctx.fillStyle = '#ffd98a';
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 22 * flicker;
    ctx.arc(0, 0, 6.5 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff3cf';
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    if (this.shielded) {
      ctx.strokeStyle = `rgba(120, 220, 255, ${0.55 + Math.sin(t * 6) * 0.2})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 31 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.invulnTimer > 0 && Math.floor(t * 14) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// -------------------------------------------------------------- enemies
export class Wraith {
  constructor(x, y, rng) {
    Object.assign(this, base('wraith', x, y, 17, 2));
    this.phase = rng.range(0, Math.PI * 2);
    this.speed = rng.range(118, 168);
    this.score = 100;
    this.contact = 12;
  }

  update(dt, game) {
    this.t += dt;
    const p = game.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const sway = Math.sin(this.t * 3.4 + this.phase) * 0.65;
    const nx = dx / d;
    const ny = dy / d;
    this.vx = (nx - ny * sway) * this.speed;
    this.vy = (ny + nx * sway) * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y + Math.sin(t * 3 + this.phase) * 3);
    const grad = ctx.createRadialGradient(0, -4, 2, 0, 0, 22);
    grad.addColorStop(0, 'rgba(160, 255, 240, 0.95)');
    grad.addColorStop(0.6, 'rgba(64, 200, 190, 0.75)');
    grad.addColorStop(1, 'rgba(30, 120, 130, 0.05)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -3, 15, Math.PI, 0);
    for (let i = 0; i <= 4; i++) {
      const x = 15 - i * 7.5;
      ctx.lineTo(x, 12 + Math.sin(t * 9 + i * 1.8 + this.phase) * 3.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff4fd8';
    ctx.shadowColor = '#ff4fd8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-5, -4, 2.4, 0, Math.PI * 2);
    ctx.arc(5, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Hulk {
  constructor(x, y, rng) {
    Object.assign(this, base('hulk', x, y, 30, 16));
    this.phase = rng.range(0, Math.PI * 2);
    this.state = 'stalk'; // stalk | windup | charge
    this.stateT = 0;
    this.score = 300;
    this.contact = 22;
  }

  update(dt, game) {
    this.t += dt;
    this.stateT += dt;
    const p = game.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (this.state === 'stalk') {
      this.vx = (dx / d) * 56;
      this.vy = (dy / d) * 56;
      if (d < 300 && this.stateT > 1.2) {
        this.state = 'windup';
        this.stateT = 0;
      }
    } else if (this.state === 'windup') {
      this.vx *= 0.8;
      this.vy *= 0.8;
      if (this.stateT > 0.55) {
        this.state = 'charge';
        this.stateT = 0;
        this.vx = (dx / d) * 265;
        this.vy = (dy / d) * 265;
      }
    } else {
      if (this.stateT > 0.85) {
        this.state = 'stalk';
        this.stateT = 0;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const windup = this.state === 'windup';
    // Legs.
    ctx.strokeStyle = '#3d1f16';
    ctx.lineWidth = 5;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const ly = -14 + i * 14;
        const kick = Math.sin(t * 7 + i * 2 + (s > 0 ? 1 : 0)) * 5;
        ctx.beginPath();
        ctx.moveTo(s * 20, ly);
        ctx.lineTo(s * (34 + kick), ly + 8);
        ctx.stroke();
      }
    }
    // Armoured shell.
    const shell = ctx.createRadialGradient(-8, -10, 6, 0, 0, 34);
    shell.addColorStop(0, windup ? '#a03d2a' : '#7c3226');
    shell.addColorStop(0.7, '#55221a');
    shell.addColorStop(1, '#33150f');
    ctx.fillStyle = shell;
    ctx.strokeStyle = '#1d0c08';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 170, 90, 0.5)';
    ctx.lineWidth = 2;
    for (const a of [-0.7, 0, 0.7]) {
      ctx.beginPath();
      ctx.arc(0, 0, 19, a - 0.4, a + 0.4);
      ctx.stroke();
    }
    // Eyes.
    ctx.fillStyle = '#ffb03a';
    ctx.shadowColor = '#ff8c1a';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(-8, -6, 3.2, 0, Math.PI * 2);
    ctx.arc(8, -6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Spitter {
  constructor(x, y, rng) {
    Object.assign(this, base('spitter', x, y, 19, 4));
    this.phase = rng.range(0, Math.PI * 2);
    this.spitTimer = rng.range(1.2, 2.4);
    this.trail = [];
    this.score = 150;
    this.contact = 10;
  }

  update(dt, game) {
    this.t += dt;
    const p = game.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = 300;
    const radial = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
    const strafe = Math.sin(this.t * 0.9 + this.phase) > 0 ? 1 : -1;
    this.vx = (dx / d) * radial * 74 + (-dy / d) * strafe * 52;
    this.vy = (dy / d) * radial * 74 + (dx / d) * strafe * 52;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Record the body trail by distance so the segments stay spread out.
    const lastS = this.trail[0];
    if (!lastS || Math.hypot(this.x - lastS.x, this.y - lastS.y) > 10) {
      this.trail.unshift({ x: this.x, y: this.y });
      if (this.trail.length > 8) this.trail.pop();
    }
    this.spitTimer -= dt;
    if (this.spitTimer <= 0 && d < 560) {
      this.spitTimer = 2.4;
      game.spawnOrb(this.x, this.y, Math.atan2(dy, dx));
    }
  }

  draw(ctx, t) {
    ctx.save();
    // Segmented eel body trailing the head.
    for (let i = this.trail.length - 1; i >= 1; i--) {
      const s = this.trail[i];
      ctx.fillStyle = `rgba(96, 60, 160, ${0.55 - i * 0.05})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 14 - i * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(this.x, this.y);
    const body = ctx.createRadialGradient(-4, -5, 3, 0, 0, 22);
    body.addColorStop(0, '#b48ce8');
    body.addColorStop(0.65, '#6d3fa8');
    body.addColorStop(1, '#3c2066');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#241040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Venom sacs + eyes.
    ctx.fillStyle = '#c6ff5e';
    ctx.shadowColor = '#9fe83c';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(-7, 6, 3, 0, Math.PI * 2);
    ctx.arc(7, 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe14f';
    ctx.beginPath();
    ctx.arc(-5, -5, 2.6, 0, Math.PI * 2);
    ctx.arc(5, -5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ----------------------------------------------------------------- boss
export class GaleMother {
  constructor(x, y, hp) {
    Object.assign(this, base('boss', x, y, 52, hp));
    this.score = 5000;
    this.contact = 30;
    // The serpent arrives with her body already behind her, laid along a
    // slow curve; update() then records new points by distance.
    this.trail = [];
    for (let i = 0; i < 16; i++) {
      this.trail.push({ x: x - i * 17, y: y + Math.sin(i * 0.55) * 16 });
    }
    this.spitTimer = 1.4;
    this.summonTimer = 6;
    this.strikeTimer = 5;
    this.enraged = false;
  }

  phase() {
    const f = this.hp / this.maxHp;
    return f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
  }

  update(dt, game) {
    this.t += dt;
    const p = game.player;
    // Serpent pathing: slow sweep toward the player's side of the arena.
    const targetX = ARENA.width / 2 + Math.sin(this.t * 0.24) * 330;
    const targetY = 190 + Math.sin(this.t * 0.4) * 70;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = this.phase() === 3 ? 74 : 52;
    this.vx = (dx / d) * speed;
    this.vy = (dy / d) * speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const lastB = this.trail[0];
    if (!lastB || Math.hypot(this.x - lastB.x, this.y - lastB.y) > 17) {
      this.trail.unshift({ x: this.x, y: this.y });
      if (this.trail.length > 16) this.trail.pop();
    }

    const ph = this.phase();
    if (ph === 3 && !this.enraged) {
      this.enraged = true;
      game.onBossEnrage(this);
    }
    this.spitTimer -= dt;
    if (this.spitTimer <= 0) {
      this.spitTimer = ph === 1 ? 2.3 : ph === 2 ? 1.9 : 1.5;
      const base = Math.atan2(p.y - this.y, p.x - this.x);
      const shots = ph === 1 ? 3 : ph === 2 ? 5 : 7;
      for (let i = 0; i < shots; i++) {
        const a = base + (i - (shots - 1) / 2) * 0.22;
        game.spawnOrb(this.x, this.y + 16, a, 252);
      }
      game.fx.burst(this.x, this.y + 18, { count: 6, color: '#c6ff5e', speed: 120, life: 0.3, size: 2.4 });
    }
    if (ph >= 2) {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = 7.5;
        game.summonWraiths(2 + ph);
      }
    }
    if (ph >= 2) {
      this.strikeTimer -= dt;
      if (this.strikeTimer <= 0) {
        this.strikeTimer = ph === 2 ? 5.5 : 4.2;
        game.callLightning(p.x + game.rng.range(-40, 40), p.y + game.rng.range(-40, 40));
      }
    }
  }

  draw(ctx, t) {
    ctx.save();
    // Segmented body, tail first so the head sits on top.
    for (let i = this.trail.length - 1; i >= 1; i--) {
      const s = this.trail[i];
      const r = Math.max(13, 37 - i * 1.6);
      const grad = ctx.createRadialGradient(s.x - 6, s.y - 8, 4, s.x, s.y, r + 4);
      grad.addColorStop(0, '#3f6d8e');
      grad.addColorStop(0.7, '#22405c');
      grad.addColorStop(1, '#101f31');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y + Math.sin(t * 2.2 + i) * 3, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 190, 92, 0.55)';
      ctx.beginPath();
      ctx.arc(s.x, s.y - r * 0.55, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(this.x, this.y);
    // Horns.
    ctx.strokeStyle = '#cfd8de';
    ctx.lineWidth = 6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 32, -26);
      ctx.quadraticCurveTo(s * 54, -46, s * 48, -70);
      ctx.stroke();
    }
    // Head.
    const head = ctx.createRadialGradient(-12, -16, 10, 0, 0, 66);
    head.addColorStop(0, '#4d7fa3');
    head.addColorStop(0.6, '#2a4d6b');
    head.addColorStop(1, '#132a40');
    ctx.fillStyle = head;
    ctx.strokeStyle = '#0a1826';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 57, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Burning eyes.
    const rage = this.phase() === 3;
    ctx.fillStyle = rage ? '#ff5340' : '#ffb03a';
    ctx.shadowColor = rage ? '#ff2a1a' : '#ff8c1a';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(-20, -12, 7, 0, Math.PI * 2);
    ctx.arc(20, -12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Maw.
    ctx.fillStyle = '#0d0605';
    ctx.beginPath();
    ctx.ellipse(0, 19, 20, 11 + Math.sin(t * 3) * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f2f2';
    for (const fx of [-14, -5, 5, 14]) {
      ctx.beginPath();
      ctx.moveTo(fx - 2.8, 12);
      ctx.lineTo(fx + 2.8, 12);
      ctx.lineTo(fx, 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------ projectiles
export class Bolt {
  constructor(x, y, angle) {
    Object.assign(this, base('bolt', x, y, 6, 1));
    this.vx = Math.cos(angle) * 660;
    this.vy = Math.sin(angle) * 660;
    this.angle = angle;
    this.life = 1.1;
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.life <= 0 || this.x < -20 || this.x > ARENA.width + 20 || this.y < -20 || this.y > ARENA.height + 20) {
      this.dead = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#ffd98a';
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6da';
    ctx.beginPath();
    ctx.ellipse(2, 0, 5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Orb {
  constructor(x, y, angle, speed = 235) {
    Object.assign(this, base('orb', x, y, 9, 1));
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = 10;
    this.life = 4.5;
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.life <= 0 || this.x < -30 || this.x > ARENA.width + 30 || this.y < -30 || this.y > ARENA.height + 30) {
      this.dead = true;
    }
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const pulse = 1 + Math.sin(t * 9 + this.id) * 0.15;
    ctx.fillStyle = '#b04fe0';
    ctx.shadowColor = '#c65eff';
    ctx.shadowBlur = 13;
    ctx.beginPath();
    ctx.arc(0, 0, 8 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eec9ff';
    ctx.beginPath();
    ctx.arc(-2, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --------------------------------------------------------------- pickups
export const PICKUP_KINDS = {
  shard: { color: '#ffd94f', label: 'sunshard' },
  tri: { color: '#5ee8ff', label: 'Tri-Flare' },
  aegis: { color: '#7ec3ff', label: 'Aegis' },
  heart: { color: '#ff7a5c', label: 'Ember Heart' },
};

export class Pickup {
  constructor(x, y, kind) {
    Object.assign(this, base('pickup', x, y, 15, 1));
    this.pickupKind = kind;
    this.life = 11;
  }

  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    const p = game.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 120) {
      const pull = (1 - d / 120) * 300;
      this.x += (dx / (d || 1)) * pull * dt;
      this.y += (dy / (d || 1)) * pull * dt;
    }
  }

  draw(ctx, t) {
    const bob = Math.sin(t * 3.2 + this.id * 1.7) * 4;
    const blink = this.life < 2.5 && Math.floor(t * 8) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.globalAlpha = blink ? 0.35 : 1;
    const color = PICKUP_KINDS[this.pickupKind].color;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    if (this.pickupKind === 'shard') {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
    } else if (this.pickupKind === 'tri') {
      for (const a of [-0.5, 0, 0.5]) {
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -7, 3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (this.pickupKind === 'aegis') {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Ember heart.
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-13, -1, -8, -11, 0, -5);
      ctx.bezierCurveTo(8, -11, 13, -1, 0, 10);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
