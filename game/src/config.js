// Ember Vale — dusk/ember palette and tuning constants.
export const PALETTE = {
  bg0: '#1a0f1e', bg1: '#241428', bg2: '#2e1a30',
  ember: '#ff8c42', flame: '#ff5c33', gold: '#ffc94d',
  bone: '#f2e9dc', ash: '#8a7a8f', violet: '#7b3fa0',
  hpGreen: '#6fce62', hpRed: '#d5433c', xpBlue: '#57b8ff',
  enemy1: '#c2447c', enemy2: '#4f8f6b', boss: '#b02e2e',
};

export const WORLD = { W: 960, H: 600 };

export const PLAYER = {
  speed: 3.2, r: 12, maxHp: 100, hpRegenPerWave: 5,
  fireCdFrames: 14, fireSpeed: 9, fireDmg: 12, fireR: 5,
  pickupRadius: 26,
};

export const WAVES = {
  baseCount: 5, perWave: 2, spawnGapFrames: 40,
  enemySpeedBase: 1.5, enemySpeedPerWave: 0.12,
  enemyHpBase: 24, enemyHpPerWave: 9,
  bossEvery: 5, bossHp: 420, bossSpeed: 1.1, bossR: 30, bossDmg: 24,
  enemyDmg: 10,
};

export const XP = { perEnemy: 4, perBoss: 40, curve: 25 };

export const UPGRADES = [
  { id: 'dmg', name: 'Ember Fury', desc: '+30% bolt damage' },
  { id: 'rate', name: 'Quick Hands', desc: '+20% cast speed' },
  { id: 'speed', name: 'Wind Stride', desc: '+18% move speed' },
  { id: 'hp', name: 'Vale Heart', desc: '+25 max HP, heal 25' },
  { id: 'multi', name: 'Split Bolt', desc: 'fire one extra bolt' },
  { id: 'pierce', name: 'Piercing Heat', desc: 'bolts pierce +1 enemy' },
];

export const SCREEN_SHAKE = { max: 9, decay: 0.86 };
