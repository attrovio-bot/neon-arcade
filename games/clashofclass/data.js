/**
 * CLASH OF CLASS — battlefield data.
 *
 * Attack-only: there is no home village and no training timer. Every level is a
 * hand-built 14x14 village (the same grid as the original home village) with
 * walls, storages, camps and defenses. Before each raid the player spends a
 * point budget on an army, then deploys it on the grass ring around the village.
 *
 * A building occupies one grid cell — walls too. Only walls block movement;
 * other buildings are targets, not obstacles. Walls never count toward the
 * destruction percentage, exactly like the original.
 */

export const GRID = 14;
export const OFFSET = 2;
export const FIELD = GRID + OFFSET * 2; // 18 x 18 with the deploy ring
export const BATTLE_TIME = 180;
export const MAX_UNITS = 240;
export const DEPLOY_REPEAT = 0.12;

/* ---------------------------------- units ---------------------------------- */

/**
 * Every cost is 5 points per housing space, so the economy reads like the
 * original: 5 for a Barbarian, 20 for a Wizard, 100 for a Dragon.
 */
export const UNITS = [
  {
    id: 'barbarian',
    name: 'Barbarian',
    cost: 5,
    hp: 120,
    dmg: 22,
    atk: 1.1,
    range: 0.7,
    speed: 1.7,
    air: false,
    pref: null,
    splash: 0,
    desc: 'Cheap, angry, melee. The bread of every raid.',
  },
  {
    id: 'archer',
    name: 'Archer',
    cost: 5,
    hp: 70,
    dmg: 15,
    atk: 1.0,
    range: 3.2,
    speed: 2.15,
    air: false,
    pref: null,
    splash: 0,
    desc: 'Ranged. Shoots over walls from safety.',
  },
  {
    id: 'goblin',
    name: 'Goblin',
    cost: 5,
    hp: 90,
    dmg: 18,
    atk: 1.0,
    range: 0.7,
    speed: 2.6,
    air: false,
    pref: 'resource',
    splash: 0,
    desc: 'Fast. Hunts mines, collectors and storages.',
  },
  {
    id: 'giant',
    name: 'Giant',
    cost: 25,
    hp: 950,
    dmg: 95,
    atk: 1.5,
    range: 0.85,
    speed: 1.1,
    air: false,
    pref: 'defense',
    splash: 0,
    desc: 'A walking wall. Targets defenses first.',
  },
  {
    id: 'wallbreaker',
    name: 'Wall Breaker',
    cost: 10,
    hp: 55,
    dmg: 260,
    atk: 1.2,
    range: 0.75,
    speed: 1.8,
    air: false,
    pref: 'wall',
    splash: 1.25,
    wallBonus: 8,
    explode: true,
    desc: 'Runs at the nearest wall and blows a hole in it.',
  },
  {
    id: 'balloon',
    name: 'Balloon',
    cost: 25,
    hp: 380,
    dmg: 130,
    atk: 1.5,
    range: 1.0,
    speed: 2.0,
    air: true,
    pref: 'defense',
    splash: 1.0,
    desc: 'Flying bomb. Ignores walls, bombs defenses.',
  },
  {
    id: 'wizard',
    name: 'Wizard',
    cost: 20,
    hp: 115,
    dmg: 34,
    atk: 1.4,
    range: 3.2,
    speed: 1.9,
    air: false,
    pref: null,
    splash: 0.95,
    desc: 'Ranged splash damage from a very silly hat.',
  },
  {
    id: 'healer',
    name: 'Healer',
    cost: 70,
    hp: 160,
    heal: 42,
    atk: 0.9,
    range: 3.0,
    speed: 2.0,
    air: false,
    pref: null,
    splash: 0,
    heals: true,
    desc: 'Heals nearby troops. Keeps the push alive.',
  },
  {
    id: 'dragon',
    name: 'Dragon',
    cost: 100,
    hp: 1500,
    dmg: 100,
    atk: 1.6,
    range: 2.5,
    speed: 1.8,
    air: true,
    pref: null,
    splash: 1.0,
    desc: 'Flying fortress. Splash breath, no walls.',
  },
  {
    id: 'pekka',
    name: 'P.E.K.K.A',
    cost: 125,
    hp: 3000,
    dmg: 340,
    atk: 1.8,
    range: 0.85,
    speed: 1.0,
    air: false,
    pref: null,
    splash: 0,
    desc: 'Slow, armoured, and absolutely devastating.',
  },
];

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((unit) => [unit.id, unit]));

/* -------------------------------- structures ------------------------------- */

export const STRUCTURES = {
  town_hall: { name: 'Town Hall', hp: 2200, kind: 'building' },
  gold_mine: { name: 'Gold Mine', hp: 380, kind: 'building', resource: true },
  elixir_collector: { name: 'Elixir Collector', hp: 380, kind: 'building', resource: true },
  gold_storage: { name: 'Gold Storage', hp: 720, kind: 'building', resource: true },
  elixir_storage: { name: 'Elixir Storage', hp: 720, kind: 'building', resource: true },
  army_camp: { name: 'Army Camp', hp: 450, kind: 'building' },
  laboratory: { name: 'Laboratory', hp: 720, kind: 'building' },
  wall: { name: 'Wall', hp: 320, kind: 'wall' },
};

export const DEFENSES = {
  cannon: {
    name: 'Cannon',
    hp: 560,
    dmg: 16,
    atk: 0.9,
    range: 3.6,
    layer: 'ground',
    splash: 0,
    shot: 'ball',
  },
  archer_tower: {
    name: 'Archer Tower',
    hp: 650,
    dmg: 12,
    atk: 0.85,
    range: 3.9,
    layer: 'both',
    splash: 0,
    shot: 'arrow',
  },
  mortar: {
    name: 'Mortar',
    hp: 520,
    dmg: 34,
    atk: 3.0,
    range: 9.5,
    minRange: 3.0,
    layer: 'ground',
    splash: 1.15,
    shot: 'shell',
  },
  wizard_tower: {
    name: 'Wizard Tower',
    hp: 720,
    dmg: 24,
    atk: 1.2,
    range: 3.8,
    layer: 'both',
    splash: 0.95,
    shot: 'bolt',
  },
  air_defense: {
    name: 'Air Defense',
    hp: 760,
    dmg: 44,
    atk: 0.75,
    range: 3.9,
    layer: 'air',
    splash: 0,
    shot: 'rocket',
  },
};

export const RESOURCE_TYPES = new Set([
  'gold_mine',
  'elixir_collector',
  'gold_storage',
  'elixir_storage',
]);

/* --------------------------------- themes ---------------------------------- */

export const THEMES = {
  grass: {
    sky: '#0b1209',
    grass: '#74b23c',
    grassDark: '#5d9630',
    grassLight: '#8cc857',
    tuft: '#4f8227',
    baseTint: 'rgba(30, 70, 18, 0.16)',
    zone: 'rgba(86, 158, 255, 0.16)',
    zoneLine: 'rgba(126, 190, 255, 0.55)',
  },
  sand: {
    sky: '#170f08',
    grass: '#c69754',
    grassDark: '#a97c41',
    grassLight: '#dcb474',
    tuft: '#8f6634',
    baseTint: 'rgba(90, 50, 10, 0.14)',
    zone: 'rgba(86, 158, 255, 0.15)',
    zoneLine: 'rgba(126, 190, 255, 0.5)',
  },
  snow: {
    sky: '#0b1016',
    grass: '#b8cdd6',
    grassDark: '#9cb4c0',
    grassLight: '#dbe9ef',
    tuft: '#8aa4b2',
    baseTint: 'rgba(30, 50, 80, 0.12)',
    zone: 'rgba(96, 164, 255, 0.17)',
    zoneLine: 'rgba(136, 196, 255, 0.6)',
  },
};

/* ---------------------------------- levels --------------------------------- */
/*
 * Map legend — one character per 14x14 cell:
 *   .  empty grass        #  wall              T  town hall
 *   C  cannon             A  archer tower      M  mortar
 *   W  wizard tower       D  air defense
 *   G  gold mine          E  elixir collector  S  gold storage
 *   U  elixir storage     B  army camp         R  laboratory
 */

export const LEVELS = [
  {
    id: 'valley',
    order: 1,
    name: 'Green Valley',
    tagline: 'A sleepy outpost behind a cracked ring of walls.',
    theme: 'grass',
    budget: 500,
    winPct: 50,
    hpScale: 0.8,
    power: 0.75,
    map: [
      '..............',
      '.G...B..B...E.',
      '..####..####..',
      '..#C......A#..',
      '..#.S....U.#..',
      '..#........#..',
      '..#...T....#..',
      '..#........#..',
      '..#.U....S.#..',
      '..#A......C#..',
      '..####..####..',
      '.G...........E',
      '..B........B..',
      '..............',
    ],
  },
  {
    id: 'mesa',
    order: 2,
    name: 'Amber Mesa',
    tagline: 'Two rings, a mortar on the ridge and a wizard in the dust.',
    theme: 'sand',
    budget: 750,
    winPct: 60,
    hpScale: 1.0,
    power: 1.0,
    map: [
      '.G..B....B..E.',
      '.#####..#####.',
      '.#..A....A..#.',
      '.#C........C#.',
      '.#..##..##..#.',
      '.#..#S..U#..#.',
      '.#..#.TR.#..#.',
      '.#..#U..S#..#.',
      '.#..######..#.',
      '.#M........W#.',
      '.#..B....B..#.',
      '.#####..#####.',
      '..G........E..',
      '..............',
    ],
  },
  {
    id: 'peak',
    order: 3,
    name: 'Frost Peak',
    tagline: 'Full fortress: mortars, wizard towers and an air defense on the ice.',
    theme: 'snow',
    budget: 1000,
    winPct: 70,
    hpScale: 1.15,
    power: 1.15,
    map: [
      '.G...B..B...E.',
      '.#####..#####.',
      '.#..C...A...#.',
      '.#D........W#.',
      'G#..##..##..#E',
      '.#..#S..U#..#.',
      '.#A.#.TR.#.A#.',
      '.#..#U..S#..#.',
      '.#..######..#.',
      'G#M........M#E',
      '.#..C....C..#.',
      '.#####..#####.',
      '..G.B....B.E..',
      '.B..........B.',
    ],
  },
];

export const LEVEL_BY_ORDER = Object.fromEntries(LEVELS.map((level) => [level.order, level]));

/** Turn a map cell into the structure key it stands for. */
export const CELL_TYPES = {
  '#': 'wall',
  T: 'town_hall',
  C: 'cannon',
  A: 'archer_tower',
  M: 'mortar',
  W: 'wizard_tower',
  D: 'air_defense',
  G: 'gold_mine',
  E: 'elixir_collector',
  S: 'gold_storage',
  U: 'elixir_storage',
  B: 'army_camp',
  R: 'laboratory',
};
