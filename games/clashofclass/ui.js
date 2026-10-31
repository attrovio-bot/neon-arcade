/**
 * CLASH OF CLASS — DOM overlay UI.
 *
 * Four screens live on top of the canvas: the base shelf (level select), the
 * army composer (spend your points, no training time), the battle HUD
 * (destruction, stars, timer, deploy tray) and the raid result modal.
 * Screens are built once and refreshed per visit so level data never goes stale.
 */

import { UNITS, UNIT_BY_ID, LEVELS, THEMES, CELL_TYPES, DEFENSES, BATTLE_TIME } from './data.js';
import { makeIcon } from './sprites.js';

const CSS = `
.cc-ui{position:absolute;inset:0;z-index:2;pointer-events:none;color:#f0e6cf;
  font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --cc-gold:#f2c53d;--cc-gold2:#c4912a;--cc-green:#78d64b;--cc-green2:#3f6f22;
  --cc-red:#e5533c;--cc-ink:#171208;--cc-panel:rgba(22,18,10,.93);--cc-line:rgba(242,197,61,.28);
  --cc-dim:#b3a486;--cc-parch:#f0e6cf;}
.cc-ui *{box-sizing:border-box}
.cc-ui button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.cc-ui [hidden]{display:none!important}
.cc-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}

/* screens -------------------------------------------------------------- */
.cc-screen{position:absolute;inset:0;pointer-events:auto;overflow-y:auto;overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;padding:calc(76px + env(safe-area-inset-top)) 14px calc(20px + env(safe-area-inset-bottom));
  background:
    radial-gradient(120% 70% at 50% -10%,rgba(84,140,44,.34),transparent 60%),
    radial-gradient(90% 60% at 50% 115%,rgba(242,197,61,.12),transparent 65%),
    linear-gradient(180deg,rgba(10,14,7,.88),rgba(8,11,6,.96));
  backdrop-filter:blur(3px)}
.cc-wrap{max-width:460px;margin:0 auto}
.cc-kicker{display:inline-flex;align-items:center;gap:7px;font-family:ui-monospace,monospace;font-size:.54rem;
  letter-spacing:.18em;text-transform:uppercase;color:#a9c48a}
.cc-kicker::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--cc-gold);box-shadow:0 0 9px rgba(242,197,61,.8)}
.cc-title{margin:10px 0 4px;font-size:clamp(38px,12vw,54px);line-height:.92;font-weight:800;letter-spacing:-.02em;
  background:linear-gradient(100deg,#fdf3d0 5%,var(--cc-gold) 48%,#c98a2e 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.cc-lede{margin:0 0 14px;color:#c9bb9c;font-size:.78rem;line-height:1.55;max-width:44ch}
.cc-progress{display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap}
.cc-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:99px;
  border:1px solid var(--cc-line);background:rgba(242,197,61,.07);font-size:.6rem;letter-spacing:.06em;
  text-transform:uppercase;color:#ecd9a2;font-family:ui-monospace,monospace}
.cc-chip.stars{color:var(--cc-gold)}

/* level cards ---------------------------------------------------------- */
.cc-levels{display:grid;gap:9px}
.cc-level{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:10px;border-radius:15px;
  border:1px solid rgba(242,197,61,.22);background:linear-gradient(100deg,rgba(46,64,24,.55),rgba(20,17,10,.72));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 8px 22px rgba(0,0,0,.35);transition:transform .12s}
.cc-level:active{transform:scale(.985)}
.cc-level.is-locked{opacity:.5;filter:saturate(.4)}
.cc-thumb{flex:0 0 auto;width:74px;height:74px;border-radius:11px;border:1px solid rgba(242,197,61,.3);
  background:#0c1207;overflow:hidden}
.cc-thumb canvas{display:block;width:100%;height:100%}
.cc-level .grow{flex:1;min-width:0}
.cc-level b{display:block;font-size:.95rem;letter-spacing:.01em;color:#f6ecc9}
.cc-level small{display:block;font-size:.62rem;color:var(--cc-dim);margin-top:2px;line-height:1.4}
.cc-level .tags{display:flex;gap:5px;margin-top:6px;flex-wrap:wrap}
.cc-tag{font-size:.53rem;letter-spacing:.07em;text-transform:uppercase;padding:3px 7px;border-radius:99px;
  border:1px solid rgba(242,197,61,.25);color:#e7d49b;background:rgba(242,197,61,.06);font-family:ui-monospace,monospace}
.cc-level .stars{font-size:.8rem;color:var(--cc-gold);letter-spacing:.1em;margin-top:5px}
.cc-level .stars .off{color:rgba(240,230,207,.18)}
.cc-level .chev{flex:0 0 auto;color:var(--cc-gold);font-size:1.2rem;opacity:.8}
.cc-level .lock{font-size:.6rem;color:var(--cc-dim);letter-spacing:.08em;text-transform:uppercase;margin-top:5px}

/* how to --------------------------------------------------------------- */
.cc-how{margin-top:14px;border-top:1px solid rgba(242,197,61,.16);padding-top:10px}
.cc-how summary{font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--cc-dim);cursor:pointer}
.cc-how ol{margin:8px 0 0;padding-left:18px;color:#b9ab8e;font-size:.66rem;line-height:1.7}
.cc-how b{color:#ead9a8}

/* army composer -------------------------------------------------------- */
.cc-topbar{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.cc-back{flex:0 0 auto;width:38px;height:38px;border-radius:12px;border:1px solid var(--cc-line);
  background:rgba(242,197,61,.07);color:#ecd9a2;font-size:1.05rem;display:grid;place-items:center}
.cc-topbar .titles{flex:1;min-width:0}
.cc-topbar .titles b{display:block;font-size:.92rem;color:#f6ecc9;letter-spacing:.02em}
.cc-topbar .titles small{display:block;font-size:.58rem;color:var(--cc-dim);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cc-budget{flex:0 0 auto;text-align:right}
.cc-budget b{display:block;font-family:ui-monospace,monospace;font-size:.95rem;color:var(--cc-gold)}
.cc-budget small{display:block;font-size:.5rem;letter-spacing:.14em;text-transform:uppercase;color:var(--cc-dim)}
.cc-mini{display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;border:1px solid rgba(242,197,61,.18);
  background:rgba(255,255,255,.02);margin-bottom:10px}
.cc-mini canvas{flex:0 0 auto;width:64px;height:64px;border-radius:9px;border:1px solid rgba(242,197,61,.25);background:#0c1207}
.cc-mini .facts{flex:1;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}
.cc-mini .facts label{display:block;font-size:.54rem;color:var(--cc-dim);letter-spacing:.06em;text-transform:uppercase}
.cc-mini .facts b{display:block;font-size:.72rem;color:#ead9a8;font-family:ui-monospace,monospace;margin-top:1px}
.cc-points{margin:2px 0 10px}
.cc-points .row{display:flex;justify-content:space-between;font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--cc-dim);margin-bottom:5px}
.cc-points .row b{color:var(--cc-gold);font-family:ui-monospace,monospace}
.cc-points .bar{height:8px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden;border:1px solid rgba(242,197,61,.18)}
.cc-points .bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#78d64b,#f2c53d);transition:width .15s}
.cc-points .bar i.is-max{background:linear-gradient(90deg,#f2c53d,#ef776a)}
.cc-units{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-bottom:6px}
@media (min-width:560px){.cc-units{grid-template-columns:1fr 1fr 1fr}}
.cc-unit{border:1px solid rgba(242,197,61,.2);border-radius:13px;background:rgba(255,255,255,.025);
  padding:8px;display:flex;flex-direction:column;gap:5px}
.cc-unit.is-full{border-color:rgba(229,83,60,.5)}
.cc-unit .head{display:flex;align-items:center;gap:7px}
.cc-unit .head canvas{width:34px;height:34px;flex:0 0 auto;image-rendering:pixelated}
.cc-unit .head .nm{flex:1;min-width:0}
.cc-unit .head .nm b{display:block;font-size:.68rem;color:#f2e6c4;letter-spacing:.02em}
.cc-unit .head .nm small{display:block;font-size:.52rem;color:var(--cc-dim);font-family:ui-monospace,monospace;margin-top:1px}
.cc-unit .desc{font-size:.55rem;color:#a99a7c;line-height:1.35;min-height:2.1em}
.cc-unit .stepper{display:flex;align-items:center;gap:6px}
.cc-unit .stepper button{flex:0 0 auto;width:34px;height:30px;border-radius:9px;border:1px solid rgba(242,197,61,.35);
  background:rgba(242,197,61,.1);color:#f2dc9e;font-size:.95rem;line-height:1;display:grid;place-items:center;user-select:none}
.cc-unit .stepper button:active{background:rgba(242,197,61,.25)}
.cc-unit .stepper button[disabled]{opacity:.3;pointer-events:none}
.cc-unit .stepper .count{flex:1;text-align:center;font-family:ui-monospace,monospace;font-size:1.05rem;color:#f6ecc9}
.cc-unit .stepper .count small{display:block;font-size:.48rem;color:var(--cc-dim);letter-spacing:.08em}
.cc-actions{display:flex;gap:7px;margin-top:10px}
.cc-btn{flex:1;padding:11px 8px;border-radius:12px;border:1px solid rgba(242,197,61,.3);background:rgba(242,197,61,.08);
  color:#eed9a4;font-size:.66rem;letter-spacing:.09em;text-transform:uppercase}
.cc-btn:active{background:rgba(242,197,61,.2)}
.cc-btn.attack{flex:1.6;border-color:rgba(120,214,75,.6);background:linear-gradient(100deg,rgba(120,214,75,.22),rgba(242,197,61,.14));
  color:#dff5b8;font-weight:700;font-size:.74rem}
.cc-btn.attack[disabled]{opacity:.35;border-color:rgba(242,197,61,.2);background:rgba(255,255,255,.03)}

/* battle hud ----------------------------------------------------------- */
.cc-hud{position:absolute;inset:0;pointer-events:none;z-index:3}
.cc-hudtop{position:absolute;top:calc(66px + env(safe-area-inset-top));left:calc(8px + env(safe-area-inset-left));
  right:calc(8px + env(safe-area-inset-right));display:flex;align-items:center;gap:8px}
.cc-dest{flex:1;min-width:0;padding:6px 10px 7px;border-radius:12px;border:1px solid rgba(242,197,61,.3);
  background:rgba(16,13,7,.82);backdrop-filter:blur(8px)}
.cc-dest .row{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.cc-dest .row b{font-size:1.05rem;font-family:ui-monospace,monospace;color:#f6ecc9}
.cc-dest .row small{font-size:.5rem;letter-spacing:.12em;text-transform:uppercase;color:var(--cc-dim)}
.cc-dest .bar{position:relative;height:7px;border-radius:99px;background:rgba(255,255,255,.08);margin-top:5px;overflow:hidden}
.cc-dest .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#78d64b,#f2c53d);transition:width .2s}
.cc-dest .bar u{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--cc-gold);opacity:.9}
.cc-stars{display:flex;gap:3px;padding:7px 9px;border-radius:12px;border:1px solid rgba(242,197,61,.3);
  background:rgba(16,13,7,.82);backdrop-filter:blur(8px);font-size:.95rem;color:var(--cc-gold)}
.cc-stars .off{color:rgba(240,230,207,.16)}
.cc-timer{padding:7px 10px;border-radius:12px;border:1px solid rgba(242,197,61,.3);background:rgba(16,13,7,.82);
  backdrop-filter:blur(8px);font-family:ui-monospace,monospace;font-size:.8rem;color:#f6ecc9;text-align:center;line-height:1.1}
.cc-timer small{display:block;font-size:.48rem;letter-spacing:.14em;color:var(--cc-dim);text-transform:uppercase}
.cc-timer.is-low{color:#ef776a;border-color:rgba(229,83,60,.5)}
.cc-end{pointer-events:auto;flex:0 0 auto;padding:9px 10px;border-radius:12px;border:1px solid rgba(229,83,60,.4);
  background:rgba(80,20,12,.55);color:#f0b9a4;font-size:.56rem;letter-spacing:.1em;text-transform:uppercase}
.cc-traywrap{position:absolute;left:0;right:0;bottom:calc(8px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:6px;align-items:center}
.cc-hint{font-size:.58rem;letter-spacing:.06em;color:#cfe6a8;background:rgba(16,20,8,.78);border:1px solid rgba(120,214,75,.3);
  padding:4px 10px;border-radius:99px;backdrop-filter:blur(6px);max-width:92%;text-align:center}
.cc-tray{pointer-events:auto;display:flex;gap:6px;padding:7px 8px;border-radius:16px;border:1px solid rgba(242,197,61,.28);
  background:rgba(16,13,7,.86);backdrop-filter:blur(10px);max-width:100%;overflow-x:auto;scrollbar-width:none}
.cc-tray::-webkit-scrollbar{display:none}
.cc-slot{position:relative;flex:0 0 auto;width:52px;padding:5px 3px 4px;border-radius:12px;border:1px solid rgba(242,197,61,.2);
  background:rgba(255,255,255,.03);display:flex;flex-direction:column;align-items:center;gap:2px}
.cc-slot canvas{width:30px;height:30px;image-rendering:pixelated}
.cc-slot b{font-size:.56rem;font-family:ui-monospace,monospace;color:#e7d8ae}
.cc-slot small{font-size:.42rem;letter-spacing:.05em;color:var(--cc-dim);text-transform:uppercase;text-align:center;
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.cc-slot.is-on{border-color:var(--cc-gold);background:rgba(242,197,61,.14);box-shadow:0 0 12px rgba(242,197,61,.25)}
.cc-slot.is-out{opacity:.32}
.cc-empty{padding:10px 16px;font-size:.62rem;color:var(--cc-dim);letter-spacing:.06em;text-transform:uppercase}

/* result ---------------------------------------------------------------- */
.cc-result{position:absolute;inset:0;z-index:6;display:grid;place-items:center;padding:20px;
  background:rgba(6,9,4,.62);backdrop-filter:blur(4px);pointer-events:auto}
.cc-card{width:100%;max-width:360px;border-radius:20px;border:1px solid rgba(242,197,61,.4);
  background:linear-gradient(180deg,rgba(34,28,15,.97),rgba(16,13,8,.98));padding:18px 16px 16px;text-align:center;
  box-shadow:0 24px 70px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06)}
.cc-card .kick{font-family:ui-monospace,monospace;font-size:.52rem;letter-spacing:.2em;text-transform:uppercase;color:var(--cc-dim)}
.cc-card h2{margin:6px 0 2px;font-size:1.7rem;letter-spacing:-.01em;color:#f8efd2}
.cc-card h2.win{color:#b6ec7d}
.cc-card h2.lose{color:#ef9a86}
.cc-bigstars{display:flex;justify-content:center;gap:8px;margin:10px 0 4px;font-size:2rem}
.cc-bigstars span{color:rgba(240,230,207,.14);transform:scale(.6);opacity:0;animation:ccpop .4s forwards}
.cc-bigstars span.on{color:var(--cc-gold);text-shadow:0 0 18px rgba(242,197,61,.55)}
.cc-bigstars span:nth-child(2){animation-delay:.18s}
.cc-bigstars span:nth-child(3){animation-delay:.36s}
@keyframes ccpop{60%{transform:scale(1.25);opacity:1}100%{transform:scale(1);opacity:1}}
.cc-pct{font-family:ui-monospace,monospace;font-size:1.5rem;color:#f6ecc9;margin:4px 0 2px}
.cc-goal{font-size:.62rem;letter-spacing:.05em;margin-bottom:4px}
.cc-goal.ok{color:#a8dd7e}
.cc-goal.miss{color:#ef9a86}
.cc-note{font-size:.56rem;color:var(--cc-dim);margin-bottom:8px}
.cc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:10px 0 14px}
.cc-stats div{padding:7px 3px;border-radius:10px;border:1px solid rgba(242,197,61,.16);background:rgba(255,255,255,.025)}
.cc-stats b{display:block;font-size:.72rem;color:#f2e6c4;font-family:ui-monospace,monospace}
.cc-stats span{display:block;font-size:.44rem;letter-spacing:.1em;text-transform:uppercase;color:var(--cc-dim);margin-top:2px}
.cc-card .row{display:flex;gap:7px}
.cc-card .row .cc-btn{padding:12px 8px}

/* flash ------------------------------------------------------------------ */
.cc-flash{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom));transform:translate(-50%,10px);
  max-width:86%;padding:8px 14px;border-radius:99px;border:1px solid var(--cc-line);background:rgba(20,16,8,.94);
  font-size:.64rem;letter-spacing:.03em;text-align:center;opacity:0;transition:.2s;pointer-events:none;z-index:9;
  box-shadow:0 10px 26px rgba(0,0,0,.5)}
.cc-flash.show{opacity:1;transform:translate(-50%,0)}
.cc-flash.good{border-color:rgba(120,214,75,.5);color:#d9f2b6}
.cc-flash.bad{border-color:rgba(229,83,60,.5);color:#f2b9a8}
`;

/* --------------------------------- helpers -------------------------------- */

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function holdRepeat(button, fn) {
  let timer = null;
  let delay = null;
  const start = (event) => {
    event.preventDefault();
    fn();
    delay = setTimeout(() => {
      timer = setInterval(fn, 70);
    }, 320);
  };
  const stop = () => {
    clearTimeout(delay);
    clearInterval(timer);
    delay = null;
    timer = null;
  };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function countCells(level) {
  let defenses = 0;
  let buildings = 0;
  let walls = 0;
  for (const row of level.map) {
    for (const ch of row) {
      const type = CELL_TYPES[ch];
      if (!type) continue;
      if (type === 'wall') {
        walls += 1;
        continue;
      }
      buildings += 1;
      if (DEFENSES[type]) defenses += 1;
    }
  }
  return { defenses, buildings, walls };
}

const CELL_COLORS = {
  town_hall: '#f2c53d',
  cannon: '#9aa2a8',
  archer_tower: '#b8c0c6',
  mortar: '#7c8489',
  wizard_tower: '#9a6ae0',
  air_defense: '#646c74',
  gold_mine: '#c4912a',
  elixir_collector: '#b95be6',
  gold_storage: '#e8b93c',
  elixir_storage: '#c97bee',
  army_camp: '#5f9e33',
  laboratory: '#e8e2cf',
  wall: '#6f6a5c',
};

function drawMapThumb(canvas, level) {
  const g = canvas.getContext('2d');
  const w = (canvas.width = 140);
  const h = (canvas.height = 140);
  const cell = w / 14;
  const theme = THEMES[level.theme] || THEMES.grass;
  g.fillStyle = theme.grassDark;
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < 14; y++) {
    const row = level.map[y] ?? '';
    for (let x = 0; x < 14; x++) {
      const type = CELL_TYPES[row[x]];
      if (!type) continue;
      g.fillStyle = CELL_COLORS[type] || '#888';
      g.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
    }
  }
}

/* ----------------------------------- UI ----------------------------------- */

export function createUI(stage, callbacks) {
  const style = document.createElement('style');
  style.textContent = CSS;
  stage.appendChild(style);

  const root = el('div', 'cc-ui');
  stage.appendChild(root);

  let levelsEl = null;
  let armyEl = null;
  let hudEl = null;
  let resultEl = null;
  let flashEl = null;
  let flashTimer = null;

  // Refreshed per visit so a screen never shows another level's data.
  let armyRefs = null;
  let hudRefs = null;
  let hudCache = {};

  let army = [];
  let budget = 0;

  const cost = (type) => UNIT_BY_ID[type].cost;
  const used = () => army.reduce((sum, row) => sum + row.count * cost(row.type), 0);
  const countOf = (type) => army.find((row) => row.type === type)?.count ?? 0;

  function addUnit(type, n = 1) {
    const def = UNIT_BY_ID[type];
    let row = army.find((item) => item.type === type);
    for (let i = 0; i < n; i++) {
      if (used() + def.cost > budget) return false;
      if (!row) {
        row = { type, count: 0 };
        army.push(row);
      }
      row.count += 1;
    }
    return true;
  }

  function removeUnit(type) {
    const row = army.find((item) => item.type === type);
    if (!row) return;
    row.count -= 1;
    if (row.count <= 0) army = army.filter((item) => item !== row);
  }

  function autoFill() {
    army = [];
    const shares = [
      ['giant', 0.4],
      ['barbarian', 0.26],
      ['archer', 0.18],
      ['wizard', 0.1],
      ['wallbreaker', 0.06],
    ];
    for (const [type, share] of shares) {
      const def = UNIT_BY_ID[type];
      const count = Math.floor((budget * share) / def.cost);
      if (count > 0) addUnit(type, count);
    }
    while (used() + cost('barbarian') <= budget && addUnit('barbarian')) {
      /* fill the remainder with cheap meat shields */
    }
    while (used() + cost('goblin') <= budget && addUnit('goblin')) {
      /* then goblins */
    }
  }

  function hideAll() {
    for (const node of [levelsEl, armyEl, hudEl, resultEl]) {
      if (node) node.hidden = true;
    }
  }

  /* ------------------------------ level shelf ------------------------------ */

  function showLevels(save) {
    hideAll();
    if (!levelsEl) {
      levelsEl = el('div', 'cc-screen');
      const wrap = el('div', 'cc-wrap');
      wrap.append(
        el('p', 'cc-kicker', 'Attack only · no village to build'),
        el('h1', 'cc-title', 'Clash of Class'),
        el(
          'p',
          'cc-lede',
          'Three villages stand between you and glory. Spend your points on an army — no training, no waiting — drop it on the blue grass and break the base.',
        ),
      );
      const chips = el('div', 'cc-progress');
      const starChip = el('span', 'cc-chip stars', '★ 0 / 9');
      const playsChip = el('span', 'cc-chip', '0 raids');
      chips.append(starChip, playsChip);
      const list = el('div', 'cc-levels');
      const how = el('details', 'cc-how');
      how.append(el('summary', null, 'How a raid works'));
      const ol = el('ol');
      for (const line of [
        '<b>Compose</b> — spend the point budget on any mix of troops. Instantly, no training.',
        '<b>Deploy</b> — tap or hold the blue grass ring. The clock starts on the first drop.',
        '<b>Destroy</b> — reach the target destruction to unlock the next base. Town Hall, 50% and 100% earn stars.',
      ]) {
        const li = el('li');
        li.innerHTML = line;
        ol.append(li);
      }
      how.append(ol);
      wrap.append(chips, list, how);
      levelsEl.append(wrap);
      root.append(levelsEl);
      levelsEl._chips = { starChip, playsChip, list };
    }

    const { starChip, playsChip, list } = levelsEl._chips;
    const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
    starChip.textContent = `★ ${totalStars} / ${LEVELS.length * 3}`;
    playsChip.textContent = `${save.plays || 0} raid${save.plays === 1 ? '' : 's'}`;
    list.replaceChildren();

    for (const lv of LEVELS) {
      const locked = lv.order > save.unlocked;
      const card = el('button', `cc-level${locked ? ' is-locked' : ''}`);
      card.type = 'button';
      const thumb = el('span', 'cc-thumb');
      const tc = document.createElement('canvas');
      drawMapThumb(tc, lv);
      thumb.append(tc);
      const grow = el('span', 'grow');
      grow.append(el('b', null, `${lv.order}. ${lv.name}`));
      grow.append(el('small', null, lv.tagline));
      const tags = el('span', 'tags');
      tags.append(el('span', 'cc-tag', `${lv.budget} pts`));
      tags.append(el('span', 'cc-tag', `target ${lv.winPct}%`));
      const counts = countCells(lv);
      tags.append(el('span', 'cc-tag', `${counts.defenses} defenses`));
      grow.append(tags);
      const stars = el('span', 'stars');
      const earned = save.stars[lv.order] || 0;
      for (let i = 0; i < 3; i++) stars.append(el('span', i < earned ? '' : 'off', '★'));
      grow.append(stars);
      if (locked) {
        grow.append(el('span', 'lock', `Win ${LEVELS[lv.order - 2]?.name ?? 'the previous base'} to unlock`));
      }
      card.append(thumb, grow, el('span', 'chev', locked ? '🔒' : '›'));
      card.addEventListener('click', () => {
        if (locked) {
          flash('Win the previous base to unlock this one.', 'bad');
          callbacks.onSound?.('deny');
          return;
        }
        callbacks.onPickLevel(lv.order);
      });
      list.append(card);
    }
    levelsEl.hidden = false;
  }

  /* ----------------------------- army composer ----------------------------- */

  function showArmy(lv, save, initialArmy) {
    hideAll();
    budget = lv.budget;
    army = Array.isArray(initialArmy)
      ? initialArmy.filter((row) => row.count > 0).map((row) => ({ ...row }))
      : [];

    if (!armyEl) {
      armyEl = el('div', 'cc-screen');
      const wrap = el('div', 'cc-wrap');

      const top = el('div', 'cc-topbar');
      const back = el('button', 'cc-back', '‹');
      back.type = 'button';
      back.setAttribute('aria-label', 'Back to bases');
      back.addEventListener('click', () => callbacks.onBackLevels());
      const titles = el('span', 'titles');
      const title = el('b', null, '');
      const tagline = el('small', null, '');
      titles.append(title, tagline);
      const budgetBox = el('span', 'cc-budget');
      const budgetNum = el('b', 'cc-mono', '');
      budgetBox.append(budgetNum, el('small', null, 'points'));
      top.append(back, titles, budgetBox);
      wrap.append(top);

      const mini = el('div', 'cc-mini');
      const tc = document.createElement('canvas');
      const facts = el('span', 'facts');
      const factDefs = [
        ['Target', 'target'],
        ['Buildings', 'buildings'],
        ['Defenses', 'defenses'],
        ['Walls', 'walls'],
      ];
      const factRefs = {};
      for (const [label, key] of factDefs) {
        const box = el('label', null, label);
        const val = el('b', 'cc-mono', '');
        box.append(val);
        facts.append(box);
        factRefs[key] = val;
      }
      mini.append(tc, facts);
      wrap.append(mini);

      const points = el('div', 'cc-points');
      const prow = el('div', 'row');
      prow.append(el('span', null, 'Army points'));
      const pointsLabel = el('b', 'cc-mono', '');
      prow.append(pointsLabel);
      const bar = el('div', 'bar');
      const fill = el('i');
      bar.append(fill);
      points.append(prow, bar);
      wrap.append(points);

      const grid = el('div', 'cc-units');
      for (const unit of UNITS) {
        const card = el('div', 'cc-unit');
        card.dataset.type = unit.id;
        const head = el('span', 'head');
        head.append(makeIcon(unit.id, 34));
        const nm = el('span', 'nm');
        nm.append(el('b', null, unit.name));
        nm.append(el('small', 'cc-mono', `${unit.cost} pts`));
        head.append(nm);
        card.append(head, el('p', 'desc', unit.desc));
        const step = el('span', 'stepper');
        const minus = el('button', null, '−');
        minus.type = 'button';
        minus.setAttribute('aria-label', `Remove ${unit.name}`);
        const countBox = el('span', 'count');
        const countNum = el('b', 'cc-mono', '0');
        countBox.append(countNum, el('small', null, 'troops'));
        const plus = el('button', null, '+');
        plus.type = 'button';
        plus.setAttribute('aria-label', `Add ${unit.name}`);
        holdRepeat(minus, () => {
          removeUnit(unit.id);
          refreshArmy();
          callbacks.onSound?.('tick');
        });
        holdRepeat(plus, () => {
          if (!addUnit(unit.id)) {
            flash('Not enough points left.', 'bad');
            callbacks.onSound?.('deny');
          } else {
            refreshArmy();
            callbacks.onSound?.('tick');
          }
        });
        step.append(minus, countBox, plus);
        card.append(step);
        grid.append(card);
      }
      wrap.append(grid);

      const actions = el('div', 'cc-actions');
      const autoBtn = el('button', 'cc-btn', 'Auto-fill');
      autoBtn.type = 'button';
      autoBtn.addEventListener('click', () => {
        autoFill();
        refreshArmy();
        flash('A balanced army, on the house.', 'good');
      });
      const clearBtn = el('button', 'cc-btn', 'Clear');
      clearBtn.type = 'button';
      clearBtn.addEventListener('click', () => {
        army = [];
        refreshArmy();
      });
      const fight = el('button', 'cc-btn attack', 'Pick your army ›');
      fight.type = 'button';
      fight.addEventListener('click', () => {
        if (!army.length) return;
        callbacks.onFight(army.map((row) => ({ ...row })));
      });
      actions.append(autoBtn, clearBtn, fight);
      wrap.append(actions);
      armyEl.append(wrap);
      root.append(armyEl);

      armyRefs = { title, tagline, budgetNum, thumb: tc, factRefs, pointsLabel, fill, fight };
    }

    const refs = armyRefs;
    refs.title.textContent = `${lv.order}. ${lv.name}`;
    refs.tagline.textContent = lv.tagline;
    refs.budgetNum.textContent = String(lv.budget);
    drawMapThumb(refs.thumb, lv);
    const counts = countCells(lv);
    refs.factRefs.target.textContent = `${lv.winPct}%`;
    refs.factRefs.buildings.textContent = String(counts.buildings);
    refs.factRefs.defenses.textContent = String(counts.defenses);
    refs.factRefs.walls.textContent = String(counts.walls);
    refreshArmy();
    armyEl.hidden = false;
  }

  function refreshArmy() {
    const refs = armyRefs;
    if (!refs) return;
    const usedNow = used();
    const pct = Math.min(100, (usedNow / budget) * 100);
    refs.fill.style.width = `${pct}%`;
    refs.fill.classList.toggle('is-max', usedNow >= budget);
    refs.pointsLabel.textContent = `${usedNow} / ${budget}`;
    for (const card of armyEl.querySelectorAll('.cc-unit')) {
      const type = card.dataset.type;
      const n = countOf(type);
      card.querySelector('.count b').textContent = String(n);
      const cantAfford = usedNow + cost(type) > budget;
      card.classList.toggle('is-full', cantAfford && n === 0);
      const buttons = card.querySelectorAll('.stepper button');
      buttons[1].disabled = cantAfford;
      buttons[0].disabled = n === 0;
    }
    const total = army.reduce((s, row) => s + row.count, 0);
    refs.fight.disabled = army.length === 0;
    refs.fight.textContent = total ? `Raid with ${total} troops ›` : 'Pick your army ›';
  }

  /* ------------------------------- battle hud ------------------------------ */

  function showBattle(lv, battle) {
    hideAll();
    if (!hudEl) {
      hudEl = el('div', 'cc-hud');
      const top = el('div', 'cc-hudtop');
      const dest = el('div', 'cc-dest');
      const drow = el('div', 'row');
      const destPct = el('b', 'cc-mono', '0%');
      const targetLabel = el('small', null, '');
      drow.append(destPct, targetLabel);
      const dbar = el('div', 'bar');
      const dfill = el('i');
      const tick = el('u');
      dbar.append(dfill, tick);
      dest.append(drow, dbar);
      const starsBox = el('div', 'cc-stars');
      const starSlots = [];
      for (let i = 0; i < 3; i++) {
        const s = el('span', 'off', '★');
        starSlots.push(s);
        starsBox.append(s);
      }
      const timer = el('div', 'cc-timer');
      const timerNum = el('b', 'cc-mono', '');
      timer.append(el('small', null, 'time'), timerNum);
      const end = el('button', 'cc-end', 'End raid');
      end.type = 'button';
      end.addEventListener('click', () => callbacks.onEndRaid());
      top.append(dest, starsBox, timer, end);
      hudEl.append(top);

      const traywrap = el('div', 'cc-traywrap');
      const hint = el('p', 'cc-hint', '');
      const tray = el('div', 'cc-tray');
      traywrap.append(hint, tray);
      hudEl.append(traywrap);
      root.append(hudEl);

      hudRefs = { destPct, dfill, tick, targetLabel, starSlots, timer, timerNum, hint, tray };
    }

    hudRefs.targetLabel.textContent = `target ${lv.winPct}%`;
    hudRefs.tick.style.left = `${lv.winPct}%`;
    hudRefs.timerNum.textContent = fmtTime(BATTLE_TIME);
    hudRefs.timer.classList.remove('is-low');

    hudRefs.tray.replaceChildren();
    for (const row of battle.queue) {
      const slot = el('button', 'cc-slot');
      slot.type = 'button';
      slot.dataset.type = row.type;
      slot.append(makeIcon(row.type, 30));
      slot.append(el('b', 'cc-mono', String(row.count)));
      slot.append(el('small', null, UNIT_BY_ID[row.type].name));
      slot.addEventListener('click', () => {
        callbacks.onSelectType(row.type);
        callbacks.onSound?.('tick');
      });
      hudRefs.tray.append(slot);
    }
    if (!battle.queue.length) hudRefs.tray.append(el('span', 'cc-empty', 'No troops left'));

    hudCache = {};
    updateBattle(battle);
    hudEl.hidden = false;
  }

  function updateBattle(battle) {
    if (!hudEl || hudEl.hidden || !hudRefs) return;

    if (hudCache.pct !== battle.pct) {
      hudCache.pct = battle.pct;
      hudRefs.destPct.textContent = `${battle.pct}%`;
      hudRefs.dfill.style.width = `${Math.min(100, battle.pct)}%`;
    }
    if (hudCache.stars !== battle.stars) {
      hudCache.stars = battle.stars;
      hudRefs.starSlots.forEach((slot, i) => slot.classList.toggle('off', i >= battle.stars));
    }
    const time = Math.ceil(battle.timeLeft);
    if (hudCache.time !== time) {
      hudCache.time = time;
      hudRefs.timerNum.textContent = fmtTime(time);
      hudRefs.timer.classList.toggle('is-low', time <= 30 && battle.started);
    }

    const sig = battle.queue.map((row) => `${row.type}:${row.count}`).join('|') + `#${battle.selected}`;
    if (hudCache.traySig !== sig) {
      hudCache.traySig = sig;
      for (const slot of hudRefs.tray.querySelectorAll('.cc-slot')) {
        const row = battle.queue.find((item) => item.type === slot.dataset.type);
        slot.querySelector('b').textContent = row ? String(row.count) : '0';
        slot.classList.toggle('is-out', !row);
        slot.classList.toggle('is-on', battle.selected === slot.dataset.type);
      }
      const left = battle.queue.reduce((s, row) => s + row.count, 0);
      hudRefs.hint.textContent =
        battle.phase === 'deploy'
          ? 'Tap or hold the blue grass to deploy'
          : left > 0
            ? 'Tap the blue grass to send more troops'
            : 'All troops deployed — hold the line';
    }
  }

  /* -------------------------------- result --------------------------------- */

  function showResult(result, lv, save) {
    hideAll();
    if (resultEl) resultEl.remove();
    resultEl = el('div', 'cc-result');
    const card = el('div', 'cc-card');
    card.append(el('p', 'kick', result.won ? 'base demolished' : 'raid failed'));
    const title = el(
      'h2',
      result.won ? 'win' : 'lose',
      result.won ? 'Victory!' : result.retreated ? 'Raid called off' : 'Not enough rubble',
    );
    card.append(title);

    const big = el('div', 'cc-bigstars');
    for (let i = 0; i < 3; i++) big.append(el('span', i < result.stars ? 'on' : '', '★'));
    card.append(big);

    card.append(el('p', 'cc-pct', `${result.pct}% destroyed`));
    const goal = el('p', `cc-goal ${result.won ? 'ok' : 'miss'}`);
    goal.textContent = result.won
      ? `Target ${result.threshold}% reached — the next base is unlocked.`
      : `You needed ${result.threshold}% destruction. The village holds.`;
    card.append(goal);
    if (result.retreated) card.append(el('p', 'cc-note', 'You sounded the retreat early.'));

    const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
    const overall = el('p', 'cc-note', `★ ${totalStars} / ${LEVELS.length * 3} overall`);
    card.append(overall);

    const stats = el('div', 'cc-stats');
    const rows = [
      [`${result.destroyed}/${result.total}`, 'razed'],
      [String(result.deployed), 'deployed'],
      [fmtTime(result.timeUsed), 'battle'],
      [result.thDown ? 'yes' : 'no', 'town hall'],
    ];
    for (const [value, label] of rows) {
      const box = el('div');
      box.append(el('b', null, value), el('span', null, label));
      stats.append(box);
    }
    card.append(stats);

    const row = el('div', 'row');
    const again = el('button', 'cc-btn', 'Retry');
    again.type = 'button';
    again.addEventListener('click', () => callbacks.onRetry());
    const bases = el('button', 'cc-btn', 'Bases');
    bases.type = 'button';
    bases.addEventListener('click', () => callbacks.onToLevels());
    row.append(again, bases);
    if (result.won && lv.order < LEVELS.length) {
      const next = el('button', 'cc-btn attack', 'Next base ›');
      next.type = 'button';
      next.addEventListener('click', () => callbacks.onNextLevel(lv.order + 1));
      row.append(next);
    } else if (result.won) {
      row.append(el('span', 'cc-chip stars', 'all bases razed'));
    }
    card.append(row);
    resultEl.append(card);
    root.append(resultEl);
    resultEl.hidden = false;
    callbacks.onSound?.(result.won ? 'win' : 'lose');
  }

  /* --------------------------------- flash --------------------------------- */

  function flash(message, tone = '') {
    if (!flashEl) {
      flashEl = el('p', 'cc-flash');
      root.append(flashEl);
    }
    flashEl.textContent = message;
    flashEl.className = `cc-flash show ${tone}`;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => flashEl.classList.remove('show'), 2400);
  }

  return {
    showLevels,
    showArmy,
    showBattle,
    updateBattle,
    showResult,
    flash,
    getArmy: () => army.map((row) => ({ ...row })),
    dispose() {
      root.remove();
      style.remove();
    },
  };
}
