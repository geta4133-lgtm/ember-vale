// Game state: player, enemies, bolts, pickups, particles, waves, upgrades.
import { PALETTE as P, WORLD, PLAYER, WAVES, XP, UPGRADES, SCREEN_SHAKE } from './config.js';
import { makeRng, rand, pick } from './random.js';

export class Game {
  constructor(seed = Date.now() % 100000) {
    this.rng = makeRng(seed);
    this.reset();
  }
  reset() {
    this.player = { x: WORLD.W / 2, y: WORLD.H / 2, r: PLAYER.r, hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
      cd: 0, xp: 0, level: 1, xpNeed: XP.curve, dmgMul: 1, rateMul: 1, speedMul: 1, bolts: 1, pierce: 0, facing: 0 };
    this.enemies = []; this.bolts = []; this.pickups = []; this.particles = []; this.texts = [];
    this.wave = 0; this.score = 0; this.best = +(localStorage.getItem('emberValeBest') || 0);
    this.state = 'title'; this.shake = 0; this.frame = 0; this.spawnQueue = 0; this.spawnTimer = 0;
    this.upgradeChoices = []; this.pendingLevelUps = 0; this.waveTimer = 0; this.banner = ''; this.bannerT = 0;
    this.iFrames = 60;
    this.stats = { kills: 0, waves: 0 };
  }
  startRun() { this.reset(); this.state = 'playing'; this.nextWave(); }

  nextWave() {
    this.wave++;
    this.stats.waves = this.wave;
    const isBoss = this.wave % WAVES.bossEvery === 0;
    this.spawnQueue = isBoss ? 1 : WAVES.baseCount + this.wave * WAVES.perWave;
    this.spawnTimer = 0;
    this.banner = isBoss ? `WAVE ${this.wave} — EMBER TYRANT` : `WAVE ${this.wave}`;
    this.bannerT = 120;
    if (this.wave > 1) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5);
  }

  spawnEnemy() {
    const side = Math.floor(this.rng() * 4);
    const m = 30;
    const pos = side === 0 ? { x: rand(this.rng, 0, WORLD.W), y: -m }
      : side === 1 ? { x: WORLD.W + m, y: rand(this.rng, 0, WORLD.H) }
      : side === 2 ? { x: rand(this.rng, 0, WORLD.W), y: WORLD.H + m }
      : { x: -m, y: rand(this.rng, 0, WORLD.H) };
    const isBoss = this.wave % WAVES.bossEvery === 0;
    if (isBoss) {
      this.enemies.push({ ...pos, r: WAVES.bossR, hp: WAVES.bossHp + this.wave * 30, maxHp: WAVES.bossHp + this.wave * 30,
        speed: WAVES.bossSpeed, dmg: WAVES.bossDmg, boss: true, hitT: 0, phase: 0 });
    } else {
      const kind = this.rng() < 0.5 + this.wave * 0.03 ? 'runner' : 'walker';
      this.enemies.push({ ...pos, r: kind === 'runner' ? 10 : 13,
        hp: WAVES.enemyHpBase + this.wave * WAVES.enemyHpPerWave,
        maxHp: WAVES.enemyHpBase + this.wave * WAVES.enemyHpPerWave,
        speed: WAVES.enemySpeedBase + this.wave * WAVES.enemySpeedPerWave + (kind === 'runner' ? 0.9 : 0),
        dmg: WAVES.enemyDmg, kind, hitT: 0 });
    }
  }

  fire() {
    const p = this.player;
    p.cd = Math.max(4, Math.round(PLAYER.fireCdFrames / p.rateMul));
    const baseA = Math.atan2(this.aimY - p.y, this.aimX - p.x);
    for (let i = 0; i < p.bolts; i++) {
      const spread = (i - (p.bolts - 1) / 2) * 0.16;
      const a = baseA + spread;
      this.bolts.push({ x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16,
        vx: Math.cos(a) * PLAYER.fireSpeed, vy: Math.sin(a) * PLAYER.fireSpeed,
        r: PLAYER.fireR, dmg: PLAYER.fireDmg * p.dmgMul, pierce: p.pierce, hits: 0, life: 90 });
    }
    this.puff(p.x + Math.cos(baseA) * 18, p.y + Math.sin(baseA) * 18, P.ember, 4);
  }

  hitEnemy(e, b) {
    e.hp -= b.dmg; e.hitT = 6;
    this.puff(e.x, e.y, P.flame, 6);
    if (e.hp <= 0) {
      this.score += e.boss ? 500 : 25 * this.wave;
      this.stats.kills++;
      this.burst(e.x, e.y, e.boss ? P.boss : P.enemy1, e.boss ? 30 : 12);
      this.pickups.push({ x: e.x, y: e.y, r: 7, kind: 'xp', val: e.boss ? XP.perBoss : XP.perEnemy, t: 0 });
      if (e.boss) this.texts.push({ x: e.x, y: e.y - 20, txt: 'TYRANT FELLED!', t: 90, col: P.gold });
    }
  }

  gainXp(v) {
    const p = this.player;
    p.xp += v;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed; p.level++;
      p.xpNeed = Math.round(XP.curve * Math.pow(1.35, p.level - 1));
      this.pendingLevelUps++;
    }
    if (this.pendingLevelUps > 0 && this.state === 'playing') this.openUpgrades();
  }

  openUpgrades() {
    this.state = 'upgrade';
    const pool = [...UPGRADES];
    this.upgradeChoices = [];
    for (let i = 0; i < 3 && pool.length; i++) this.upgradeChoices.push(pool.splice(Math.floor(this.rng() * pool.length), 1)[0]);
  }

  chooseUpgrade(i) {
    const u = this.upgradeChoices[i]; const p = this.player;
    if (u) {
      if (u.id === 'dmg') p.dmgMul *= 1.3;
      if (u.id === 'rate') p.rateMul *= 1.2;
      if (u.id === 'speed') p.speedMul *= 1.18;
      if (u.id === 'hp') { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); }
      if (u.id === 'multi') p.bolts += 1;
      if (u.id === 'pierce') p.pierce += 1;
      this.pendingLevelUps--;
      this.texts.push({ x: p.x, y: p.y - 26, txt: u.name, t: 70, col: P.gold });
    }
    this.state = this.pendingLevelUps > 0 ? 'upgrade' : 'playing';
    if (this.state === 'upgrade') this.openUpgrades();
  }

  update(aimX, aimY, input) {
    this.frame++;
    this.aimX = aimX; this.aimY = aimY;
    if (this.bannerT > 0) this.bannerT--;
    this.shake *= SCREEN_SHAKE.decay;
    this.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.94; pt.vy *= 0.94; pt.life--; });
    this.particles = this.particles.filter(pt => pt.life > 0);
    this.texts.forEach(t => { t.y -= 0.5; t.t--; });
    this.texts = this.texts.filter(t => t.t > 0);
    if (this.state !== 'playing') return;

    const p = this.player;
    const ax = input.axis();
    p.x = Math.max(p.r, Math.min(WORLD.W - p.r, p.x + ax.dx * PLAYER.speed * p.speedMul));
    p.y = Math.max(p.r, Math.min(WORLD.H - p.r, p.y + ax.dy * PLAYER.speed * p.speedMul));
    p.facing = Math.atan2(aimY - p.y, aimX - p.x);

    p.cd--;
    if ((input.fireHeld() || input.consume('KeyJ')) && p.cd <= 0) this.fire();

    // spawns
    if (this.spawnQueue > 0) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0) { this.spawnEnemy(); this.spawnQueue--; this.spawnTimer = WAVES.spawnGapFrames; }
    }
    // enemies
    if (this.iFrames > 0) this.iFrames--;
    for (const e of this.enemies) {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      e.phase = (e.phase || 0) + 1;
      const wobble = e.kind === 'runner' ? Math.sin(e.phase * 0.2) * 0.6 : 0;
      e.x += Math.cos(a + wobble) * e.speed;
      e.y += Math.sin(a + wobble) * e.speed;
      if (e.hitT > 0) e.hitT--;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < e.r + p.r && this.iFrames <= 0) {
        p.hp -= e.dmg; this.shake = SCREEN_SHAKE.max; this.burst(p.x, p.y, P.hpRed, 10);
        const kb = 0.4; e.x -= Math.cos(a) * 14; e.y -= Math.sin(a) * 14;
        // brief invulnerability so swarms don't insta-kill
        this.iFrames = 45;
        if (p.hp <= 0) { this.die(); return; }
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    // bolts
    for (const b of this.bolts) {
      b.x += b.vx; b.y += b.vy; b.life--;
      for (const e of this.enemies) {
        if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
          this.hitEnemy(e, b);
          b.hits++;
          if (b.hits > b.pierce) b.life = 0;
          break;
        }
      }
    }
    this.bolts = this.bolts.filter(b => b.life > 0 && b.x > -20 && b.x < WORLD.W + 20 && b.y > -20 && b.y < WORLD.H + 20);
    // pickups
    for (const pk of this.pickups) {
      pk.t++;
      const d = Math.hypot(p.x - pk.x, p.y - pk.y);
      if (d < PLAYER.pickupRadius) {
        if (pk.kind === 'xp') this.gainXp(pk.val);
        pk.t = -1;
      } else if (d < 120) { pk.x += (p.x - pk.x) * 0.04; pk.y += (p.y - pk.y) * 0.04; }
    }
    this.pickups = this.pickups.filter(pk => pk.t >= 0);
    // wave clear
    if (this.spawnQueue === 0 && this.enemies.length === 0) this.nextWave();
  }

  die() {
    this.state = 'gameover';
    this.shake = SCREEN_SHAKE.max;
    this.burst(this.player.x, this.player.y, P.ember, 40);
    if (this.score > this.best) { this.best = this.score; localStorage.setItem('emberValeBest', String(this.best)); }
  }

  puff(x, y, col, n) {
    for (let i = 0; i < n; i++) this.particles.push({ x, y, vx: rand(this.rng, -2, 2), vy: rand(this.rng, -2, 2), life: 12 + this.rng() * 8, col, r: 2 + this.rng() * 2 });
  }
  burst(x, y, col, n) {
    for (let i = 0; i < n; i++) { const a = this.rng() * Math.PI * 2, s = rand(this.rng, 1, 5);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 16 + this.rng() * 14, col, r: 2 + this.rng() * 3 }); }
  }
}
