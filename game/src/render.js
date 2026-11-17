// All drawing: dusk backdrop, entities with glow, HUD, menus.
import { PALETTE as P, WORLD, PLAYER } from './config.js';

export function render(ctx, g, mouse) {
  const { W, H } = WORLD;
  ctx.save();
  if (g.shake > 0.3) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  // slight zoom-in for presence (centered)
  ctx.translate(W / 2, H / 2); ctx.scale(1.16, 1.16); ctx.translate(-W / 2, -H / 2);

  drawBackdrop(ctx, g);

  // pickups
  for (const pk of g.pickups) {
    ctx.fillStyle = P.xpBlue;
    ctx.shadowColor = P.xpBlue; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(pk.x, pk.y, 5 + Math.sin(pk.t * 0.15) * 1.5, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
  }
  // enemies
  for (const e of g.enemies) {
    const col = e.boss ? P.boss : (e.kind === 'runner' ? P.enemy2 : P.enemy1);
    ctx.fillStyle = e.hitT > 0 ? '#ffffff' : col;
    ctx.shadowColor = col; ctx.shadowBlur = e.boss ? 22 : 10;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    if (e.boss) { // crown spikes
      ctx.fillStyle = P.gold;
      for (let i = 0; i < 6; i++) { const a = e.phase * 0.02 + i * Math.PI / 3;
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * (e.r + 6), e.y + Math.sin(a) * (e.r + 6), 4, 0, 7); ctx.fill(); }
    }
    if (e.hp < e.maxHp) { // hp bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - e.r, e.y - e.r - 9, e.r * 2, 4);
      ctx.fillStyle = P.hpRed; ctx.fillRect(e.x - e.r, e.y - e.r - 9, e.r * 2 * (e.hp / e.maxHp), 4);
    }
  }
  // bolts — bright core + trail for visibility
  for (const b of g.bolts) {
    ctx.strokeStyle = 'rgba(255,140,66,0.45)'; ctx.lineWidth = b.r;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 4, b.y - b.vy * 4); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = P.gold; ctx.shadowColor = P.ember; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 1.5, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  // player
  const p = g.player;
  if (g.state !== 'gameover') {
    ctx.fillStyle = P.bone; ctx.shadowColor = P.ember; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    // staff points at cursor
    ctx.strokeStyle = P.ember; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.facing) * 20, p.y + Math.sin(p.facing) * 20); ctx.stroke();
    // cursor reticle
    ctx.strokeStyle = P.gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 10, 0, 7); ctx.stroke();
  }
  // particles + floating text — additive glow for juice
  ctx.globalCompositeOperation = 'lighter';
  for (const pt of g.particles) { ctx.globalAlpha = Math.min(1, pt.life / 20); ctx.fillStyle = pt.col; ctx.shadowColor = pt.col; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 7); ctx.fill(); }
  ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.font = 'bold 15px monospace';
  for (const t of g.texts) { ctx.globalAlpha = Math.min(1, t.t / 30); ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, t.y); }
  ctx.globalAlpha = 1;

  drawHud(ctx, g);
  ctx.restore();

  if (g.state === 'gameover') { drawGameOver(ctx, g); ctx.restore(); return; } // full occlusion
  if (g.state === 'upgrade') drawUpgrade(ctx, g);
  if (g.state === 'title') drawTitle(ctx, g);
  if (g.bannerT > 0 && g.state === 'playing') drawBanner(ctx, g);
}

function drawBackdrop(ctx, g) {
  const { W, H } = WORLD;
  const grd = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 620);
  grd.addColorStop(0, P.bg2); grd.addColorStop(1, P.bg0);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  // drifting embers
  ctx.fillStyle = P.ember;
  for (let i = 0; i < 26; i++) {
    const x = (i * 137 + g.frame * (0.2 + (i % 5) * 0.08)) % W;
    const y = (i * 211 + Math.sin((g.frame + i * 40) * 0.01) * 40 + i * 23) % H;
    ctx.globalAlpha = 0.25 + (i % 3) * 0.12;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // arena border
  ctx.strokeStyle = P.violet; ctx.lineWidth = 3; ctx.strokeRect(6, 6, W - 12, H - 12);
}

function drawHud(ctx, g) {
  if (g.state === 'title' || g.state === 'gameover') return;
  const p = g.player;
  ctx.fillStyle = 'rgba(26,15,30,0.85)'; ctx.fillRect(10, 10, 300, 66);
  ctx.strokeStyle = P.violet; ctx.strokeRect(10, 10, 300, 66);
  // hp
  ctx.fillStyle = P.hpRed; ctx.fillRect(20, 20, 200 * Math.max(0, p.hp / p.maxHp), 12);
  ctx.strokeStyle = P.bone; ctx.lineWidth = 1; ctx.strokeRect(20, 20, 200, 12);
  ctx.fillStyle = 'rgba(200,190,210,0.95)'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`HP ${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`, 228, 31);
  // xp
  ctx.fillStyle = P.xpBlue; ctx.fillRect(20, 40, 200 * (p.xp / p.xpNeed), 8);
  ctx.strokeRect(20, 40, 200, 8);
  ctx.fillText(`LV ${p.level}`, 228, 49);
  ctx.fillText(`WAVE ${g.wave}  SCORE ${g.score}  BEST ${g.best}`, 20, 66);
}

function centerCard(ctx, w, h) {
  const { W, H } = WORLD;
  const x = (W - w) / 2, y = (H - h) / 2;
  ctx.fillStyle = 'rgba(26,15,30,0.94)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = P.ember; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  return { x, y, w, h };
}

function drawTitle(ctx, g) {
  const { W, H } = WORLD;
  ctx.fillStyle = 'rgba(26,15,30,0.8)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = P.ember; ctx.font = 'bold 58px monospace';
  ctx.shadowColor = P.flame; ctx.shadowBlur = 24;
  ctx.fillText('EMBER VALE', W / 2, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = P.bone; ctx.font = '16px monospace';
  ctx.fillText('Survive the dusk. Blast the swarm. Choose your fire.', W / 2, 232);
  ctx.fillStyle = P.ash; ctx.font = '14px monospace';
  ctx.fillText('WASD / arrows — move    mouse — aim    hold click / space — cast', W / 2, 280);
  ctx.fillText('every 5th wave: an Ember Tyrant. level up: pick 1 of 3 gifts', W / 2, 306);
  ctx.fillStyle = P.gold; ctx.font = 'bold 22px monospace';
  const pulse = 0.7 + Math.sin(g.frame * 0.06) * 0.3;
  ctx.globalAlpha = pulse; ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', W / 2, 384);
  ctx.globalAlpha = 1;
  if (g.best > 0) { ctx.fillStyle = P.ash; ctx.font = '14px monospace'; ctx.fillText(`best score: ${g.best}`, W / 2, 430); }
}

function drawUpgrade(ctx, g) {
  const { W } = WORLD;
  ctx.fillStyle = 'rgba(26,15,30,0.75)'; ctx.fillRect(0, 0, WORLD.W, WORLD.H);
  ctx.textAlign = 'center';
  ctx.fillStyle = P.gold; ctx.font = 'bold 30px monospace';
  ctx.fillText(`LEVEL ${g.player.level} — CHOOSE YOUR GIFT`, W / 2, 150);
  g.upgradeChoices.forEach((u, i) => {
    const bw = 250, bh = 120, bx = W / 2 - (bw * 3 + 40) / 2 + i * (bw + 20), by = 210;
    const tint = { dmg: '#b04a2a', rate: '#a07020', speed: '#2a6a8a', hp: '#3a8a4a', multi: '#7b3fa0', pierce: '#8a6a2a' }[u.id] || P.bg1;
    ctx.fillStyle = tint; ctx.globalAlpha = 0.55; ctx.fillRect(bx, by, bw, bh); ctx.globalAlpha = 1;
    ctx.strokeStyle = P.ember; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = P.bone; ctx.font = 'bold 17px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[${i + 1}] ${u.name}`, bx + bw / 2, by + 42);
    ctx.fillStyle = '#d8ccd8'; ctx.font = '13px monospace';
    ctx.fillText(u.desc, bx + bw / 2, by + 72);
    ctx.textBaseline = 'alphabetic';
  });
  ctx.fillStyle = P.ash; ctx.font = '13px monospace';
  ctx.fillText('press 1, 2 or 3', W / 2, 352);
}

function drawGameOver(ctx, g) {
  const { W, H } = WORLD;
  ctx.fillStyle = 'rgba(20,11,24,0.97)'; ctx.fillRect(0, 0, W, H); // near-opaque: no bleed-through
  ctx.textAlign = 'center';
  const cy = H / 2;
  ctx.fillStyle = P.hpRed; ctx.font = 'bold 52px monospace';
  ctx.shadowColor = P.hpRed; ctx.shadowBlur = 18;
  ctx.fillText('THE VALE CLAIMS YOU', W / 2, cy - 90);
  ctx.shadowBlur = 0;
  ctx.fillStyle = P.bone; ctx.font = 'bold 26px monospace';
  ctx.fillText(`SCORE ${g.score}`, W / 2, cy - 30);
  ctx.fillStyle = P.ash; ctx.font = '16px monospace';
  ctx.fillText(`wave ${g.wave}   ·   kills ${g.stats.kills}   ·   level ${g.player.level}`, W / 2, cy + 6);
  if (g.score >= g.best && g.score > 0) {
    ctx.fillStyle = P.gold; ctx.font = 'bold 30px monospace';
    ctx.shadowColor = P.gold; ctx.shadowBlur = 20;
    const pulse = 0.8 + Math.sin(g.frame * 0.1) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillText('★ NEW BEST ★', W / 2, cy + 54);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  ctx.fillStyle = '#e8c060';
  ctx.globalAlpha = 0.65 + Math.sin(g.frame * 0.08) * 0.35;
  ctx.fillText('ENTER — rise again', W / 2, cy + 110);
  ctx.globalAlpha = 1;
}

function drawBanner(ctx, g) {
  const { W } = WORLD;
  ctx.textAlign = 'center';
  ctx.globalAlpha = Math.min(1, g.bannerT / 40);
  ctx.fillStyle = g.banner.includes('TYRANT') ? P.boss : P.gold;
  ctx.font = 'bold 34px monospace';
  ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 16;
  ctx.fillText(g.banner, W / 2, 110);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}
