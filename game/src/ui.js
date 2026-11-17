// ui.js — everything the player reads: the HUD (score, best, wave,
// lantern-hull bar, combo, power-up timers, boss bar), the title screen,
// wave banners, the pause veil, and the wrecked / victory results screens
// with their stats and restart prompts.

const TITLE_FONT = 'Georgia, "Times New Roman", serif';

export function drawHud(ctx, game) {
  const { width: w } = game;
  const p = game.player;
  ctx.save();
  // Top-left: score block.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(4, 12, 24, 0.55)';
  roundRect(ctx, 14, 12, 252, 74, 10);
  ctx.fill();
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(`SCORE ${game.score.toLocaleString('en-US')}`, 28, 46);
  ctx.fillStyle = '#9fc6dd';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText(`BEST ${game.best.toLocaleString('en-US')}`, 28, 70);
  if (game.combo > 1) {
    ctx.fillStyle = '#ffb03a';
    ctx.font = '800 19px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`COMBO x${game.combo}`, 252, 70);
  }

  // Top-centre: wave.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(4, 12, 24, 0.55)';
  roundRect(ctx, w / 2 - 92, 12, 184, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '700 21px system-ui, sans-serif';
  ctx.fillText(game.director.boss && game.enemies.includes(game.director.boss) ? 'STORM SURGE' : `WAVE ${game.director.wave} / 10`, w / 2, 41);

  // Top-right: power-up timers.
  ctx.textAlign = 'right';
  let ty = 34;
  if (p.triTimer > 0) {
    ctx.fillStyle = '#5ee8ff';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(`TRI-FLARE ${p.triTimer.toFixed(0)}s`, w - 26, ty);
    ty += 22;
  }
  if (p.shielded) {
    ctx.fillStyle = '#7ec3ff';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(`AEGIS ${p.shieldTimer.toFixed(0)}s`, w - 26, ty);
    ty += 22;
  }
  ctx.fillStyle = 'rgba(230, 244, 255, 0.65)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(game.muted ? 'M — SOUND OFF' : 'P PAUSE · M MUTE', w - 26, ty + 2);

  // Bottom-left: hull bar with a lantern flame cap.
  const bw = 264;
  const frac = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = 'rgba(4, 12, 24, 0.55)';
  roundRect(ctx, 14, game.height - 52, bw + 52, 38, 10);
  ctx.fill();
  ctx.fillStyle = '#2b1408';
  roundRect(ctx, 24, game.height - 40, bw, 14, 7);
  ctx.fill();
  const grad = ctx.createLinearGradient(24, 0, 24 + bw, 0);
  grad.addColorStop(0, '#ff5340');
  grad.addColorStop(0.5, '#ff9a3c');
  grad.addColorStop(1, '#ffd94f');
  ctx.fillStyle = grad;
  if (frac > 0) {
    roundRect(ctx, 24, game.height - 40, bw * frac, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HULL ${Math.ceil(p.hp)}`, 24 + bw + 8, game.height - 28);

  // Boss bar, bottom-centre.
  const boss = game.director.boss;
  if (boss && !boss.dead && game.enemies.includes(boss)) {
    const bw2 = 460;
    const bf = Math.max(0, boss.hp / boss.maxHp);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb0a0';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText('THE GALE MOTHER', w / 2, game.height - 62);
    ctx.fillStyle = 'rgba(4, 12, 24, 0.6)';
    roundRect(ctx, w / 2 - bw2 / 2, game.height - 54, bw2, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#c93b2e';
    if (bf > 0) {
      roundRect(ctx, w / 2 - bw2 / 2, game.height - 54, bw2 * bf, 16, 8);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawBanner(ctx, game) {
  if (!game.banner) return;
  const b = game.banner;
  const p = Math.min(1, b.t / 0.35) * Math.min(1, (b.ttl - b.t) / 0.5 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, p));
  ctx.textAlign = 'center';
  ctx.fillStyle = b.color;
  ctx.font = `800 ${b.size}px ${TITLE_FONT}`;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 16;
  ctx.fillText(b.title, game.width / 2, game.height * 0.34);
  if (b.sub) {
    ctx.fillStyle = '#dcefff';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText(b.sub, game.width / 2, game.height * 0.34 + 36);
  }
  ctx.restore();
}

export function drawTitle(ctx, game, t) {
  const { width: w, height: h } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(3, 8, 18, 0.42)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  // Eyebrow.
  ctx.fillStyle = '#7fd4c9';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText('O N E   L I G H T   O N   T H E   D R O W N I N G   S E A', w / 2, h * 0.24);
  // Title.
  ctx.font = `800 96px ${TITLE_FONT}`;
  ctx.shadowColor = 'rgba(255, 170, 60, 0.55)';
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#ffd98a';
  ctx.fillText('STORMWAKE', w / 2, h * 0.40);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eaf6ff';
  ctx.font = `italic 600 25px ${TITLE_FONT}`;
  ctx.fillText('Keep the lantern lit. Outlast ten waves. Calm the Gale Mother.', w / 2, h * 0.465);
  // How to play card.
  ctx.fillStyle = 'rgba(5, 14, 26, 0.72)';
  roundRect(ctx, w / 2 - 305, h * 0.52, 610, 118, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(127, 212, 201, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, w / 2 - 305, h * 0.52, 610, 118, 14);
  ctx.stroke();
  ctx.fillStyle = '#dcefff';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText('WASD / Arrows — sail      Mouse — aim      Hold click / Space — fire flares', w / 2, h * 0.52 + 38);
  ctx.fillText('Gather sunshards and gifts of the sea. Beware her lightning.', w / 2, h * 0.52 + 66);
  ctx.fillStyle = '#ffb03a';
  ctx.fillText('Wraiths hunt in packs · Hulks charge · Spitters spit venom · She rises at waves 5 and 10', w / 2, h * 0.52 + 94);
  // Start prompt.
  const pulse = 0.65 + Math.sin(t * 3.4) * 0.35;
  ctx.fillStyle = `rgba(255, 233, 176, ${pulse})`;
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO SET SAIL', w / 2, h * 0.76);
  ctx.fillStyle = '#9fc6dd';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`BEST SCORE ${game.best.toLocaleString('en-US')}`, w / 2, h * 0.815);
  ctx.restore();
}

export function drawPause(ctx, game) {
  const { width: w, height: h } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(3, 8, 18, 0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = `800 54px ${TITLE_FONT}`;
  ctx.fillText('BECALMED', w / 2, h * 0.44);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = '#9fc6dd';
  ctx.fillText('The storm waits. Press P or Esc to sail on.', w / 2, h * 0.52);
  ctx.restore();
}

export function drawEndScreen(ctx, game, victory) {
  const { width: w, height: h } = game;
  ctx.save();
  ctx.fillStyle = victory ? 'rgba(6, 16, 10, 0.55)' : 'rgba(16, 5, 5, 0.58)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = `800 74px ${TITLE_FONT}`;
  ctx.shadowBlur = 26;
  if (victory) {
    ctx.fillStyle = '#ffe9a8';
    ctx.shadowColor = 'rgba(255, 200, 80, 0.6)';
    ctx.fillText('THE SEA CALMS', w / 2, h * 0.33);
  } else {
    ctx.fillStyle = '#ff8a76';
    ctx.shadowColor = 'rgba(255, 70, 40, 0.55)';
    ctx.fillText('THE LIGHT GOES OUT', w / 2, h * 0.33);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eaf6ff';
  ctx.font = `italic 600 23px ${TITLE_FONT}`;
  ctx.fillText(
    victory ? 'The Gale Mother sinks, singing, and the dawn comes up gold.' : 'The lantern sinks beneath the swell. The sea keeps what it takes.',
    w / 2, h * 0.395,
  );
  // Stats card.
  ctx.fillStyle = 'rgba(5, 14, 26, 0.78)';
  roundRect(ctx, w / 2 - 240, h * 0.45, 480, 168, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 217, 138, 0.35)';
  roundRect(ctx, w / 2 - 240, h * 0.45, 480, 168, 14);
  ctx.stroke();
  const rows = [
    ['FINAL SCORE', game.score.toLocaleString('en-US')],
    ['WAVES SURVIVED', `${victory ? 10 : game.director.wave} / 10`],
    ['FOES BANISHED', `${game.kills}`],
    ['TIME AT SEA', formatTime(game.elapsed)],
    ['BEST SCORE', game.best.toLocaleString('en-US')],
  ];
  ctx.font = '600 18px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = h * 0.45 + 36 + i * 27;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fc6dd';
    ctx.fillText(label, w / 2 - 205, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(value, w / 2 + 205, y);
    ctx.font = '600 18px system-ui, sans-serif';
  });
  const pulse = 0.65 + Math.sin(game.endT * 3.4) * 0.35;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(255, 233, 176, ${pulse})`;
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO SAIL AGAIN', w / 2, h * 0.45 + 218);
  ctx.restore();
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
