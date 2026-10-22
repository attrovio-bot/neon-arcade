/**
 * FIRENZE: LAST LIGHT — one city, three sieges.
 *
 * The city map is shared by every scenario and every save. A scenario only
 * changes where the horde gathers, how large it is and which banners fly over
 * the gates. Buildings, troops and stores belong to Florence itself.
 *
 * Pure data: no Three.js, no DOM. `sim.js` consumes it, `world.js` styles it.
 */

export const START = { food: 240, materials: 420, energy: 70, biomass: 24 };
export const START_CITIZENS = 10;
export const NEST_MAX = 7;
export const NEST_RESPAWN = 15;
export const MAX_BUILDING_LEVEL = 3;

/** The city is deliberately identical in every scenario. */
export const CITY_BOUNDS = { minX: -11.5, maxX: 11.5, minZ: -12.5, maxZ: 10.5 };

export const CITY_NODES = [
  // A handful of holdouts survived the first night.
  { id: 'barracks1', kind: 'barracks', x: -5.4, z: -0.2, standing: true },
  { id: 'farm1', kind: 'farm', x: -5.2, z: 6.5, standing: true },
  { id: 'house1', kind: 'house', x: -7.8, z: 2.6, standing: true },
  { id: 'quarry1', kind: 'quarry', x: 7.8, z: 2.6 },
  { id: 'clinic1', kind: 'clinic', x: 5.2, z: 6.5 },
  { id: 'market1', kind: 'market', x: 5.4, z: -0.4 },
  { id: 'workshop1', kind: 'workshop', x: -7.4, z: -5.4 },
  { id: 'stable1', kind: 'stable', x: 7.4, z: -5.4 },
  { id: 'armory1', kind: 'armory', x: 0, z: 7.4 },
  { id: 'tower1', kind: 'tower', x: -2.8, z: -5.6 },
  { id: 'tower2', kind: 'tower', x: 2.8, z: -5.6 },

  // Empty lots where a new Florence can be raised.
  { id: 'plot1', kind: 'plot', x: -9.5, z: 6.2 },
  { id: 'plot2', kind: 'plot', x: 9.5, z: 6.2 },
  { id: 'plot3', kind: 'plot', x: -10, z: -1.8 },
  { id: 'plot4', kind: 'plot', x: 10, z: -1.8 },
  { id: 'plot5', kind: 'plot', x: -9.1, z: -8.5 },
  { id: 'plot6', kind: 'plot', x: 9.1, z: -8.5 },
  { id: 'plot7', kind: 'plot', x: -3.8, z: -9.4 },
  { id: 'plot8', kind: 'plot', x: 3.8, z: -9.4 },
  { id: 'plot9', kind: 'plot', x: -7.5, z: -9.4 },
  { id: 'plot10', kind: 'plot', x: 7.5, z: -9.4 },
  { id: 'plot11', kind: 'plot', x: 0, z: -2.4 },
  { id: 'plot12', kind: 'plot', x: 0, z: 10 },
];

export const BUILDINGS = {
  house: {
    label: 'House',
    it: 'Casa',
    cost: { materials: 55, food: 20 },
    time: 5,
    hp: 240,
    staff: 0,
    cap: 5,
    upgradeCosts: [{ materials: 80, food: 30 }, { materials: 130, food: 55 }],
    upgradeTime: [7, 10],
    blurb: '+5 shelter. Each level houses three more Florentines.',
  },
  farm: {
    label: 'Farm',
    it: 'Podere',
    cost: { materials: 55, food: 12 },
    time: 6,
    hp: 260,
    staff: 2,
    rate: { food: 0.7 },
    upgradeCosts: [{ materials: 85, food: 25 }, { materials: 140, food: 45 }],
    upgradeTime: [8, 11],
    blurb: 'Feeds the city. Two contadini work the rows.',
  },
  quarry: {
    label: 'Quarry',
    it: 'Cava',
    cost: { materials: 45 },
    time: 6,
    hp: 260,
    staff: 2,
    rate: { materials: 0.55 },
    upgradeCosts: [{ materials: 75 }, { materials: 125 }],
    upgradeTime: [8, 11],
    blurb: 'Cuts pietra serena from the ruins. Two cavatori.',
  },
  furnace: {
    label: 'Lime Kiln',
    it: 'Fornace',
    cost: { materials: 70, energy: 15 },
    time: 7,
    hp: 280,
    staff: 2,
    rate: { energy: 0.65 },
    burn: 0.12,
    upgradeCosts: [{ materials: 110, energy: 30 }, { materials: 170, energy: 55 }],
    upgradeTime: [9, 12],
    blurb: 'Burns infected matter into lamp oil and heat. Two workers.',
  },
  clinic: {
    label: 'Spezieria',
    it: 'Spezieria',
    cost: { materials: 75, energy: 22 },
    time: 8,
    hp: 280,
    staff: 2,
    upgradeCosts: [{ materials: 115, energy: 40 }, { materials: 180, energy: 70 }],
    upgradeTime: [9, 13],
    blurb: 'Cures the infected instead of killing them. Two speziali.',
  },
  barracks: {
    label: 'Barracks',
    it: 'Caserma',
    cost: { materials: 70, food: 30 },
    time: 8,
    hp: 340,
    staff: 0,
    armyCap: 60,
    upgradeCosts: [{ materials: 120, food: 55 }, { materials: 190, food: 90, energy: 30 }],
    upgradeTime: [10, 14],
    blurb: 'Houses and drills the city levy. Every level adds 50 army space.',
  },
  stable: {
    label: 'Stables',
    it: 'Scuderia',
    cost: { materials: 80, food: 35 },
    time: 9,
    hp: 320,
    staff: 1,
    armyCap: 20,
    upgradeCosts: [{ materials: 130, food: 60 }, { materials: 210, food: 100, energy: 30 }],
    upgradeTime: [11, 15],
    blurb: 'Raises warhorses and unlocks Cavalieri. One stablehand.',
  },
  armory: {
    label: 'Armory',
    it: 'Armeria',
    cost: { materials: 85, energy: 25 },
    time: 9,
    hp: 300,
    staff: 1,
    upgradeCosts: [{ materials: 130, energy: 45 }, { materials: 210, energy: 80 }],
    upgradeTime: [10, 14],
    blurb: 'Fits harness and hones blades. Each level hardens the whole army.',
  },
  market: {
    label: 'Mercato',
    it: 'Mercato',
    cost: { materials: 60, food: 15 },
    time: 7,
    hp: 250,
    staff: 1,
    upgradeCosts: [{ materials: 95, food: 35 }, { materials: 155, food: 65 }],
    upgradeTime: [8, 12],
    blurb: 'Exchange goods, receive caravans and open trade routes.',
  },
  workshop: {
    label: 'Bottega',
    it: 'Bottega',
    cost: { materials: 70, energy: 18 },
    time: 8,
    hp: 250,
    staff: 1,
    upgradeCosts: [{ materials: 110, energy: 35 }, { materials: 175, energy: 65 }],
    upgradeTime: [9, 13],
    blurb: 'Crafts gear and unlocks Balestrieri. One master.',
  },
  tower: {
    label: 'Watchtower',
    it: 'Torre',
    cost: { materials: 60, energy: 15 },
    time: 6,
    hp: 380,
    staff: 0,
    tower: true,
    range: 9,
    damage: 16,
    every: 1.1,
    upgradeCosts: [{ materials: 100, energy: 30 }, { materials: 165, energy: 55 }],
    upgradeTime: [8, 12],
    blurb: 'Shoots the horde without needing a garrison.',
  },
};

export const TOWER = BUILDINGS.tower;

export const PLOT_OPTIONS = [
  'house',
  'farm',
  'quarry',
  'furnace',
  'clinic',
  'barracks',
  'stable',
  'armory',
  'market',
  'workshop',
  'tower',
];

export const TROOPS = {
  levy: {
    label: 'Lancieri',
    en: 'Levy Spearmen',
    blurb: 'Cheap, stubborn spearmen. Hold a street and die slowly.',
    cost: { food: 8, materials: 3 },
    time: 0.22,
    space: 1,
    hp: 110,
    damage: 13,
    range: 0.82,
    speed: 2.35,
    every: 1.05,
    color: 0xc9d3dc,
  },
  crossbow: {
    label: 'Balestrieri',
    en: 'Crossbowmen',
    blurb: 'Fragile at close quarters, deadly across a piazza. Needs a Bottega.',
    cost: { food: 11, materials: 9, energy: 3 },
    time: 0.34,
    space: 1,
    hp: 78,
    damage: 17,
    range: 4.6,
    speed: 2.0,
    every: 1.35,
    color: 0xd8b36a,
    requires: 'workshop',
  },
  knight: {
    label: 'Cavalieri',
    en: 'Knights',
    blurb: 'Armoured shock troops. Fast, expensive, two army spaces each. Needs Stables.',
    cost: { food: 24, materials: 18, energy: 7 },
    time: 0.6,
    space: 2,
    hp: 240,
    damage: 34,
    range: 0.95,
    speed: 3.1,
    every: 1.0,
    color: 0x9c3f32,
    requires: 'stable',
  },
};

export const DEPLOY = {
  zoneShare: 0.62,
  barracksBonus: 8,
  barracksBonusMax: 72,
};

export const GEAR = {
  sword: {
    name: 'Lama del Bargello',
    desc: '+25% melee damage for Lancieri and Cavalieri.',
    cost: { materials: 85, energy: 25 },
  },
  crossbow: {
    name: 'Balestra da Banco',
    desc: '+30% crossbow damage and +1.2 range.',
    cost: { materials: 105, energy: 35 },
  },
  armor: {
    name: 'Piastre di Santa Maria',
    desc: '+25% health for every soldier.',
    cost: { materials: 95, energy: 30 },
  },
};

export const UPGRADES = {
  weapon: {
    name: 'Weapons',
    desc: '+12% army damage per rank.',
    costs: [
      { materials: 75, energy: 15 },
      { materials: 125, energy: 30 },
      { materials: 190, energy: 50 },
    ],
  },
  armor: {
    name: 'Harness',
    desc: '+12% army health per rank.',
    costs: [
      { materials: 65, energy: 15 },
      { materials: 115, energy: 30 },
      { materials: 175, energy: 50 },
    ],
  },
};

export const ROUTES = {
  tornabuoni: {
    name: 'Via Tornabuoni',
    desc: '+0.2 materials/s and +0.1 food/s.',
    cost: { materials: 90, energy: 25 },
  },
  mercato: {
    name: 'Mercato Nuovo',
    desc: '+0.25 energy/s.',
    cost: { materials: 125, energy: 40 },
  },
  prato: {
    name: 'Porta al Prato',
    desc: '+0.08 biomass/s.',
    cost: { materials: 100, biomass: 35 },
  },
};

export const CARAVANS = [
  { give: { food: 70 }, get: { materials: 65, energy: 15 }, label: 'Grain for stone' },
  { give: { materials: 60 }, get: { food: 75, biomass: 14 }, label: 'Stone for provisions' },
  { give: { biomass: 35 }, get: { materials: 70 }, label: 'Biomass for masonry' },
  { give: { energy: 40 }, get: { food: 80, materials: 25 }, label: 'Oil for supplies' },
  { give: { food: 50 }, get: { biomass: 40 }, label: 'Grain for specimens' },
];

export const EXCHANGE = [
  { give: { food: 40 }, get: { materials: 32 } },
  { give: { materials: 40 }, get: { food: 32 } },
  { give: { biomass: 25 }, get: { energy: 22 } },
  { give: { energy: 25 }, get: { biomass: 22 } },
];

export const WAVES = {
  nestFactor: [0.25, 0.42, 0.58],
  reward: { food: 55, materials: 65, energy: 30, biomass: 18 },
};

export const ZONES = [
  {
    id: 'north',
    name: 'Porta a Prato',
    x: 0,
    z: 9.2,
    blurb: 'The northern road. Open ground and the shortest march to the piazza.',
  },
  {
    id: 'west',
    name: 'Borgo Ognissanti',
    x: -10,
    z: 1.2,
    blurb: 'The western lanes. Tight streets, close to the workshops.',
  },
  {
    id: 'east',
    name: 'Santa Croce',
    x: 10,
    z: 1.2,
    blurb: 'The eastern quarter. A short march to the market and the south wall.',
  },
];

export const LEVELS = [
  {
    id: 'sanfrediano',
    order: 1,
    siege: 'Assedio I',
    name: 'Porta San Frediano',
    place: 'Firenze',
    coreKind: 'palazzo',
    coreName: 'Palazzo della Signoria',
    desc: 'The western gate has fallen. The dead gather in the borgo and the first horde is already in the lanes. Hold the piazza.',
    boss: 'Il Capitano Senza Volto',
    coreHp: 1500,
    waveBase: [26, 40, 58],
    scale: 1,
    seed: 5,
    bounds: CITY_BOUNDS,
    waveCap: [60, 90, 130],
    nests: [
      { id: 'nest1', x: -8.4, z: -10.4 },
      { id: 'nest2', x: -1.6, z: -11.2 },
      { id: 'nest3', x: 5.2, z: -10.8 },
      { id: 'nest4', x: 9.4, z: -6.4 },
    ],
  },
  {
    id: 'pontevecchio',
    order: 2,
    siege: 'Assedio II',
    name: 'Ponte Vecchio',
    place: 'Firenze',
    coreKind: 'palazzo',
    coreName: 'Palazzo della Signoria',
    desc: 'The Arno is black with bodies. The bridge is lost and the horde is splitting between the banks. Keep the centre alive.',
    boss: "La Bestia dell'Arno",
    coreHp: 1900,
    waveBase: [38, 56, 80],
    scale: 1.18,
    seed: 17,
    bounds: CITY_BOUNDS,
    waveCap: [80, 115, 160],
    nests: [
      { id: 'nest1', x: -9.4, z: 7.6 },
      { id: 'nest2', x: -8.8, z: -7.8 },
      { id: 'nest3', x: 0.2, z: -11.4 },
      { id: 'nest4', x: 9.2, z: -7.6 },
    ],
  },
  {
    id: 'duomo',
    order: 3,
    siege: 'Assedio III',
    name: 'Santa Maria del Fiore',
    place: 'Firenze',
    coreKind: 'palazzo',
    coreName: 'Palazzo della Signoria',
    desc: 'The crowned thing has come for the last light of Florence. Every quarter is burning. Every wall you raised will be tested.',
    boss: 'Il Re Coronato',
    coreHp: 2400,
    waveBase: [52, 76, 108],
    scale: 1.4,
    seed: 31,
    bounds: CITY_BOUNDS,
    waveCap: [100, 145, 200],
    nests: [
      { id: 'nest1', x: -9.6, z: 7.4 },
      { id: 'nest2', x: -9.8, z: -8.2 },
      { id: 'nest3', x: 0.2, z: -11.6 },
      { id: 'nest4', x: 9.8, z: -8.2 },
      { id: 'nest5', x: 9.4, z: 7.4 },
    ],
  },
];
