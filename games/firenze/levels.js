/**
 * FIRENZE: LAST LIGHT — district data, building catalogue and balance knobs.
 * Pure data: no Three.js, no DOM. `sim.js` consumes it, `world.js` styles it.
 */

export const START = { food: 100, materials: 170, energy: 30, biomass: 10 };
export const START_CITIZENS = 6;
export const NEST_MAX = 6;
export const NEST_RESPAWN = 14;

export const BUILDINGS = {
  house: {
    label: 'House',
    it: 'Casa',
    cost: { materials: 40, food: 15 },
    time: 5,
    hp: 220,
    staff: 0,
    cap: 4,
    blurb: '+4 population. Cured survivors need somewhere to sleep.',
  },
  farm: {
    label: 'Farm',
    it: 'Fattoria',
    cost: { materials: 45, food: 10 },
    time: 6,
    hp: 240,
    staff: 2,
    rate: { food: 0.6 },
    blurb: 'Feeds the district. Two workers.',
  },
  quarry: {
    label: 'Quarry',
    it: 'Cava',
    cost: { materials: 40 },
    time: 6,
    hp: 240,
    staff: 2,
    rate: { materials: 0.44 },
    blurb: 'Cuts stone from the ruins. Two workers.',
  },
  furnace: {
    label: 'Biomass Furnace',
    it: 'Fornace',
    cost: { materials: 55, energy: 12 },
    time: 7,
    hp: 260,
    staff: 2,
    rate: { energy: 0.5 },
    burn: 0.1,
    blurb: 'Burns infected biomass into energy. Two workers.',
  },
  clinic: {
    label: 'Infirmary',
    it: 'Spezieria',
    cost: { materials: 60, energy: 20 },
    time: 8,
    hp: 260,
    staff: 2,
    blurb: 'Cures the infected into citizens and biomass. Two workers.',
  },
  barracks: {
    label: 'Barracks',
    it: 'Caserma',
    cost: { materials: 50, food: 20 },
    time: 7,
    hp: 300,
    staff: 0,
    militia: 2,
    blurb: 'Musters two militia who fight on their own.',
  },
  market: {
    label: 'Market',
    it: 'Mercato',
    cost: { materials: 55, food: 15 },
    time: 7,
    hp: 250,
    staff: 1,
    blurb: 'Exchange goods, receive caravans, open trade routes.',
  },
  workshop: {
    label: 'Workshop',
    it: 'Bottega',
    cost: { materials: 65, energy: 18 },
    time: 8,
    hp: 250,
    staff: 1,
    blurb: 'Craft weapons and train the militia.',
  },
  tower: {
    label: 'Watchtower',
    it: 'Torre',
    cost: { materials: 45, energy: 10 },
    time: 6,
    hp: 340,
    staff: 0,
    tower: true,
    range: 8,
    damage: 11,
    every: 1.15,
    blurb: 'Fires on the horde automatically.',
  },
};

export const TOWER = BUILDINGS.tower;

export const GEAR = {
  sword: {
    name: 'Neon Blade',
    desc: '+25% militia damage.',
    cost: { materials: 70, energy: 20 },
  },
  crossbow: {
    name: 'Arbalest',
    desc: 'Militia strike at range (3.2) and deal +10% damage.',
    cost: { materials: 90, energy: 30 },
  },
  armor: {
    name: 'Gilded Plate',
    desc: '+30% militia health.',
    cost: { materials: 80, energy: 25 },
  },
};

export const UPGRADES = {
  weapon: {
    name: 'Weapons',
    desc: '+12% militia damage per rank.',
    costs: [
      { materials: 60, energy: 10 },
      { materials: 100, energy: 20 },
      { materials: 150, energy: 30 },
    ],
  },
  armor: {
    name: 'Armor',
    desc: '+12% militia health per rank.',
    costs: [
      { materials: 50, energy: 10 },
      { materials: 90, energy: 20 },
      { materials: 140, energy: 30 },
    ],
  },
};

export const ROUTES = {
  tornabuoni: {
    name: 'Via Tornabuoni',
    desc: '+0.18 materials/s and +0.08 food/s.',
    cost: { materials: 80, energy: 20 },
  },
  mercato: {
    name: 'Mercato Nuovo',
    desc: '+0.22 energy/s.',
    cost: { materials: 110, energy: 35 },
  },
  prato: {
    name: 'Porta al Prato',
    desc: '+0.06 biomass/s.',
    cost: { materials: 90, biomass: 30 },
  },
};

export const CARAVANS = [
  { give: { food: 60 }, get: { materials: 55, energy: 12 }, label: 'Grain for stone' },
  { give: { materials: 50 }, get: { food: 65, biomass: 12 }, label: 'Stone for provisions' },
  { give: { biomass: 30 }, get: { materials: 60 }, label: 'Biomass for masonry' },
  { give: { energy: 35 }, get: { food: 70, materials: 20 }, label: 'Power for supplies' },
  { give: { food: 45 }, get: { biomass: 35 }, label: 'Grain for specimens' },
];

export const EXCHANGE = [
  { give: { food: 40 }, get: { materials: 30 } },
  { give: { materials: 40 }, get: { food: 30 } },
  { give: { biomass: 25 }, get: { energy: 20 } },
  { give: { energy: 25 }, get: { biomass: 20 } },
];

export const WAVES = {
  nestFactor: [0.2, 0.35, 0.5],
  reward: { food: 45, materials: 50, energy: 25, biomass: 16 },
};

const NODE = (id, kind, x, z, extra = {}) => ({ id, kind, x, z, ...extra });

export const LEVELS = [
  {
    id: 'oltrarno',
    order: 1,
    name: 'Oltrarno',
    place: 'Porta San Frediano',
    coreKind: 'porta',
    coreName: 'Porta San Frediano',
    desc: 'The river gate still stands. Rebuild the workshops behind it before the first horde finds the breach.',
    boss: 'Il Marchese Infetto',
    coreHp: 1200,
    waveBase: [6, 10, 14],
    scale: 1,
    seed: 3,
    bounds: { minX: -10.5, maxX: 10.5, minZ: -12.5, maxZ: 9.5 },
    nodes: [
      NODE('farm1', 'farm', -5.6, 3.2),
      NODE('quarry1', 'quarry', 5.6, 3.4),
      NODE('house1', 'house', -5.2, -0.6),
      NODE('clinic1', 'clinic', 5.2, -0.9),
      NODE('barracks1', 'barracks', -2.9, 5.6),
      NODE('tower1', 'tower', 2.9, 5.6),
      NODE('market1', 'market', 6.4, -5.2),
      NODE('workshop1', 'workshop', 1.2, -7.4),
      NODE('plot1', 'plot', -6.2, -4.6),
      NODE('plot2', 'plot', -0.4, -4.2),
    ],
    nests: [
      { id: 'nest1', x: -7.6, z: -8.4 },
      { id: 'nest2', x: 0, z: -10.2 },
      { id: 'nest3', x: 7.4, z: -8.2 },
    ],
  },
  {
    id: 'santacroce',
    order: 2,
    name: 'Santa Croce',
    place: 'Ponte Vecchio',
    coreKind: 'bridge',
    coreName: 'Ponte Vecchio',
    desc: 'The Arno runs black beneath the shops. Hold the bridge and keep both banks supplied.',
    boss: 'La Bestia del Ponte',
    coreHp: 1600,
    waveBase: [8, 13, 18],
    scale: 1.18,
    seed: 11,
    bounds: { minX: -11.5, maxX: 11.5, minZ: -14.5, maxZ: 10.5 },
    river: { z: -3, depth: 2.8 },
    nodes: [
      NODE('farm1', 'farm', -5.6, 6.2),
      NODE('farm2', 'farm', 5.4, -7.6),
      NODE('quarry1', 'quarry', 8.2, 3.6),
      NODE('quarry2', 'quarry', -8.2, -8.4),
      NODE('house1', 'house', -2.4, 5.8),
      NODE('house2', 'house', -4.6, -7.4),
      NODE('clinic1', 'clinic', 0.6, -9.4),
      NODE('barracks1', 'barracks', -7.8, 1.8),
      NODE('barracks2', 'barracks', 8.4, -10.2),
      NODE('market1', 'market', 7.4, 6.2),
      NODE('workshop1', 'workshop', 3, -11.2),
      NODE('tower1', 'tower', 0, 8.6),
      NODE('tower2', 'tower', -9.4, 6.4),
      NODE('tower3', 'tower', 9.6, 0.8),
      NODE('plot1', 'plot', 2.6, 6.4),
      NODE('plot2', 'plot', -6.2, -11),
    ],
    nests: [
      { id: 'nest1', x: -7.8, z: -12.6 },
      { id: 'nest2', x: 0.2, z: -12.4 },
      { id: 'nest3', x: 7.8, z: -12.8 },
    ],
  },
  {
    id: 'duomo',
    order: 3,
    name: 'Duomo',
    place: 'Santa Maria del Fiore',
    coreKind: 'duomo',
    coreName: 'Santa Maria del Fiore',
    desc: 'The last light of Florence. The crowned infected is coming for the dome, and it is bringing the city with it.',
    boss: 'Il Re Coronato',
    coreHp: 2200,
    waveBase: [10, 16, 22],
    scale: 1.4,
    seed: 29,
    bounds: { minX: -11.5, maxX: 11.5, minZ: -15.5, maxZ: 10.5 },
    nodes: [
      NODE('farm1', 'farm', -6.8, 7),
      NODE('farm2', 'farm', 6.8, 7.2),
      NODE('quarry1', 'quarry', -9, 2.2),
      NODE('quarry2', 'quarry', 9, 2.4),
      NODE('house1', 'house', -5.6, -1.4),
      NODE('house2', 'house', 5.8, -1.6),
      NODE('clinic1', 'clinic', -2.4, -8.2),
      NODE('barracks1', 'barracks', -8.4, -5.8),
      NODE('barracks2', 'barracks', 7, -8.8),
      NODE('market1', 'market', 8.6, -4.6),
      NODE('workshop1', 'workshop', 2.6, -8.6),
      NODE('tower1', 'tower', -4.3, 8),
      NODE('tower2', 'tower', 4.3, 8),
      NODE('tower3', 'tower', 0.2, -11.2),
      NODE('plot1', 'plot', -9, -9.6),
    ],
    nests: [
      { id: 'nest1', x: -6.8, z: -12.6 },
      { id: 'nest2', x: 0.2, z: -13.6 },
      { id: 'nest3', x: 7, z: -12.8 },
    ],
  },
];

export const PLOT_OPTIONS = ['farm', 'quarry', 'house'];
