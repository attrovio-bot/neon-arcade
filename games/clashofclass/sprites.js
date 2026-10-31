/**
 * CLASH OF CLASS — original pixel art, drawn procedurally.
 *
 * Nothing here is ripped from anywhere: every sprite is a small canvas painted
 * from rectangles and polygons at build-free runtime, then blitted scaled with
 * nearest-neighbour sampling. The palette is deliberately cartoon-medieval:
 * warm stone, gold, elixir violet and grass green.
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
  rect(g, 6, 17, 20, 11, C.ink);
  rect(g, 7, 18, 18, 9, C.stone);
  rect(g, 7, 18, 18, 2, C.stoneLight);
  rect(g, 13, 21, 6, 6, C.woodDark);
  rect(g, 14, 21, 4, 5, C.wood);
  rect(g, 15, 20, 2, 2, C.gold);
  rect(g, 9, 20, 2, 2, C.goldDark);
  rect(g, 21, 20, 2, 2, C.goldDark);
  // roof
  poly(g, [[4, 18], [28, 18], [23, 8], [9, 8]], C.ink);
  poly(g, [[5, 17], [27, 17], [22, 9], [10, 9]], C.red);
  poly(g, [[10, 9], [22, 9], [20, 12], [12, 12]], C.redLight);
  rect(g, 5, 16, 22, 2, C.gold);
  // flag
  rect(g, 15, 3, 2, 6, C.woodDark);
  rect(g, 17, 3, 6, 4, C.red);
  rect(g, 17, 3, 6, 1, C.redLight);
  rect(g, 22, 4, 1, 2, C.gold);
  // door arch
  rect(g, 13, 20, 6, 1, C.woodLight);
}

function goldMine(g) {
  rect(g, 8, 11, 3, 14, C.ink);
  rect(g, 9, 11, 2, 14, C.wood);
  rect(g, 21, 11, 3, 14, C.ink);
  rect(g, 22, 11, 2, 14, C.wood);
  rect(g, 8, 10, 16, 3, C.ink);
  rect(g, 9, 11, 14, 2, C.woodLight);
  rect(g, 12, 15, 8, 8, C.ink);
  rect(g, 13, 16, 6, 6, C.woodDark);
  circle(g, 16, 19, 2.4, C.gold);
  circle(g, 16, 19, 1.2, C.goldLight);
  rect(g, 10, 23, 12, 3, C.ink);
  rect(g, 10, 24, 12, 2, C.goldDark);
  circle(g, 12, 24, 2, C.gold);
  circle(g, 16, 25, 2.2, C.goldLight);
  circle(g, 20, 24, 2, C.gold);
  rect(g, 6, 25, 4, 2, C.ink);
  rect(g, 22, 25, 4, 2, C.ink);
}

function elixirCollector(g) {
  rect(g, 9, 9, 14, 16, C.ink);
  rect(g, 10, 10, 12, 14, C.elixir);
  rect(g, 10, 10, 12, 3, C.elixirLight);
  rect(g, 10, 14, 12, 2, C.elixirDark);
  rect(g, 10, 19, 12, 2, C.elixirDark);
  rect(g, 15, 4, 3, 6, C.metal);
  rect(g, 14, 3, 5, 2, C.metalLight);
  rect(g, 23, 13, 4, 3, C.metal);
  rect(g, 26, 12, 2, 5, C.metalDark);
  circle(g, 13, 17, 1, C.elixirLight);
  circle(g, 18, 21, 1, C.elixirLight);
  rect(g, 8, 24, 16, 2, C.ink);
  rect(g, 9, 25, 14, 2, C.stoneDark);
}

function goldStorage(g) {
  rect(g, 7, 13, 18, 13, C.ink);
  rect(g, 8, 14, 16, 11, C.stone);
  rect(g, 8, 14, 16, 2, C.stoneLight);
  rect(g, 13, 18, 6, 7, C.ink);
  rect(g, 14, 19, 4, 6, C.woodDark);
  rect(g, 15, 20, 2, 2, C.gold);
  // coin hoard
  rect(g, 9, 10, 14, 4, C.goldDark);
  rect(g, 10, 9, 12, 3, C.gold);
  circle(g, 12, 10, 1.8, C.goldLight);
  circle(g, 17, 9, 2, C.goldLight);
  circle(g, 21, 11, 1.6, C.goldLight);
  rect(g, 6, 24, 4, 2, C.ink);
  rect(g, 22, 24, 4, 2, C.ink);
}

function elixirStorage(g) {
  rect(g, 8, 17, 16, 9, C.ink);
  rect(g, 9, 18, 14, 7, C.stone);
  rect(g, 9, 18, 14, 2, C.stoneLight);
  rect(g, 10, 7, 12, 12, C.ink);
  rect(g, 11, 8, 10, 10, C.elixir);
  rect(g, 11, 8, 10, 3, C.elixirLight);
  rect(g, 11, 13, 10, 2, C.elixirDark);
  rect(g, 9, 7, 14, 2, C.metal);
  rect(g, 14, 4, 4, 3, C.metalLight);
  rect(g, 11, 20, 3, 2, C.elixirDark);
}

function armyCamp(g) {
  rect(g, 5, 15, 22, 11, C.ink);
  poly(g, [[6, 16], [26, 16], [23, 7], [9, 7]], C.greenDark);
  poly(g, [[7, 15], [25, 15], [22, 9], [10, 9]], C.green);
  rect(g, 12, 16, 8, 7, C.ink2);
  rect(g, 13, 17, 6, 6, C.woodDark);
  rect(g, 15, 3, 2, 5, C.woodDark);
  rect(g, 17, 3, 6, 3, C.red);
  rect(g, 4, 23, 5, 2, C.wood);
  rect(g, 22, 20, 3, 3, C.goldDark);
  circle(g, 24, 22, 1.2, C.gold);
}

function laboratory(g) {
  rect(g, 7, 15, 18, 11, C.ink);
  rect(g, 8, 16, 16, 9, C.white);
  rect(g, 8, 16, 16, 2, C.stoneLight);
  poly(g, [[5, 16], [27, 16], [23, 8], [9, 8]], C.ink);
  poly(g, [[6, 15], [26, 15], [22, 9], [10, 9]], C.red);
  rect(g, 13, 17, 6, 6, C.ink2);
  rect(g, 14, 18, 4, 4, C.greenLight);
  rect(g, 15, 16, 2, 2, C.metal);
  rect(g, 12, 21, 2, 2, C.cyan);
  rect(g, 18, 21, 2, 2, C.cyan);
}

function wall(g) {
  rect(g, 0, 2, 16, 12, C.ink);
  rect(g, 1, 3, 14, 10, C.brick);
  rect(g, 1, 3, 14, 2, C.stoneLight);
  rect(g, 1, 7, 14, 1, C.mortar);
  rect(g, 1, 11, 14, 1, C.mortar);
  rect(g, 5, 3, 1, 4, C.mortar);
  rect(g, 10, 8, 1, 4, C.mortar);
  rect(g, 3, 8, 1, 4, C.mortar);
  rect(g, 13, 3, 1, 4, C.mortar);
  rect(g, 1, 13, 14, 1, C.stoneDark);
}

function cannon(g) {
  circle(g, 16, 21, 7, C.ink);
  circle(g, 16, 21, 6, C.metalDark);
  circle(g, 16, 21, 4.4, C.metal);
  rect(g, 14, 19, 4, 4, C.ink2);
  rect(g, 6, 26, 20, 2, C.ink);
  rect(g, 7, 26, 18, 1, C.metalDark);
}

function cannonBarrel(g) {
  rect(g, 0, 2, 20, 5, C.ink);
  rect(g, 1, 3, 17, 3, C.metalDark);
  rect(g, 2, 3, 15, 1, C.metal);
  rect(g, 15, 2, 4, 5, C.ink);
  rect(g, 16, 3, 3, 3, C.metalLight);
  rect(g, 1, 5, 3, 2, C.ink2);
}

function archerTower(g) {
  rect(g, 11, 10, 10, 16, C.ink);
  rect(g, 12, 11, 8, 15, C.stone);
  rect(g, 12, 11, 8, 3, C.stoneLight);
  rect(g, 14, 16, 4, 6, C.stoneDark);
  rect(g, 15, 17, 2, 3, C.ink2);
  rect(g, 8, 9, 16, 4, C.ink);
  rect(g, 9, 10, 14, 3, C.stoneLight);
  poly(g, [[10, 9], [22, 9], [16, 1]], C.ink);
  poly(g, [[11, 8], [21, 8], [16, 2]], C.red);
  rect(g, 12, 7, 8, 2, C.redDark);
  rect(g, 12, 20, 2, 2, C.goldDark);
  rect(g, 18, 20, 2, 2, C.goldDark);
}

function mortar(g) {
  circle(g, 16, 21, 9, C.ink);
  circle(g, 16, 21, 8, C.stoneDark);
  circle(g, 16, 21, 5.4, C.ink2);
  // tube angled up-left
  g.save();
  g.translate(16, 20);
  g.rotate(-0.7);
  rect(g, -3, -12, 7, 14, C.ink);
  rect(g, -2, -11, 5, 12, C.metalDark);
  rect(g, -1, -10, 2, 9, C.metal);
  rect(g, -4, -13, 9, 3, C.ink);
  rect(g, -3, -12, 7, 2, C.metalLight);
  g.restore();
  rect(g, 7, 25, 8, 2, C.wood);
  rect(g, 8, 24, 3, 2, C.woodLight);
}

function wizardTower(g) {
  rect(g, 11, 12, 10, 14, C.ink);
  rect(g, 12, 13, 8, 13, C.stoneDark);
  rect(g, 12, 13, 8, 2, C.stoneLight);
  rect(g, 14, 18, 4, 2, C.ink2);
  // crystal
  poly(g, [[16, 2], [22, 9], [16, 15], [10, 9]], C.ink);
  poly(g, [[16, 4], [20, 9], [16, 13], [12, 9]], C.blue);
  poly(g, [[16, 4], [18, 8], [16, 10], [14, 8]], C.cyan);
  rect(g, 12, 11, 8, 2, C.metal);
  rect(g, 9, 25, 14, 2, C.ink);
}

function airDefense(g) {
  rect(g, 7, 20, 18, 6, C.ink);
  rect(g, 8, 21, 16, 4, C.metalDark);
  rect(g, 8, 21, 16, 1, C.metal);
  // launcher tubes
  g.save();
  g.translate(12, 18);
  g.rotate(-0.22);
  rect(g, -2, -12, 5, 14, C.ink);
  rect(g, -1, -11, 3, 11, C.metal);
  rect(g, -1, -12, 3, 2, C.red);
  g.restore();
  g.save();
  g.translate(20, 18);
  g.rotate(0.22);
  rect(g, -2, -12, 5, 14, C.ink);
  rect(g, -1, -11, 3, 11, C.metal);
  rect(g, -1, -12, 3, 2, C.red);
  g.restore();
  rect(g, 9, 25, 14, 1, C.ink2);
}

function rubble(g) {
  poly(g, [[3, 26], [8, 18], [13, 22], [18, 16], [24, 21], [29, 26]], C.ink);
  poly(g, [[4, 26], [8, 20], [13, 23], [18, 18], [23, 22], [28, 26]], C.stoneDark);
  rect(g, 6, 23, 4, 2, C.stone);
  rect(g, 14, 22, 5, 2, C.stone);
  rect(g, 20, 23, 4, 2, C.stone);
  rect(g, 11, 24, 3, 2, C.brick);
  rect(g, 17, 24, 2, 2, C.brick);
  rect(g, 8, 21, 2, 2, C.mortar);
  rect(g, 22, 20, 2, 2, C.mortar);
}

/* ---------------------------------- units ---------------------------------- */

function barbarian(g) {
  // sword
  rect(g, 17, 8, 2, 10, C.metal);
  rect(g, 17, 8, 2, 2, C.metalLight);
  rect(g, 16, 17, 4, 2, C.woodDark);
  // head
  rect(g, 8, 7, 8, 7, C.ink);
  rect(g, 9, 8, 6, 6, C.skin);
  rect(g, 10, 5, 4, 3, C.gold);
  rect(g, 9, 4, 2, 2, C.gold);
  rect(g, 13, 4, 2, 2, C.gold);
  rect(g, 10, 10, 1, 1, C.ink);
  rect(g, 13, 10, 1, 1, C.ink);
  // body
  rect(g, 7, 13, 10, 6, C.ink);
  rect(g, 8, 13, 8, 6, C.wood);
  rect(g, 10, 14, 4, 1, C.woodLight);
  // arms
  rect(g, 5, 14, 2, 4, C.skin);
  rect(g, 17, 13, 2, 4, C.skin);
  // legs
  rect(g, 8, 19, 3, 3, C.skinDark);
  rect(g, 13, 19, 3, 3, C.skinDark);
  rect(g, 7, 21, 4, 2, C.ink);
  rect(g, 13, 21, 4, 2, C.ink);
}

function archer(g) {
  // bow
  rect(g, 18, 7, 2, 12, C.wood);
  rect(g, 17, 6, 1, 2, C.woodLight);
  rect(g, 17, 18, 1, 2, C.woodLight);
  rect(g, 17, 9, 1, 7, C.bone);
  // head + hood
  rect(g, 7, 6, 9, 8, C.ink);
  rect(g, 8, 7, 7, 6, C.green);
  rect(g, 9, 8, 5, 4, C.skin);
  rect(g, 10, 9, 1, 1, C.ink);
  rect(g, 13, 9, 1, 1, C.ink);
  rect(g, 6, 9, 2, 3, C.green);
  // body
  rect(g, 7, 13, 9, 6, C.ink);
  rect(g, 8, 13, 7, 6, C.greenDark);
  rect(g, 9, 14, 5, 1, C.green);
  // arms
  rect(g, 15, 12, 2, 4, C.skin);
  // legs
  rect(g, 8, 19, 3, 3, C.greenDark);
  rect(g, 13, 19, 3, 3, C.greenDark);
  rect(g, 7, 21, 4, 2, C.ink);
  rect(g, 13, 21, 4, 2, C.ink);
}

function goblin(g) {
  rect(g, 15, 11, 4, 2, C.metal);
  rect(g, 18, 9, 2, 3, C.metalLight);
  rect(g, 6, 8, 3, 2, C.greenDark);
  rect(g, 15, 8, 3, 2, C.greenDark);
  rect(g, 8, 7, 8, 7, C.ink);
  rect(g, 9, 8, 6, 5, C.green);
  rect(g, 10, 10, 1, 1, C.goldLight);
  rect(g, 13, 10, 1, 1, C.goldLight);
  rect(g, 9, 12, 6, 1, C.ink2);
  rect(g, 7, 14, 10, 5, C.ink);
  rect(g, 8, 14, 8, 5, C.woodDark);
  rect(g, 10, 15, 4, 2, C.woodLight);
  rect(g, 8, 19, 3, 3, C.greenDark);
  rect(g, 13, 19, 3, 3, C.greenDark);
  rect(g, 7, 21, 4, 2, C.ink);
  rect(g, 13, 21, 4, 2, C.ink);
}

function giant(g) {
  // fists
  rect(g, 2, 12, 4, 5, C.ink);
  rect(g, 3, 12, 3, 4, C.skin);
  rect(g, 18, 12, 4, 5, C.ink);
  rect(g, 18, 12, 3, 4, C.skin);
  // body
  rect(g, 5, 9, 14, 10, C.ink);
  rect(g, 6, 10, 12, 9, C.skin);
  rect(g, 6, 16, 12, 3, C.woodDark);
  rect(g, 7, 14, 10, 2, C.skinDark);
  // head
  rect(g, 7, 2, 10, 8, C.ink);
  rect(g, 8, 3, 8, 6, C.skin);
  rect(g, 9, 6, 6, 3, C.wood);
  rect(g, 9, 4, 1, 1, C.ink);
  rect(g, 14, 4, 1, 1, C.ink);
  // legs
  rect(g, 6, 19, 4, 4, C.ink);
  rect(g, 7, 19, 3, 4, C.blueDark);
  rect(g, 14, 19, 4, 4, C.ink);
  rect(g, 14, 19, 3, 4, C.blueDark);
}

function wallBreaker(g) {
  // bomb
  circle(g, 12, 15, 5, C.ink);
  circle(g, 12, 15, 4.2, C.woodDark);
  rect(g, 10, 12, 4, 1, C.wood);
  rect(g, 13, 8, 2, 4, C.metal);
  rect(g, 15, 6, 2, 2, C.gold);
  // skull head
  rect(g, 8, 4, 8, 7, C.ink);
  rect(g, 9, 5, 6, 5, C.bone);
  rect(g, 10, 7, 1, 1, C.ink);
  rect(g, 13, 7, 1, 1, C.ink);
  rect(g, 11, 9, 2, 1, C.ink2);
  // body
  rect(g, 8, 12, 8, 7, C.ink);
  rect(g, 9, 13, 6, 6, C.metalDark);
  rect(g, 10, 14, 4, 1, C.metal);
  // legs
  rect(g, 8, 19, 3, 3, C.ink);
  rect(g, 13, 19, 3, 3, C.ink);
}

function balloon(g) {
  // envelope
  rect(g, 5, 2, 14, 9, C.ink);
  rect(g, 6, 3, 12, 7, C.red);
  rect(g, 6, 3, 12, 2, C.redLight);
  rect(g, 7, 6, 4, 2, C.redDark);
  rect(g, 13, 7, 3, 2, C.redDark);
  rect(g, 5, 6, 2, 4, C.redDark);
  rect(g, 17, 6, 2, 4, C.redDark);
  rect(g, 8, 10, 2, 3, C.woodDark);
  rect(g, 14, 10, 2, 3, C.woodDark);
  // basket
  rect(g, 8, 15, 8, 5, C.ink);
  rect(g, 9, 16, 6, 4, C.wood);
  rect(g, 9, 16, 6, 1, C.woodLight);
  rect(g, 11, 14, 2, 1, C.metalDark);
}

function wizard(g) {
  // staff
  rect(g, 19, 8, 2, 13, C.woodDark);
  circle(g, 20, 6, 2.4, C.cyan);
  circle(g, 20, 6, 1.2, C.white);
  // hat
  poly(g, [[6, 10], [17, 10], [13, 2], [10, 2]], C.ink);
  poly(g, [[7, 9], [16, 9], [13, 3], [10, 3]], C.blue);
  rect(g, 6, 9, 12, 2, C.blueDark);
  // face
  rect(g, 9, 11, 6, 5, C.ink);
  rect(g, 10, 11, 4, 4, C.skin);
  rect(g, 11, 13, 1, 1, C.ink);
  rect(g, 13, 13, 1, 1, C.ink);
  rect(g, 9, 15, 6, 1, C.white);
  // robe
  rect(g, 7, 16, 10, 6, C.ink);
  rect(g, 8, 16, 8, 6, C.blue);
  rect(g, 10, 17, 4, 1, C.gold);
  rect(g, 7, 21, 10, 1, C.blueDark);
  rect(g, 7, 22, 4, 1, C.ink);
  rect(g, 13, 22, 4, 1, C.ink);
}

function healer(g) {
  // wings
  rect(g, 2, 9, 4, 7, C.ink);
  rect(g, 3, 10, 3, 5, C.elixirLight);
  rect(g, 18, 9, 4, 7, C.ink);
  rect(g, 18, 10, 3, 5, C.elixirLight);
  // halo
  rect(g, 9, 2, 6, 1, C.gold);
  rect(g, 8, 3, 1, 2, C.goldLight);
  rect(g, 15, 3, 1, 2, C.goldLight);
  // head
  rect(g, 9, 5, 6, 5, C.ink);
  rect(g, 10, 6, 4, 4, C.skin);
  rect(g, 8, 5, 8, 2, C.white);
  rect(g, 11, 8, 1, 1, C.ink);
  rect(g, 13, 8, 1, 1, C.ink);
  // robe
  rect(g, 8, 10, 8, 9, C.ink);
  rect(g, 9, 11, 6, 8, C.white);
  rect(g, 10, 12, 4, 1, C.gold);
  rect(g, 11, 14, 2, 4, C.red);
  rect(g, 10, 15, 4, 2, C.redLight);
  // feet
  rect(g, 8, 20, 3, 2, C.ink);
  rect(g, 13, 20, 3, 2, C.ink);
}

function dragon(g) {
  // wings
  poly(g, [[2, 4], [9, 8], [7, 15], [3, 12]], C.tealDark);
  poly(g, [[21, 3], [15, 8], [17, 15], [21, 11]], C.tealDark);
  poly(g, [[3, 5], [8, 9], [6, 13], [4, 11]], C.teal);
  poly(g, [[20, 4], [16, 9], [18, 13], [20, 10]], C.teal);
  // body
  rect(g, 6, 10, 12, 8, C.ink);
  rect(g, 7, 11, 10, 6, C.teal);
  rect(g, 8, 14, 8, 2, C.tealDark);
  // tail
  rect(g, 2, 15, 5, 3, C.ink);
  rect(g, 3, 15, 4, 2, C.teal);
  poly(g, [[1, 15], [4, 13], [4, 18]], C.tealDark);
  // head
  rect(g, 13, 5, 9, 7, C.ink);
  rect(g, 14, 6, 7, 5, C.teal);
  rect(g, 15, 6, 2, 2, C.white);
  rect(g, 16, 7, 1, 1, C.red);
  rect(g, 19, 8, 3, 2, C.tealDark);
  rect(g, 20, 6, 2, 2, C.bone);
  // legs
  rect(g, 8, 17, 3, 3, C.ink);
  rect(g, 14, 17, 3, 3, C.ink);
}

function pekka(g) {
  // horns
  poly(g, [[6, 6], [3, 2], [7, 3]], C.metalLight);
  poly(g, [[17, 6], [20, 2], [16, 3]], C.metalLight);
  // head
  rect(g, 7, 3, 10, 7, C.ink);
  rect(g, 8, 4, 8, 5, C.metalDark);
  rect(g, 9, 6, 2, 2, C.pink);
  rect(g, 13, 6, 2, 2, C.pink);
  rect(g, 10, 9, 4, 1, C.black);
  // body
  rect(g, 5, 10, 14, 9, C.ink);
  rect(g, 6, 11, 12, 8, C.metalDark);
  rect(g, 8, 12, 8, 2, C.metal);
  rect(g, 10, 14, 4, 3, C.pink);
  rect(g, 11, 15, 2, 2, C.white);
  rect(g, 4, 12, 2, 5, C.ink);
  rect(g, 18, 12, 2, 5, C.ink);
  // legs
  rect(g, 6, 19, 4, 4, C.ink);
  rect(g, 14, 19, 4, 4, C.ink);
  rect(g, 7, 19, 3, 3, C.metal);
  rect(g, 14, 19, 3, 3, C.metal);
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
  barbarian: barbarian,
  archer: archer,
  goblin: goblin,
  giant: giant,
  wallbreaker: wallBreaker,
  balloon: balloon,
  wizard: wizard,
  healer: healer,
  dragon: dragon,
  pekka: pekka,
};

const SIZE = {
  wall: WALL_SIZE,
  cannonBarrel: 20,
};

export function getSprite(key) {
  if (cache.has(key)) return cache.get(key);
  const node = canvas(SIZE[key] || (key === 'cannonBarrel' ? 20 : UNIT_SPRITES[key] ? UNIT_SIZE : BUILDING_SIZE));
  const g = node.getContext('2d');
  g.imageSmoothingEnabled = false;
  const draw =
    key === 'cannonBarrel'
      ? cannonBarrel
      : BUILDING_SPRITES[key] || UNIT_SPRITES[key] || rubble;
  draw(g);
  cache.set(key, node);
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
