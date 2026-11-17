// Boot loop: wires world, input, render, sfx; menu key handling.
import { WORLD } from './config.js';
import { Game } from './world.js';
import { Input } from './input.js';
import { render } from './render.js';
import { Sfx } from './audio.js';

const canvas = document.getElementById('game');
canvas.width = WORLD.W; canvas.height = WORLD.H;
const ctx = canvas.getContext('2d');
const g = new Game();
const input = new Input(canvas);
const sfxEnabled = { on: true };

let lastShotFrame = 0;
function playSfx(name) { if (sfxEnabled.on) { try { Sfx[name](); } catch { /* audio blocked before gesture */ } } }

function tick() {
  // menu transitions (edge-triggered)
  if (g.state === 'title' && (input.consume('Enter') || input.consume('Mouse'))) { g.startRun(); playSfx('wave'); }
  else if (g.state === 'gameover' && input.consume('Enter')) { g.startRun(); playSfx('wave'); }
  else if (g.state === 'upgrade') {
    for (const [key, idx] of [['Digit1', 0], ['Digit2', 1], ['Digit3', 2]]) {
      if (input.consume(key)) { g.chooseUpgrade(idx); playSfx('level'); }
    }
  }

  g.update(input.mouse.x, input.mouse.y, input);

  // action sfx keyed off state deltas
  if (g.state === 'playing') {
    if (g.player.cd === Math.max(4, Math.round(14 / g.player.rateMul)) && g.frame !== lastShotFrame) { playSfx('shoot'); lastShotFrame = g.frame; }
    if (g.player.hitCooldown !== g.frame) { /* hurt handled via shake below */ }
    if (g.shake > 8.2) playSfx('hurt');
    if (g.pickups.some(pk => pk.t === 0)) playSfx('xp');
  }
  if (g.bannerT === 119) { g.banner.includes('TYRANT') ? playSfx('boss') : playSfx('wave'); }
  if (g.state === 'gameover' && g.frame % 2 === 0 && g.stats.kills >= 0 && !g.overPlayed) { playSfx('over'); g.overPlayed = true; }
  if (g.state === 'playing') g.overPlayed = false;
  // kill sound: particles burst near dead enemies is implicit; use score jumps
  if (g.score !== tick.lastScore) { if (g.score > (tick.lastScore || 0)) playSfx('kill'); tick.lastScore = g.score; }

  render(ctx, g, input.mouse);
  input.endFrame();
  requestAnimationFrame(tick);
}
tick.lastScore = 0;
tick();

// debug hooks used by the screenshot harness
window.__game = g;
window.__errs = [];
addEventListener('error', (e) => window.__errs.push(String(e.message)));

// mute toggle
addEventListener('keydown', (e) => { if (e.code === 'KeyM') sfxEnabled.on = !sfxEnabled.on; });
