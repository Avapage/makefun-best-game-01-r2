// world.js — the Drowning Sea itself: a deep indigo swell that rolls
// under everything, drifting foam flecks, two drowned rock spires, and
// the darkness the lantern fights. The light pass draws a night overlay
// with a warm hole around the player's lantern (and smaller holes around
// the boss's burning eyes and live pickups), so the storm reads as night
// and the hero reads as the one light on the water.

export class World {
  constructor(rng, width, height) {
    this.width = width;
    this.height = height;
    this.foam = [];
    for (let i = 0; i < 90; i++) {
      this.foam.push({
        x: rng.range(0, width),
        y: rng.range(0, height),
        r: rng.range(6, 26),
        drift: rng.range(4, 14),
        phase: rng.range(0, Math.PI * 2),
      });
    }
    this.rocks = [
      { x: width * 0.13, y: height * 0.24, s: 1.1 },
      { x: width * 0.88, y: height * 0.72, s: 1.35 },
      { x: width * 0.8, y: height * 0.13, s: 0.7 },
    ];
  }

  drawSea(ctx, t) {
    const { width: w, height: h } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a1a33');
    grad.addColorStop(0.55, '#0d2440');
    grad.addColorStop(1, '#081426');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Rolling swell bands.
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const yBase = (i / 7) * h + Math.sin(t * 0.35 + i * 1.7) * 14;
      ctx.strokeStyle = `rgba(64, 130, 180, ${0.10 + (i % 3) * 0.03})`;
      ctx.lineWidth = 16 + (i % 3) * 9;
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 28) {
        const y = yBase + Math.sin(x * 0.008 + t * 0.7 + i * 2.2) * 16;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Foam flecks drifting on the swell.
    for (const f of this.foam) {
      const x = (f.x + t * f.drift) % (w + 40) - 20;
      const y = f.y + Math.sin(t * 0.8 + f.phase) * 6;
      ctx.fillStyle = 'rgba(190, 230, 250, 0.10)';
      ctx.beginPath();
      ctx.ellipse(x, y, f.r, f.r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drowned rock spires.
    for (const rock of this.rocks) this.drawRock(ctx, rock, t);
  }

  drawRock(ctx, rock, t) {
    const { x, y, s } = rock;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#0d2033';
    ctx.strokeStyle = 'rgba(140, 200, 235, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-42, 18);
    ctx.lineTo(-24, -12);
    ctx.lineTo(-14, -30);
    ctx.lineTo(-4, -47);
    ctx.lineTo(5, -22);
    ctx.lineTo(15, -33);
    ctx.lineTo(26, -6);
    ctx.lineTo(40, 16);
    ctx.lineTo(14, 23);
    ctx.lineTo(-18, 21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Lit facet down the main spire.
    ctx.strokeStyle = 'rgba(190, 225, 250, 0.28)';
    ctx.beginPath();
    ctx.moveTo(-4, -44);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-8, 14);
    ctx.stroke();
    // Foam lapping the base: two broken arcs, never a closed ring.
    ctx.strokeStyle = `rgba(210, 240, 255, ${0.3 + Math.sin(t * 2 + x) * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(0, 21, 46, 9, 0, Math.PI * 0.12, Math.PI * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(2, 22, 34, 7, 0, Math.PI * 1.15, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
  }

  // A flat night wash over the scene; the warm glows below are laid back
  // over it additively, so lit things bloom out of the dark.
  drawDarkness(ctx, alpha = 0.34) {
    ctx.fillStyle = `rgba(3, 8, 20, ${alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  // Warm glows laid over the night (additive), one per light source.
  drawGlow(ctx, x, y, r, inner = 'rgba(255, 190, 92, 0.30)') {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, 'rgba(255, 160, 70, 0.12)');
    g.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  drawVignette(ctx) {
    const { width: w, height: h } = this;
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, h * 0.95);
    g.addColorStop(0, 'rgba(2, 6, 14, 0)');
    g.addColorStop(1, 'rgba(2, 6, 14, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}
