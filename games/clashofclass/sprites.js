/**
 * CLASH OF CLASS — original pixel art, drawn procedurally.
 *
 * Nothing here is ripped from anywhere: every sprite is a small canvas painted
 * from rectangles and polygons at build-free runtime, then blitted scaled with
 * nearest-neighbour sampling. The palette is deliberately cartoon-medieval:
 * warm stone, gold, elixir violet and grass green.
 *
 * Units are painted in two frames (legs mid-stride / legs together, wings up /
 * down, fuse spark lit / blazing) so the renderer can animate them by simply
 * alternating frames — no tweening, pure pixel-art flipbook.
 */

export const BUILDING_SIZE = 32;
export const UNIT_SIZE = 24;
export const WALL_SIZE = 16;

const C = {
  ink: '#241a12',
  ink2: '#3a2a1c',
  stone: '#c9c2b0',
  stoneDark: '#9a9281',
  stoneLight: '#e5ddc9',
  brick: '#b5ac97',
  mortar: '#847b68',
  wood: '#8a5a33',
  woodDark: '#5d3a20',
  woodLight: '#b1784a',
  gold: '#f2c53d',
  goldDark: '#c4912a',
  goldLight: '#ffe38a',
  elixir: '#b95be6',
  elixirDark: '#7d34a8',
  elixirLight: '#e29cff',
  red: '#d1453a',
  redDark: '#9e2a22',
  redLight: '#ef776a',
  metal: '#969ea4',
  metalDark: '#5e666d',
  metalLight: '#c9cfd3',
  green: '#5f9e33',
  greenDark: '#3f6f22',
  greenLight: '#8cc857',
  skin: '#f0b98a',
  skinDark: '#c98a5e',
  white: '#f3efe4',
  black: '#1d1610',
  blue: '#3f6fd6',
  blueDark: '#2a4a99',
  cyan: '#5fe0ff',
  pink: '#ff74b5',
  teal: '#3fa7a0',
  tealDark: '#276d68',
  bone: '#e8e2cf',
  flame: '#ff8a3d',
  flameLight: '#ffd15a',
  smoke: '#8a8578',
};

const cache = new Map();

function canvas(size) {
  const node = document.createElement('canvas');
  node.width = size;
  node.height = size;
  return node;
}

function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function poly(g, points, color) {
  g.fillStyle = color;
  g.beginPath();
  points.forEach(([x, y], index) => (index ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}

function circle(g, cx, cy, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
}

/* -------------------------------- buildings -------------------------------- */

function townHall(g) {
  // plinth
  rect(g, 4, 27, 24, 2, C.ink);
  rect(g, 5, 25, 22, 2, C.stoneDark);
  // side wings
  rect(g, 4, 19, 5, 8, C.ink);
  rect(g, 23, 19, 5, 8, C.ink);
  rect(g, 5, 20, 3, 6, C.stoneDark);
  rect(g, 24, 20, 3, 6, C.stoneDark);
  // keep
  rect(g, 8, 14, 16, 12, C.ink);
  rect(g, 9, 15, 14, 11, C.stone);
  rect(g, 9, 15, 14, 2, C.stoneLight);
  rect(g, 9, 19, 14, 1, C.mortar);
  rect(g, 9, 23, 14, 1, C.mortar);
  rect(g, 13, 15, 1, 4, C.mortar);
  rect(g, 19, 19, 1, 4, C.mortar);
  // roof
  poly(g, [[6, 14], [26, 14], [21, 5], [11, 5]], C.ink);
  poly(g, [[7, 13], [25, 13], [20, 6], [12, 6]], C.red);
  poly(g, [[12, 6], [20, 6], [18, 9], [14, 9]], C.redLight);
  rect(g, 6, 13, 20, 1, C.gold);
  // flag
  rect(g, 15, 1, 2, 5, C.woodDark);
  poly(g, [[17, 1], [24, 2], [17, 4]], C.red);
  rect(g, 17, 2, 6, 1, C.redLight);
  // door
  rect(g, 13, 20, 6, 7, C.ink);
  rect(g, 14, 21, 4, 6, C.woodDark);
  rect(g, 14, 21, 4, 1, C.woodLight);
  rect(g, 17, 23, 1, 1, C.gold);
  // windows with warm light
  rect(g, 10, 17, 2, 2, C.ink);
  rect(g, 11, 17, 1, 1, C.goldLight);
  rect(g, 20, 17, 2, 2, C.ink);
  rect(g, 21, 17, 1, 1, C.goldLight);
  // flower boxes
  rect(g, 9, 19, 4, 1, C.woodDark);
  rect(g, 19, 19, 4, 1, C.woodDark);
  circle(g, 10, 19, 0.8, C.redLight);
  circle(g, 12, 19, 0.8, C.goldLight);
  circle(g, 20, 19, 0.8, C.redLight);
  circle(g, 22, 19, 0.8, C.goldLight);
}

function goldMine(g) {
  // timber frame
  rect(g, 7, 10, 3, 15, C.ink);
  rect(g, 8, 11, 2, 13, C.wood);
  rect(g, 22, 10, 3, 15, C.ink);
  rect(g, 23, 11, 2, 13, C.wood);
  rect(g, 6, 8, 20, 3, C.ink);
  rect(g, 7, 9, 18, 1, C.woodLight);
  // hanging lantern
  rect(g, 15, 11, 2, 2, C.woodDark);
  rect(g, 14, 13, 4, 4, C.ink);
  rect(g, 15, 14, 2, 2, C.goldLight);
  // cart
  rect(g, 9, 19, 14, 6, C.ink);
  rect(g, 10, 20, 12, 4, C.wood);
  rect(g, 10, 20, 12, 1, C.woodLight);
  // gold heap
  poly(g, [[9, 20], [13, 14], [17, 20]], C.ink);
  poly(g, [[10, 20], [13, 15], [16, 20]], C.gold);
  circle(g, 13, 17, 1.1, C.goldLight);
  circle(g, 15, 19, 0.9, C.goldLight);
  // wheels
  circle(g, 12, 26, 2.4, C.ink);
  circle(g, 12, 26, 1.4, C.woodDark);
  circle(g, 20, 26, 2.4, C.ink);
  circle(g, 20, 26, 1.4, C.woodDark);
  // rails
  rect(g, 8, 27, 16, 1, C.woodDark);
  // nuggets + rock pile
  circle(g, 24, 25, 1.6, C.gold);
  circle(g, 26, 26, 1.2, C.goldLight);
  poly(g, [[3, 27], [5, 22], [9, 24], [8, 27]], C.ink);
  poly(g, [[4, 26], [5, 23], [8, 24], [7, 26]], C.stoneDark);
}

function elixirCollector(g) {
  // base
  rect(g, 7, 15, 18, 10, C.ink);
  rect(g, 8, 16, 16, 8, C.stoneDark);
  rect(g, 8, 16, 16, 1, C.stoneLight);
  // vat with liquid
  rect(g, 9, 8, 14, 8, C.ink);
  rect(g, 10, 9, 12, 6, C.elixir);
  rect(g, 10, 9, 12, 2, C.elixirLight);
  circle(g, 13, 12, 1, C.elixirLight);
  circle(g, 18, 11, 0.9, C.elixirLight);
  circle(g, 20, 13, 0.8, C.elixirLight);
  // funnel
  rect(g, 14, 4, 4, 5, C.ink);
  rect(g, 15, 5, 2, 3, C.metal);
  rect(g, 12, 3, 8, 2, C.ink);
  rect(g, 13, 3, 6, 1, C.metalLight);
  // side pipe + valve
  rect(g, 23, 11, 4, 2, C.ink);
  rect(g, 24, 11, 3, 1, C.metal);
  circle(g, 27, 12, 1.4, C.ink);
  circle(g, 27, 12, 0.7, C.metalLight);
  // falling drop
  rect(g, 15, 19, 2, 3, C.elixirLight);
  // ground plate
  rect(g, 6, 25, 20, 2, C.ink);
}

function goldStorage(g) {
  // silo body
  rect(g, 6, 12, 20, 14, C.ink);
  rect(g, 7, 13, 18, 12, C.stone);
  rect(g, 7, 13, 18, 1, C.stoneLight);
  rect(g, 7, 17, 18, 1, C.mortar);
  rect(g, 7, 21, 18, 1, C.mortar);
  // gold dome roof
  poly(g, [[5, 13], [27, 13], [22, 6], [10, 6]], C.ink);
  poly(g, [[6, 12], [26, 12], [21, 7], [11, 7]], C.gold);
  poly(g, [[11, 7], [21, 7], [19, 9], [13, 9]], C.goldLight);
  rect(g, 5, 12, 22, 1, C.goldDark);
  // door
  rect(g, 13, 19, 6, 7, C.ink);
  rect(g, 14, 20, 4, 6, C.woodDark);
  rect(g, 14, 20, 4, 1, C.woodLight);
  rect(g, 16, 22, 1, 1, C.gold);
  // windows
  rect(g, 9, 15, 3, 3, C.ink);
  rect(g, 10, 16, 1, 1, C.goldLight);
  rect(g, 20, 15, 3, 3, C.ink);
  rect(g, 21, 16, 1, 1, C.goldLight);
  // spilled coins
  circle(g, 8, 26, 1.5, C.gold);
  circle(g, 11, 27, 1.3, C.goldLight);
  circle(g, 23, 26, 1.5, C.gold);
  rect(g, 14, 26, 3, 1, C.goldDark);
}

function elixirStorage(g) {
  // tank
  rect(g, 9, 12, 14, 14, C.ink);
  rect(g, 10, 13, 12, 12, C.stoneDark);
  rect(g, 10, 13, 12, 1, C.stoneLight);
  // liquid with wavy surface
  rect(g, 10, 18, 12, 6, C.elixir);
  rect(g, 10, 17, 4, 1, C.elixir);
  rect(g, 16, 17, 6, 1, C.elixir);
  rect(g, 10, 18, 12, 1, C.elixirLight);
  circle(g, 14, 21, 1, C.elixirLight);
  circle(g, 18, 23, 1.2, C.elixirLight);
  circle(g, 16, 19, 0.8, C.elixirLight);
  // neck + cap
  rect(g, 14, 7, 4, 6, C.ink);
  rect(g, 15, 8, 2, 4, C.metal);
  rect(g, 13, 5, 6, 3, C.ink);
  rect(g, 14, 5, 4, 2, C.metalLight);
  // pipes
  rect(g, 23, 15, 3, 2, C.metal);
  rect(g, 6, 18, 3, 2, C.metal);
  // base
  rect(g, 8, 26, 16, 1, C.ink);
}

function armyCamp(g) {
  // tent
  poly(g, [[4, 27], [16, 7], [28, 27]], C.ink);
  poly(g, [[6, 27], [16, 9], [26, 27]], C.green);
  poly(g, [[16, 9], [26, 27], [16, 27]], C.greenDark);
  // door
  poly(g, [[13, 27], [16, 17], [19, 27]], C.ink);
  poly(g, [[14, 27], [16, 19], [18, 27]], C.woodDark);
  // pennant
  rect(g, 15, 2, 2, 6, C.woodDark);
  poly(g, [[17, 2], [24, 3], [17, 5]], C.red);
  rect(g, 17, 3, 6, 1, C.redLight);
  // logs
  rect(g, 3, 24, 5, 2, C.wood);
  rect(g, 4, 22, 4, 2, C.woodDark);
  rect(g, 3, 25, 6, 1, C.ink);
  // crate
  rect(g, 24, 23, 5, 4, C.ink);
  rect(g, 25, 24, 3, 2, C.wood);
  rect(g, 26, 24, 1, 2, C.woodDark);
}

function laboratory(g) {
  // body
  rect(g, 6, 14, 20, 12, C.ink);
  rect(g, 7, 15, 18, 10, C.white);
  rect(g, 7, 15, 18, 1, C.stoneLight);
  // roof
  poly(g, [[4, 15], [28, 15], [23, 6], [9, 6]], C.ink);
  poly(g, [[5, 14], [27, 14], [22, 7], [10, 7]], C.red);
  poly(g, [[10, 7], [22, 7], [20, 10], [12, 10]], C.redDark);
  rect(g, 4, 14, 24, 1, C.gold);
  // chimney
  rect(g, 23, 3, 3, 5, C.ink);
  rect(g, 24, 4, 1, 3, C.stoneDark);
  // window
  rect(g, 9, 17, 5, 4, C.ink);
  rect(g, 10, 18, 3, 2, C.cyan);
  // table + flasks
  rect(g, 16, 21, 9, 2, C.woodDark);
  rect(g, 17, 17, 3, 4, C.ink);
  rect(g, 18, 18, 1, 3, C.elixir);
  circle(g, 18, 19, 0.7, C.elixirLight);
  rect(g, 22, 19, 2, 2, C.ink);
  rect(g, 22, 20, 2, 1, C.cyan);
  // door
  rect(g, 12, 20, 4, 6, C.ink);
  rect(g, 13, 21, 2, 5, C.wood);
  rect(g, 14, 23, 1, 1, C.gold);
}

function wall(g) {
  rect(g, 0, 2, 16, 12, C.ink);
  rect(g, 1, 3, 14, 10, C.brick);
  rect(g, 1, 3, 14, 2, C.stoneLight);
  rect(g, 1, 7, 14, 1, C.mortar);
  rect(g, 1, 11, 14, 1, C.mortar);
  rect(g, 5, 3, 1, 4, C.mortar);
  rect(g, 11, 3, 1, 4, C.mortar);
  rect(g, 3, 7, 1, 4, C.mortar);
  rect(g, 9, 7, 1, 4, C.mortar);
  rect(g, 13, 7, 1, 4, C.mortar);
  rect(g, 6, 11, 1, 2, C.mortar);
  rect(g, 12, 11, 1, 2, C.mortar);
  rect(g, 1, 12, 14, 1, C.stoneDark);
}

function cannon(g) {
  circle(g, 16, 19, 8, C.ink);
  circle(g, 16, 19, 7, C.stoneDark);
  circle(g, 16, 19, 5.2, C.metalDark);
  circle(g, 16, 19, 3.4, C.metal);
  circle(g, 15, 18, 1, C.metalLight);
  // planks
  rect(g, 8, 25, 16, 2, C.ink);
  rect(g, 9, 24, 14, 2, C.wood);
  rect(g, 13, 24, 1, 2, C.woodDark);
  rect(g, 17, 24, 1, 2, C.woodDark);
  // wheels
  circle(g, 7, 24, 2.6, C.ink);
  circle(g, 7, 24, 1.6, C.woodDark);
  circle(g, 25, 24, 2.6, C.ink);
  circle(g, 25, 24, 1.6, C.woodDark);
}

function cannonBarrel(g) {
  rect(g, 1, 7, 16, 6, C.ink);
  rect(g, 2, 8, 13, 4, C.metalDark);
  rect(g, 2, 8, 11, 1, C.metalLight);
  rect(g, 14, 6, 5, 8, C.ink);
  rect(g, 15, 7, 3, 6, C.metal);
  rect(g, 16, 8, 2, 4, C.ink2);
  rect(g, 0, 9, 3, 2, C.ink2);
}

function archerTower(g) {
  // shaft
  rect(g, 10, 12, 12, 16, C.ink);
  rect(g, 11, 13, 10, 14, C.stone);
  rect(g, 11, 13, 10, 1, C.stoneLight);
  rect(g, 11, 17, 10, 1, C.mortar);
  rect(g, 11, 21, 10, 1, C.mortar);
  // platform
  rect(g, 7, 9, 18, 4, C.ink);
  rect(g, 8, 10, 16, 2, C.wood);
  rect(g, 8, 12, 16, 1, C.woodDark);
  // roof
  poly(g, [[8, 9], [24, 9], [16, 1]], C.ink);
  poly(g, [[9, 8], [23, 8], [16, 2]], C.red);
  poly(g, [[16, 2], [23, 8], [20, 8], [16, 5]], C.redDark);
  rect(g, 8, 8, 16, 1, C.gold);
  // arrow slit
  rect(g, 14, 14, 4, 5, C.ink);
  rect(g, 15, 15, 2, 3, C.ink2);
  // banners
  rect(g, 12, 18, 2, 6, C.red);
  rect(g, 12, 23, 2, 1, C.gold);
  rect(g, 18, 18, 2, 6, C.red);
  rect(g, 18, 23, 2, 1, C.gold);
}

function mortar(g) {
  circle(g, 16, 22, 9, C.ink);
  circle(g, 16, 22, 8, C.stoneDark);
  circle(g, 16, 22, 4.6, C.ink2);
  // tube angled up-left
  g.save();
  g.translate(16, 18);
  g.rotate(-0.65);
  rect(g, -3, -14, 7, 16, C.ink);
  rect(g, -2, -13, 5, 14, C.metalDark);
  rect(g, -2, -13, 2, 12, C.metal);
  rect(g, -4, -16, 9, 3, C.ink);
  rect(g, -3, -15, 7, 1, C.metalLight);
  g.restore();
  // legs + plate
  rect(g, 9, 24, 4, 2, C.ink);
  rect(g, 19, 24, 4, 2, C.ink);
  rect(g, 8, 25, 6, 1, C.woodDark);
  rect(g, 7, 26, 18, 1, C.ink);
}

function wizardTower(g) {
  // shaft
  rect(g, 11, 13, 10, 15, C.ink);
  rect(g, 12, 14, 8, 13, C.stoneDark);
  rect(g, 12, 14, 8, 1, C.stoneLight);
  rect(g, 12, 18, 8, 1, C.mortar);
  rect(g, 12, 22, 8, 1, C.mortar);
  // window + door
  rect(g, 14, 19, 4, 5, C.ink);
  rect(g, 15, 20, 2, 3, C.blue);
  rect(g, 14, 24, 4, 4, C.ink);
  rect(g, 15, 25, 2, 3, C.woodDark);
  // runes
  rect(g, 13, 16, 1, 1, C.cyan);
  rect(g, 18, 16, 1, 1, C.cyan);
  // roof cone
  poly(g, [[9, 13], [23, 13], [16, 6]], C.ink);
  poly(g, [[10, 12], [22, 12], [16, 7]], C.blue);
  poly(g, [[16, 7], [22, 12], [19, 12], [16, 9]], C.blueDark);
  rect(g, 9, 12, 14, 1, C.gold);
  // floating crystal
  poly(g, [[16, 0], [18, 2.5], [16, 5], [14, 2.5]], C.ink);
  poly(g, [[16, 1], [17.2, 2.5], [16, 4], [14.8, 2.5]], C.cyan);
  rect(g, 18, 1, 1, 1, C.white);
}

function airDefense(g) {
  // hex pad
  poly(g, [[6, 22], [26, 22], [29, 26], [26, 30], [6, 30], [3, 26]], C.ink);
  poly(g, [[7, 23], [25, 23], [27, 26], [25, 29], [7, 29], [5, 26]], C.metalDark);
  rect(g, 7, 23, 18, 1, C.metal);
  circle(g, 9, 25, 0.8, C.metal);
  circle(g, 23, 25, 0.8, C.metal);
  // turret base
  rect(g, 11, 16, 10, 7, C.ink);
  rect(g, 12, 17, 8, 5, C.metalDark);
  // rotating head
  rect(g, 10, 12, 12, 5, C.ink);
  rect(g, 11, 13, 10, 3, C.metal);
  // twin barrels
  rect(g, 12, 8, 3, 5, C.ink);
  rect(g, 13, 8, 1, 4, C.metalLight);
  rect(g, 17, 8, 3, 5, C.ink);
  rect(g, 18, 8, 1, 4, C.metalLight);
  // beacon
  rect(g, 15, 10, 2, 2, C.ink);
  rect(g, 15, 10, 2, 1, C.red);
}

function rubble(g) {
  poly(g, [[2, 28], [7, 19], [11, 24], [15, 16], [19, 23], [24, 18], [30, 28]], C.ink);
  poly(g, [[3, 28], [7, 21], [11, 25], [15, 18], [19, 24], [24, 20], [29, 28]], C.stoneDark);
  poly(g, [[8, 26], [11, 22], [14, 26]], C.stone);
  poly(g, [[17, 25], [21, 20], [24, 25]], C.stone);
  rect(g, 5, 24, 4, 2, C.brick);
  rect(g, 20, 24, 5, 2, C.brick);
  rect(g, 12, 26, 3, 2, C.mortar);
  rect(g, 25, 26, 3, 2, C.brick);
  circle(g, 10, 23, 1, C.stoneLight);
  circle(g, 22, 22, 1, C.stoneLight);
}

/* ---------------------------------- units ---------------------------------- */

function barbarian(g, f) {
  // sword, raised
  poly(g, [[17, 2], [19, 2], [18, 0]], C.metalLight);
  rect(g, 17, 2, 2, 10, C.metal);
  rect(g, 17, 2, 1, 9, C.metalLight);
  rect(g, 16, 11, 4, 2, C.woodDark);
  rect(g, 17, 13, 2, 3, C.wood);
  // legs (walk flipbook)
  if (f) {
    rect(g, 8, 18, 3, 4, C.skinDark);
    rect(g, 13, 18, 3, 4, C.skinDark);
    rect(g, 7, 21, 4, 2, C.ink);
    rect(g, 13, 21, 4, 2, C.ink);
  } else {
    rect(g, 9, 18, 2, 4, C.skinDark);
    rect(g, 14, 18, 2, 4, C.skinDark);
    rect(g, 8, 21, 3, 2, C.ink);
    rect(g, 13, 21, 3, 2, C.ink);
  }
  // torso
  rect(g, 7, 11, 10, 7, C.ink);
  rect(g, 8, 12, 8, 5, C.wood);
  rect(g, 8, 16, 8, 2, C.bone);
  rect(g, 10, 13, 4, 1, C.ink2);
  rect(g, 11, 13, 2, 1, C.gold);
  // arms
  rect(g, 5, 12, 2, 4, C.skin);
  rect(g, 17, 10, 2, 3, C.skin);
  // head
  rect(g, 8, 4, 8, 7, C.ink);
  rect(g, 9, 5, 6, 6, C.skin);
  rect(g, 10, 8, 1, 1, C.ink);
  rect(g, 13, 8, 1, 1, C.ink);
  rect(g, 9, 10, 6, 1, C.bone);
  rect(g, 10, 11, 4, 1, C.bone);
  // horned helmet
  rect(g, 7, 3, 10, 3, C.ink);
  rect(g, 8, 2, 8, 2, C.metal);
  rect(g, 11, 1, 2, 2, C.metalLight);
  poly(g, [[7, 3], [4, 0], [8, 1]], C.bone);
  poly(g, [[17, 3], [20, 0], [16, 1]], C.bone);
}

function archer(g, f) {
  // bow + nocked arrow
  rect(g, 18, 4, 2, 3, C.wood);
  rect(g, 19, 7, 2, 11, C.wood);
  rect(g, 18, 18, 2, 3, C.wood);
  rect(g, 20, 5, 1, 14, C.bone);
  rect(g, 15, 9, 5, 1, C.woodLight);
  poly(g, [[20, 8], [22, 9], [20, 10]], C.metal);
  // legs
  if (f) {
    rect(g, 8, 18, 3, 4, C.greenDark);
    rect(g, 13, 18, 3, 4, C.greenDark);
    rect(g, 7, 21, 4, 2, C.ink);
    rect(g, 13, 21, 4, 2, C.ink);
  } else {
    rect(g, 9, 18, 2, 4, C.greenDark);
    rect(g, 14, 18, 2, 4, C.greenDark);
    rect(g, 8, 21, 3, 2, C.ink);
    rect(g, 13, 21, 3, 2, C.ink);
  }
  // torso
  rect(g, 7, 11, 10, 7, C.ink);
  rect(g, 8, 12, 8, 5, C.greenDark);
  rect(g, 8, 16, 8, 1, C.green);
  // quiver on the back
  rect(g, 5, 8, 3, 8, C.woodDark);
  rect(g, 5, 6, 1, 2, C.bone);
  rect(g, 7, 6, 1, 2, C.bone);
  // arms
  rect(g, 15, 11, 3, 2, C.skin);
  rect(g, 6, 12, 2, 4, C.skin);
  // head + hood
  rect(g, 8, 5, 8, 6, C.ink);
  poly(g, [[7, 7], [17, 7], [14, 2], [10, 2]], C.ink);
  poly(g, [[8, 6], [16, 6], [14, 3], [10, 3]], C.green);
  rect(g, 10, 7, 4, 4, C.skin);
  rect(g, 11, 9, 1, 1, C.ink);
  rect(g, 13, 9, 1, 1, C.ink);
}

function goblin(g, f) {
  // ears
  poly(g, [[6, 7], [2, 5], [5, 10]], C.green);
  poly(g, [[18, 7], [22, 5], [19, 10]], C.green);
  rect(g, 5, 8, 2, 2, C.greenDark);
  rect(g, 17, 8, 2, 2, C.greenDark);
  // head
  rect(g, 7, 4, 10, 9, C.ink);
  rect(g, 8, 5, 8, 7, C.green);
  rect(g, 8, 5, 8, 1, C.greenLight);
  rect(g, 10, 8, 1, 1, C.goldLight);
  rect(g, 13, 8, 1, 1, C.goldLight);
  rect(g, 10, 11, 4, 1, C.ink);
  rect(g, 11, 11, 1, 1, C.bone);
  // body rags
  rect(g, 7, 13, 10, 6, C.ink);
  rect(g, 8, 14, 8, 4, C.woodDark);
  rect(g, 8, 17, 8, 1, C.ink2);
  rect(g, 10, 14, 4, 1, C.woodLight);
  // arms + daggers
  rect(g, 6, 13, 2, 3, C.green);
  rect(g, 16, 13, 2, 3, C.green);
  rect(g, 4, 12, 2, 5, C.metal);
  rect(g, 4, 17, 2, 1, C.woodDark);
  rect(g, 18, 12, 2, 5, C.metal);
  rect(g, 18, 17, 2, 1, C.woodDark);
  // legs
  if (f) {
    rect(g, 8, 19, 3, 3, C.greenDark);
    rect(g, 13, 19, 3, 3, C.greenDark);
    rect(g, 7, 21, 4, 2, C.ink);
    rect(g, 13, 21, 4, 2, C.ink);
  } else {
    rect(g, 9, 19, 2, 3, C.greenDark);
    rect(g, 14, 19, 2, 3, C.greenDark);
    rect(g, 8, 21, 3, 2, C.ink);
    rect(g, 13, 21, 3, 2, C.ink);
  }
}

function giant(g, f) {
  // legs
  if (f) {
    rect(g, 6, 18, 5, 5, C.skinDark);
    rect(g, 14, 18, 5, 5, C.skinDark);
    rect(g, 5, 22, 6, 2, C.ink);
    rect(g, 13, 22, 6, 2, C.ink);
  } else {
    rect(g, 8, 18, 5, 5, C.skinDark);
    rect(g, 12, 18, 5, 5, C.skinDark);
    rect(g, 7, 22, 5, 2, C.ink);
    rect(g, 12, 22, 5, 2, C.ink);
  }
  // torso
  rect(g, 5, 7, 14, 12, C.ink);
  rect(g, 6, 8, 12, 10, C.skin);
  rect(g, 6, 15, 12, 2, C.skinDark);
  rect(g, 8, 12, 8, 3, C.skin);
  // fur skirt + belt
  rect(g, 5, 18, 14, 3, C.woodDark);
  rect(g, 6, 18, 1, 2, C.bone);
  rect(g, 9, 18, 1, 2, C.bone);
  rect(g, 12, 18, 1, 2, C.bone);
  rect(g, 15, 18, 1, 2, C.bone);
  rect(g, 5, 17, 14, 1, C.ink);
  rect(g, 11, 17, 2, 1, C.gold);
  // head
  rect(g, 9, 2, 6, 6, C.ink);
  rect(g, 10, 3, 4, 5, C.skin);
  rect(g, 11, 5, 1, 1, C.ink);
  rect(g, 13, 5, 1, 1, C.ink);
  rect(g, 10, 7, 4, 1, C.skinDark);
  rect(g, 9, 2, 6, 2, C.ink2);
  // arms + fists (frame swings them)
  if (f) {
    rect(g, 3, 7, 3, 6, C.skin);
    rect(g, 2, 5, 5, 4, C.ink);
    rect(g, 3, 6, 3, 2, C.skin);
    rect(g, 18, 7, 3, 6, C.skin);
    rect(g, 17, 5, 5, 4, C.ink);
    rect(g, 18, 6, 3, 2, C.skin);
  } else {
    rect(g, 3, 9, 3, 7, C.skin);
    rect(g, 2, 15, 5, 4, C.ink);
    rect(g, 3, 16, 3, 2, C.skin);
    rect(g, 18, 9, 3, 7, C.skin);
    rect(g, 17, 15, 5, 4, C.ink);
    rect(g, 18, 16, 3, 2, C.skin);
  }
}

function wallBreaker(g, f) {
  // fuse + spark (frame 1 blazes)
  rect(g, 11, 5, 2, 3, C.wood);
  if (f) {
    rect(g, 9, 2, 6, 2, C.flameLight);
    rect(g, 11, 0, 2, 6, C.flameLight);
    circle(g, 12, 3, 2, C.flame);
  } else {
    rect(g, 10, 2, 4, 2, C.flameLight);
    circle(g, 12, 3, 1.4, C.flame);
  }
  // skull mask
  rect(g, 8, 6, 8, 7, C.ink);
  rect(g, 9, 7, 6, 5, C.bone);
  rect(g, 10, 9, 1, 1, C.ink);
  rect(g, 13, 9, 1, 1, C.ink);
  rect(g, 11, 11, 2, 1, C.ink);
  rect(g, 10, 12, 1, 1, C.ink);
  rect(g, 12, 12, 1, 1, C.ink);
  rect(g, 14, 12, 1, 1, C.ink);
  // bomb body
  circle(g, 12, 16, 6, C.ink);
  circle(g, 12, 16, 5, C.woodDark);
  rect(g, 6, 14, 12, 2, C.metal);
  circle(g, 9, 14, 1, C.metalLight);
  circle(g, 15, 14, 1, C.metalLight);
  // legs
  if (f) {
    rect(g, 8, 21, 3, 2, C.ink);
    rect(g, 13, 21, 3, 2, C.ink);
  } else {
    rect(g, 9, 21, 2, 2, C.ink);
    rect(g, 13, 21, 2, 2, C.ink);
  }
}

function balloon(g, f) {
  // envelope
  poly(g, [[12, 1], [20, 5], [21, 11], [12, 15], [3, 11], [4, 5]], C.ink);
  poly(g, [[12, 2], [19, 5], [20, 11], [12, 14], [4, 11], [5, 5]], C.red);
  poly(g, [[12, 2], [14, 3], [14, 13], [12, 14]], C.redDark);
  poly(g, [[7, 5], [10, 3], [9, 11], [6, 11]], C.redLight);
  // ropes
  rect(g, 9, 15, 1, 4, C.woodDark);
  rect(g, 14, 15, 1, 4, C.woodDark);
  // burner flame (frame flickers)
  if (f) {
    poly(g, [[10, 16], [13, 11], [15, 16]], C.flame);
    poly(g, [[11, 16], [13, 13], [14, 16]], C.flameLight);
  } else {
    poly(g, [[10, 16], [12, 12], [14, 16]], C.flame);
    poly(g, [[11, 16], [12, 14], [13, 16]], C.flameLight);
  }
  // basket
  rect(g, 9, 19, 6, 4, C.ink);
  rect(g, 10, 20, 4, 2, C.wood);
  rect(g, 10, 20, 4, 1, C.woodLight);
}

function wizard(g, f) {
  // staff + orb (frame 1 adds sparkles)
  rect(g, 19, 6, 2, 15, C.woodDark);
  circle(g, 20, 4, 2.2, C.ink);
  circle(g, 20, 4, 1.6, C.cyan);
  circle(g, 20, 4, 0.8, C.white);
  if (f) {
    rect(g, 16, 2, 1, 1, C.cyan);
    rect(g, 23, 3, 1, 1, C.cyan);
    rect(g, 21, 0, 1, 1, C.elixirLight);
  }
  // hat
  poly(g, [[6, 10], [18, 10], [14, 1]], C.ink);
  poly(g, [[7, 9], [17, 9], [13, 3]], C.blue);
  poly(g, [[13, 3], [17, 9], [14, 9], [12, 5]], C.blueDark);
  rect(g, 5, 9, 14, 2, C.ink);
  rect(g, 6, 9, 12, 1, C.blueDark);
  rect(g, 7, 8, 10, 1, C.gold);
  // face
  rect(g, 9, 11, 6, 5, C.ink);
  rect(g, 10, 12, 4, 3, C.skin);
  rect(g, 11, 13, 1, 1, C.ink);
  rect(g, 13, 13, 1, 1, C.ink);
  // beard
  poly(g, [[9, 15], [15, 15], [12, 21]], C.ink);
  poly(g, [[10, 15], [14, 15], [12, 20]], C.bone);
  // robe
  rect(g, 7, 16, 10, 6, C.ink);
  rect(g, 8, 17, 8, 4, C.blue);
  rect(g, 8, 17, 8, 1, C.blueDark);
  if (f) {
    rect(g, 8, 21, 9, 2, C.blueDark);
  } else {
    rect(g, 7, 21, 10, 2, C.blueDark);
  }
  // arm to the staff
  rect(g, 16, 13, 3, 2, C.skin);
  // feet
  rect(g, 8, 22, 3, 2, C.ink);
  rect(g, 13, 22, 3, 2, C.ink);
}

function healer(g, f) {
  // wings (frame flutters them)
  if (f) {
    poly(g, [[3, 13], [7, 6], [9, 15]], C.ink);
    poly(g, [[4, 13], [7, 8], [8, 15]], C.elixirLight);
    poly(g, [[21, 13], [17, 6], [15, 15]], C.ink);
    poly(g, [[20, 13], [17, 8], [16, 15]], C.elixirLight);
  } else {
    poly(g, [[3, 11], [7, 3], [9, 12]], C.ink);
    poly(g, [[4, 11], [7, 5], [8, 12]], C.elixirLight);
    poly(g, [[21, 11], [17, 3], [15, 12]], C.ink);
    poly(g, [[20, 11], [17, 5], [16, 12]], C.elixirLight);
  }
  // halo
  rect(g, 10, 1, 4, 1, C.gold);
  rect(g, 11, 0, 2, 1, C.goldLight);
  // head
  rect(g, 9, 4, 6, 6, C.ink);
  rect(g, 10, 5, 4, 4, C.skin);
  rect(g, 11, 7, 1, 1, C.ink);
  rect(g, 13, 7, 1, 1, C.ink);
  rect(g, 10, 8, 4, 1, C.white);
  // robe
  rect(g, 8, 11, 8, 9, C.ink);
  rect(g, 9, 12, 6, 7, C.white);
  rect(g, 11, 13, 2, 4, C.red);
  rect(g, 10, 14, 4, 2, C.red);
  // arms
  rect(g, 6, 12, 2, 4, C.skin);
  rect(g, 16, 12, 2, 4, C.skin);
  // feet
  rect(g, 9, 20, 2, 2, C.ink);
  rect(g, 13, 20, 2, 2, C.ink);
}

function dragon(g, f) {
  // wings (frame flaps)
  if (f) {
    poly(g, [[2, 12], [8, 8], [7, 17], [3, 15]], C.ink);
    poly(g, [[3, 12], [7, 10], [6, 16], [4, 15]], C.tealDark);
    poly(g, [[22, 12], [16, 8], [17, 17], [21, 15]], C.ink);
    poly(g, [[21, 12], [17, 10], [18, 16], [20, 15]], C.tealDark);
  } else {
    poly(g, [[2, 6], [8, 1], [7, 11], [3, 10]], C.ink);
    poly(g, [[3, 6], [7, 3], [6, 10], [4, 9]], C.tealDark);
    poly(g, [[22, 6], [16, 1], [17, 11], [21, 10]], C.ink);
    poly(g, [[21, 6], [17, 3], [18, 10], [20, 9]], C.tealDark);
  }
  // tail
  poly(g, [[1, 13], [6, 12], [6, 15]], C.tealDark);
  rect(g, 4, 12, 3, 3, C.ink);
  // body
  rect(g, 6, 9, 12, 9, C.ink);
  rect(g, 7, 10, 10, 7, C.teal);
  rect(g, 8, 14, 8, 3, C.bone);
  // back spikes
  poly(g, [[8, 10], [9, 7], [10, 10]], C.ink);
  poly(g, [[11, 10], [12, 7], [13, 10]], C.ink);
  // legs
  if (f) {
    rect(g, 7, 18, 3, 3, C.ink);
    rect(g, 8, 18, 2, 2, C.tealDark);
    rect(g, 14, 18, 3, 3, C.ink);
    rect(g, 15, 18, 2, 2, C.tealDark);
  } else {
    rect(g, 8, 18, 3, 3, C.ink);
    rect(g, 9, 18, 2, 2, C.tealDark);
    rect(g, 15, 18, 3, 3, C.ink);
    rect(g, 16, 18, 2, 2, C.tealDark);
  }
  // neck + head
  rect(g, 14, 4, 6, 6, C.ink);
  rect(g, 15, 5, 5, 5, C.teal);
  rect(g, 17, 8, 5, 4, C.ink);
  rect(g, 18, 9, 4, 3, C.teal);
  rect(g, 22, 9, 1, 1, C.ink);
  rect(g, 17, 11, 4, 1, C.tealDark);
  rect(g, 16, 6, 1, 1, C.goldLight);
  // horns
  poly(g, [[14, 5], [12, 2], [15, 4]], C.bone);
  poly(g, [[16, 4], [15, 1], [17, 4]], C.bone);
}

function pekka(g, f) {
  // legs
  if (f) {
    rect(g, 7, 18, 4, 5, C.ink);
    rect(g, 8, 19, 2, 3, C.metalDark);
    rect(g, 13, 18, 4, 5, C.ink);
    rect(g, 14, 19, 2, 3, C.metalDark);
    rect(g, 6, 22, 5, 2, C.ink);
    rect(g, 12, 22, 5, 2, C.ink);
  } else {
    rect(g, 8, 18, 4, 5, C.ink);
    rect(g, 9, 19, 2, 3, C.metalDark);
    rect(g, 12, 18, 4, 5, C.ink);
    rect(g, 13, 19, 2, 3, C.metalDark);
    rect(g, 7, 22, 5, 2, C.ink);
    rect(g, 11, 22, 5, 2, C.ink);
  }
  // torso armour
  rect(g, 5, 8, 14, 11, C.ink);
  rect(g, 6, 9, 12, 9, C.metalDark);
  rect(g, 6, 9, 12, 2, C.metal);
  rect(g, 8, 12, 8, 4, C.metal);
  rect(g, 10, 13, 4, 2, C.pink);
  rect(g, 11, 14, 2, 1, C.white);
  // shoulders
  rect(g, 3, 9, 3, 5, C.ink);
  rect(g, 4, 10, 2, 3, C.metal);
  rect(g, 18, 9, 3, 5, C.ink);
  rect(g, 18, 10, 2, 3, C.metal);
  // helmet + visor
  rect(g, 8, 2, 8, 6, C.ink);
  rect(g, 9, 3, 6, 4, C.metalDark);
  rect(g, 10, 4, 4, 2, C.pink);
  rect(g, 11, 4, 2, 1, C.white);
  // horns
  poly(g, [[8, 3], [5, 0], [9, 2]], C.metalLight);
  poly(g, [[16, 3], [19, 0], [15, 2]], C.metalLight);
  // greatsword
  rect(g, 20, 2, 3, 13, C.ink);
  rect(g, 21, 3, 1, 11, C.metal);
  rect(g, 21, 3, 1, 2, C.metalLight);
  rect(g, 18, 15, 7, 2, C.ink);
  rect(g, 19, 15, 5, 1, C.gold);
  rect(g, 20, 17, 3, 3, C.woodDark);
  // left arm
  rect(g, 4, 12, 2, 5, C.ink);
  rect(g, 5, 13, 1, 3, C.metal);
}

/* --------------------------------- registry -------------------------------- */

const BUILDING_SPRITES = {
  town_hall: townHall,
  gold_mine: goldMine,
  elixir_collector: elixirCollector,
  gold_storage: goldStorage,
  elixir_storage: elixirStorage,
  army_camp: armyCamp,
  laboratory: laboratory,
  wall: wall,
  cannon: cannon,
  archer_tower: archerTower,
  mortar: mortar,
  wizard_tower: wizardTower,
  air_defense: airDefense,
  rubble: rubble,
};

const UNIT_SPRITES = {
  barbarian,
  archer,
  goblin,
  giant,
  wallbreaker: wallBreaker,
  balloon,
  wizard,
  healer,
  dragon,
  pekka,
};

const SIZE = {
  wall: WALL_SIZE,
  cannonBarrel: 20,
};

export function getSprite(key, frame = 0) {
  const cacheKey = `${key}#${frame}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const node = canvas(SIZE[key] || (key === 'cannonBarrel' ? 20 : UNIT_SPRITES[key] ? UNIT_SIZE : BUILDING_SIZE));
  const g = node.getContext('2d');
  g.imageSmoothingEnabled = false;
  const draw =
    key === 'cannonBarrel'
      ? cannonBarrel
      : BUILDING_SPRITES[key] || UNIT_SPRITES[key] || rubble;
  draw(g, frame);
  cache.set(cacheKey, node);
  return node;
}

/** A ready-to-use icon canvas for DOM UI (unit portraits, tray slots). */
export function makeIcon(key, size = 40) {
  const node = canvas(size);
  const g = node.getContext('2d');
  g.imageSmoothingEnabled = false;
  const sprite = getSprite(key);
  const scale = Math.floor(size / sprite.width) || 1;
  const drawSize = sprite.width * scale;
  g.drawImage(sprite, (size - drawSize) / 2, (size - drawSize) / 2, drawSize, drawSize);
  return node;
}
