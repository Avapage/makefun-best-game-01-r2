// fx.js — the weather and the juice: a pooled particle system (sparks,
// spray, foam, embers), falling rain, telegraphed lightning with a drawn
// bolt, floating score text and trauma-based screen shake. Everything is
// drawn on the canvas in code; there are no image assets.

const MAX_PARTICLES = 900;

export class Effects {
  constructor(rng, width, height) {
    this.rng = rng;
    this.width = width;
    this.height = height;
    this.particles = [];
    this.texts = [];
    this.rain = [];
    this.trauma = 0;
    this.flash = 0; // lightning brightness 0..1
    this.bolt = null; // current lightning polyline
    this.strikeMarks = []; // telegraphed strike circles {x,y,t,ttl}
    this.time = 0;
    for (let i = 0; i < 130; i++) {
      this.rain.push({
        x: rng.range(0, width),
        y: rng.range(0, height),
        speed: rng.range(620, 900),
        len: rng.range(12, 26),
      });
    }
  }

  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  offset() {
    const s = this.trauma * this.trauma * 16;
    return {
      x: this.rng.range(-s, s),
      y: this.rng.range(-s, s),
    };
  }

  burst(x, y, { count = 12, color = '#ffd98a', speed = 220, life = 0.5, size = 3, gravity = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) return;
      const a = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(speed * 0.25, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: this.rng.range(life * 0.5, life),
        ttl: life,
        size: this.rng.range(size * 0.5, size * 1.4),
        color, gravity,
        drag: 2.2,
      });
    }
  }

  spray(x, y, count = 8) {
    this.burst(x, y, { count, color: '#bfefff', speed: 170, life: 0.45, size: 2.6, gravity: 260 });
  }

  embers(x, y, count = 10) {
    this.burst(x, y, { count, color: '#ff9a3c', speed: 120, life: 0.9, size: 2.4, gravity: -60 });
  }

  text(x, y, label, color = '#ffe9b0', size = 17) {
    this.texts.push({ x, y, label, color, size, life: 0.95, ttl: 0.95 });
  }

  lightningStrike(x, y) {
    // A jagged bolt from the top of the screen to the strike point.
    const pts = [{ x: x + this.rng.range(-90, 90), y: -10 }];
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      pts.push({
        x: pts[0].x + (x - pts[0].x) * (i / steps) + this.rng.range(-26, 26),
        y: (y * i) / steps,
      });
    }
    pts.push({ x, y });
    this.bolt = { pts, life: 0.16 };
    this.flash = 1;
    this.burst(x, y, { count: 22, color: '#cfe8ff', speed: 320, life: 0.4, size: 3 });
  }

  warnStrike(x, y, ttl = 0.9) {
    this.strikeMarks.push({ x, y, t: 0, ttl });
  }

  update(dt) {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (this.bolt) {
      this.bolt.life -= dt;
      if (this.bolt.life <= 0) this.bolt = null;
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += (p.gravity || 0) * dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * 0.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 34 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const s of this.strikeMarks) s.t += dt;
    this.strikeMarks = this.strikeMarks.filter((s) => s.t < s.ttl);
    for (const r of this.rain) {
      r.y += r.speed * dt;
      r.x -= r.speed * 0.22 * dt;
      if (r.y > this.height + 30) {
        r.y = -30;
        r.x = this.rng.range(0, this.width + 120);
      }
      if (r.x < -30) r.x = this.width + 20;
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.ttl);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawRain(ctx) {
    ctx.strokeStyle = 'rgba(174, 214, 241, 0.34)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const r of this.rain) {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - r.len * 0.22, r.y + r.len);
    }
    ctx.stroke();
  }

  drawStrikeWarnings(ctx) {
    for (const s of this.strikeMarks) {
      const p = s.t / s.ttl;
      ctx.strokeStyle = `rgba(255, 92, 92, ${0.35 + p * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 46 - p * 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawLightning(ctx) {
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(214, 234, 255, ${this.flash * 0.28})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.bolt) {
      ctx.save();
      ctx.strokeStyle = 'rgba(230, 244, 255, 0.95)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#9fd0ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      this.bolt.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.ttl);
      ctx.font = `700 ${t.size}px system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.label, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
