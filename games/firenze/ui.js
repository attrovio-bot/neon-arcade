/**
 * FIRENZE: LAST LIGHT — touch UI.
 * All panels live inside `ctx.stage`, styled like the arcade shell.
 */

import { BUILDINGS, CARAVANS, EXCHANGE, GEAR, ROUTES, UPGRADES } from './levels.js';

const RES = {
  people: { name: 'Survivors', color: '#cfe9ff' },
  food: { name: 'Food', color: '#ffc857' },
  materials: { name: 'Materials', color: '#a99cff' },
  energy: { name: 'Energy', color: '#22e1ff' },
  biomass: { name: 'Biomass', color: '#b9ff4d' },
};

const ABBR = { food: 'food', materials: 'materials', energy: 'energy', biomass: 'biomass' };

const ICON = {
  people:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg>',
  food:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 21V8"/><path d="M12 10c0-3 2-5 5-5 0 3-2 5-5 5Z"/><path d="M12 14c0-3-2-5-5-5 0 3 2 5 5 5Z"/><path d="M12 18c0-2.4 1.6-4 4-4 0 2.4-1.6 4-4 4Z"/></svg>',
  materials:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7.5h8v5H3zM13 7.5h8v5h-8zM8 14.5h8v5H8z"/></svg>',
  energy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
  biomass:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3c3 3.6 5.2 6.2 5.2 9.2a5.2 5.2 0 0 1-10.4 0C6.8 9.2 9 6.6 12 3Z"/><path d="M9.5 13.5c.4 1.2 1.3 1.8 2.5 1.9"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z"/><path d="M9 12.5h6M12 9.5v6"/></svg>',
  cross:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  scales:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 4v16M8 20h8M5 8h14M7 8l-3 6h6L7 8Zm10 0-3 6h6l-3-6Z"/></svg>',
  hammer:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m14 4 6 6-3 3-6-6 3-3Z"/><path d="m12 8-9 9 4 4 9-9"/></svg>',
  skull:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 11a7 7 0 0 1 14 0c0 2.6-1.2 4.2-3 5.2V20H8v-3.8C6.2 15.2 5 13.6 5 11Z"/><circle cx="9.5" cy="11" r="1.2"/><circle cx="14.5" cy="11" r="1.2"/></svg>',
};

const CSS = `
.fz-ui{position:absolute;inset:0;z-index:1;pointer-events:none;color:#eef2ff;
  font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --fz-cy:#22e1ff;--fz-mg:#ff2f8e;--fz-lm:#b9ff4d;--fz-am:#ffc857;--fz-vi:#8f7dff;
  --fz-panel:rgba(8,11,18,.9);--fz-line:rgba(151,168,205,.2);--fz-dim:#9aa8c2;}
.fz-ui *{box-sizing:border-box}
.fz-ui button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.fz-ui button:disabled{opacity:.42;cursor:default}
.fz-ui .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}

/* top */
.fz-top{position:absolute;top:calc(70px + env(safe-area-inset-top));left:calc(10px + env(safe-area-inset-left));
  right:calc(10px + env(safe-area-inset-right));display:flex;flex-direction:column;gap:6px;pointer-events:none;z-index:2}
.fz-district{display:flex;align-items:center;gap:8px;min-width:0}
.fz-district .name{flex:1;display:flex;align-items:baseline;gap:7px;min-width:0;padding:5px 10px;border-radius:999px;
  border:1px solid var(--fz-line);background:rgba(7,10,17,.66);backdrop-filter:blur(10px)}
.fz-district .name b{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fz-district .name em{font-style:normal;font-family:ui-monospace,monospace;font-size:.58rem;letter-spacing:.12em;color:var(--fz-lm);white-space:nowrap}
.fz-district .name em.is-wave{color:var(--fz-mg)}
.fz-fit{pointer-events:auto;flex:0 0 auto;width:36px;height:36px;border-radius:12px;border:1px solid var(--fz-line);
  background:rgba(7,10,17,.72);backdrop-filter:blur(10px);color:var(--fz-dim);font-size:1rem}
.fz-res{display:flex;gap:4px}
.fz-chip{flex:1;min-width:0;display:flex;align-items:center;gap:5px;padding:5px 7px;border-radius:11px;
  border:1px solid rgba(151,168,205,.14);background:rgba(7,10,17,.7);backdrop-filter:blur(10px)}
.fz-chip svg{width:13px;height:13px;flex:0 0 auto;color:var(--c)}
.fz-chip b{font-size:.73rem;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:650}
.fz-chip small{font-size:.52rem;color:var(--fz-dim);font-family:ui-monospace,monospace;white-space:nowrap}
.fz-alert{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;width:fit-content;
  border:1px solid rgba(255,91,110,.35);background:rgba(40,8,15,.8);color:#ff98a6;font-size:.61rem;letter-spacing:.04em}
.fz-boss{padding:7px 9px;border-radius:12px;border:1px solid rgba(255,47,142,.4);background:rgba(25,5,15,.82);
  backdrop-filter:blur(10px);box-shadow:0 0 26px rgba(255,47,142,.18)}
.fz-boss-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:5px}
.fz-boss-top span{font-size:.52rem;letter-spacing:.18em;color:var(--fz-mg);font-family:ui-monospace,monospace}
.fz-boss-top strong{font-size:.74rem;letter-spacing:.06em;text-transform:uppercase}
.fz-boss-track{height:7px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}
.fz-boss-track i{display:block;height:100%;width:100%;border-radius:99px;background:linear-gradient(90deg,#ff2f8e,#ffc857);
  transition:width .18s linear}

/* bottom */
.fz-bottom{position:absolute;left:calc(9px + env(safe-area-inset-left));right:calc(9px + env(safe-area-inset-right));
  bottom:calc(9px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:7px;z-index:3;pointer-events:none}
.fz-horde{pointer-events:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;
  padding:9px 13px;border-radius:15px;border:1px solid rgba(185,255,77,.55);
  background:linear-gradient(100deg,rgba(24,48,9,.94),rgba(8,26,32,.94) 55%,rgba(40,5,23,.94));
  box-shadow:0 8px 26px rgba(0,0,0,.45),inset 0 0 24px rgba(185,255,77,.06)}
.fz-horde .txt{display:flex;flex-direction:column;gap:2px;text-align:left;min-width:0}
.fz-horde .txt b{font-size:.76rem;letter-spacing:.11em;text-transform:uppercase}
.fz-horde .txt small{font-size:.58rem;color:#b8c6bd;letter-spacing:.03em}
.fz-horde .go{flex:0 0 auto;font-family:ui-monospace,monospace;font-size:.58rem;letter-spacing:.1em;padding:6px 9px;
  border-radius:9px;background:rgba(185,255,77,.13);border:1px solid rgba(185,255,77,.35);color:var(--fz-lm)}
.fz-horde.is-boss{border-color:rgba(255,47,142,.6);background:linear-gradient(100deg,rgba(40,4,20,.95),rgba(10,8,20,.95))}
.fz-horde.is-boss .go{background:rgba(255,47,142,.14);border-color:rgba(255,47,142,.4);color:#ff8db5}
.fz-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;pointer-events:none}
.fz-bar button{pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  padding:7px 4px 6px;border-radius:13px;border:1px solid rgba(151,168,205,.16);
  background:rgba(7,10,17,.74);backdrop-filter:blur(12px);color:#cfd9ea}
.fz-bar button svg{width:18px;height:18px;color:var(--fz-cy)}
.fz-bar button span{font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;color:var(--fz-dim)}
.fz-bar button:active{background:rgba(34,225,255,.12)}
.fz-bar button.is-live{border-color:rgba(185,255,77,.4)}
.fz-abilities{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;pointer-events:none}
.fz-ab{position:relative;pointer-events:auto;overflow:hidden;padding:8px 4px;border-radius:13px;
  border:1px solid rgba(151,168,205,.18);background:rgba(7,10,17,.8);backdrop-filter:blur(12px)}
.fz-ab b{display:block;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}
.fz-ab small{display:block;font-size:.52rem;color:var(--fz-dim);margin-top:2px;font-family:ui-monospace,monospace}
.fz-ab .fz-ab-cd{position:absolute;left:0;right:0;bottom:0;height:0%;background:rgba(34,225,255,.12);pointer-events:none}
.fz-ab.is-ready{border-color:rgba(34,225,255,.45);box-shadow:inset 0 0 18px rgba(34,225,255,.06)}
.fz-ab[data-id="volley"] svg,.fz-ab[data-id="rally"] svg,.fz-ab[data-id="repair"] svg{display:none}

/* flash */
.fz-flash{position:absolute;left:50%;bottom:calc(142px + env(safe-area-inset-bottom));transform:translate(-50%,8px);
  max-width:88%;padding:7px 13px;border-radius:99px;border:1px solid var(--fz-line);background:rgba(7,10,17,.92);
  font-size:.66rem;letter-spacing:.03em;text-align:center;opacity:0;transition:.22s;pointer-events:none;z-index:6;
  box-shadow:0 8px 24px rgba(0,0,0,.5)}
.fz-flash.show{opacity:1;transform:translate(-50%,0)}
.fz-flash.good{border-color:rgba(185,255,77,.4);color:#dcffb1}
.fz-flash.bad{border-color:rgba(255,91,110,.45);color:#ffb3bd}

/* scrim + sheet */
.fz-scrim{position:absolute;inset:0;background:rgba(2,4,8,.5);opacity:0;transition:.2s;pointer-events:none;z-index:4}
.fz-scrim.show{opacity:1;pointer-events:auto}
.fz-sheet{position:absolute;left:calc(7px + env(safe-area-inset-left));right:calc(7px + env(safe-area-inset-right));
  bottom:calc(7px + env(safe-area-inset-bottom));max-height:70%;display:flex;flex-direction:column;
  border-radius:20px;border:1px solid rgba(151,168,205,.24);background:var(--fz-panel);
  backdrop-filter:blur(18px);z-index:5;pointer-events:auto;transform:translateY(105%);transition:transform .24s cubic-bezier(.2,.8,.2,1);
  box-shadow:0 -14px 60px rgba(0,0,0,.6)}
.fz-sheet.show{transform:translateY(0)}
.fz-sheet-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 14px 8px}
.fz-sheet-head .eyebrow{display:block;font-family:ui-monospace,monospace;font-size:.55rem;letter-spacing:.16em;
  text-transform:uppercase;color:var(--fz-lm);margin-bottom:3px}
.fz-sheet-head h3{margin:0;font-size:1.12rem;letter-spacing:-.02em}
.fz-x{flex:0 0 auto;width:34px;height:34px;border-radius:11px;border:1px solid var(--fz-line);color:var(--fz-dim);font-size:.9rem}
.fz-sheet-body{overflow-y:auto;padding:0 14px calc(14px + env(safe-area-inset-bottom));overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch}
.fz-desc{margin:0 0 10px;color:#b9c4d6;font-size:.74rem;line-height:1.45}
.fz-grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}
.fz-kv{padding:7px 9px;border-radius:10px;border:1px solid rgba(151,168,205,.13);background:rgba(255,255,255,.025)}
.fz-kv span{display:block;font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;color:var(--fz-dim)}
.fz-kv b{display:block;margin-top:2px;font-size:.78rem;font-weight:600}
.fz-hp{height:7px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden;margin:0 0 12px}
.fz-hp i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#b9ff4d,#22e1ff)}
.fz-hp.low i{background:linear-gradient(90deg,#ff2f8e,#ffc857)}
.fz-act{display:flex;gap:7px;flex-wrap:wrap}
.fz-btn{pointer-events:auto;flex:1;min-width:110px;padding:11px 12px;border-radius:12px;border:1px solid var(--fz-line);
  background:rgba(255,255,255,.035);font-size:.74rem;letter-spacing:.04em;text-align:center}
.fz-btn.primary{border-color:rgba(185,255,77,.55);background:rgba(185,255,77,.12);color:#e4ffc4}
.fz-btn.cyan{border-color:rgba(34,225,255,.45);background:rgba(34,225,255,.1);color:#c7f7ff}
.fz-btn.danger{border-color:rgba(255,91,110,.4);background:rgba(255,91,110,.1);color:#ffc3ca}
.fz-btn.wide{width:100%;flex-basis:100%}
.fz-btn:active{transform:translateY(1px)}
.fz-cost{display:block;margin-top:2px;font-size:.56rem;color:var(--fz-dim);font-family:ui-monospace,monospace}
.fz-sub{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 6px;
  font-size:.55rem;letter-spacing:.14em;text-transform:uppercase;color:var(--fz-dim);font-family:ui-monospace,monospace}
.fz-row{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:11px;border:1px solid rgba(151,168,205,.12);
  background:rgba(255,255,255,.02);margin-bottom:5px}
.fz-row .ico{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;
  background:rgba(34,225,255,.08);color:var(--fz-cy)}
.fz-row .ico svg{width:15px;height:15px}
.fz-row .grow{flex:1;min-width:0}
.fz-row .grow b{display:block;font-size:.73rem}
.fz-row .grow small{display:block;font-size:.56rem;color:var(--fz-dim);line-height:1.35;margin-top:1px}
.fz-row button{flex:0 0 auto;padding:7px 10px;border-radius:9px;border:1px solid rgba(185,255,77,.4);
  background:rgba(185,255,77,.09);font-size:.6rem;letter-spacing:.05em}
.fz-pips{display:flex;gap:3px}
.fz-pips i{width:16px;height:4px;border-radius:9px;background:rgba(255,255,255,.14)}
.fz-pips i.on{background:var(--fz-lm);box-shadow:0 0 8px rgba(185,255,77,.6)}
.fz-progress{height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:7px 0}
.fz-progress i{display:block;height:100%;background:linear-gradient(90deg,var(--fz-cy),var(--fz-lm));border-radius:99px;transition:width .12s linear}
.fz-note{font-size:.59rem;color:var(--fz-dim);line-height:1.4;margin:8px 0 0}
.fz-warn{font-size:.62rem;line-height:1.4;color:#ffb3bd;background:rgba(255,47,142,.08);border:1px solid rgba(255,47,142,.28);
  padding:7px 9px;border-radius:9px;margin:8px 0 0}
.fz-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:0 14px 10px}
.fz-tabs button{padding:7px 4px;border-radius:9px;border:1px solid rgba(151,168,205,.14);background:rgba(255,255,255,.02);
  font-size:.6rem;letter-spacing:.06em;text-transform:uppercase;color:var(--fz-dim)}
.fz-tabs button.on{color:#eaf7ff;border-color:rgba(34,225,255,.4);background:rgba(34,225,255,.09)}

/* start */
.fz-start{position:absolute;inset:0;z-index:20;pointer-events:auto;overflow-y:auto;overscroll-behavior:contain;
  background:radial-gradient(120% 70% at 50% 0%,rgba(20,9,30,.88),rgba(3,5,9,.94) 62%,rgba(3,5,9,.98));
  backdrop-filter:blur(3px);-webkit-overflow-scrolling:touch}
.fz-start-inner{max-width:460px;margin:0 auto;padding:calc(78px + env(safe-area-inset-top)) 18px calc(30px + env(safe-area-inset-bottom))}
.fz-kicker{display:inline-flex;align-items:center;gap:7px;font-family:ui-monospace,monospace;font-size:.56rem;
  letter-spacing:.18em;text-transform:uppercase;color:var(--fz-dim)}
.fz-kicker::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--fz-lm);box-shadow:0 0 10px var(--fz-lm)}
.fz-start h1{margin:12px 0 6px;font-size:clamp(44px,15vw,64px);line-height:.86;letter-spacing:-.055em;font-weight:800;
  background:linear-gradient(100deg,#bff6ff 4%,#22e1ff 38%,#8f7dff 65%,#ff2f8e 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.fz-start h1 em{display:block;font-style:normal;font-size:.19em;letter-spacing:.34em;text-transform:uppercase;
  color:var(--fz-lm);-webkit-text-fill-color:var(--fz-lm);margin-top:10px}
.fz-lede{margin:14px 0 16px;color:#b9c4d6;font-size:.8rem;line-height:1.55;max-width:39ch}
.fz-districts{display:grid;gap:7px;margin-bottom:12px}
.fz-district-card{display:flex;align-items:center;gap:10px;width:100%;padding:9px 11px;border-radius:14px;text-align:left;
  border:1px solid rgba(151,168,205,.16);background:rgba(255,255,255,.025);transition:.15s}
.fz-district-card .num{flex:0 0 auto;width:30px;font-family:ui-monospace,monospace;font-size:.68rem;color:var(--fz-dim);
  letter-spacing:.08em}
.fz-district-card .grow{flex:1;min-width:0}
.fz-district-card b{display:block;font-size:.82rem;letter-spacing:-.01em}
.fz-district-card small{display:block;font-size:.58rem;color:var(--fz-dim);margin-top:2px}
.fz-district-card .pips{flex:0 0 auto}
.fz-district-card.is-on{border-color:rgba(185,255,77,.6);background:rgba(185,255,77,.07);
  box-shadow:0 0 0 1px rgba(185,255,77,.16),inset 0 0 24px rgba(185,255,77,.04)}
.fz-district-card.is-locked{opacity:.45}
.fz-district-card .lock{font-size:.65rem;color:var(--fz-dim)}
.fz-enter{width:100%;padding:14px;border-radius:14px;border:1px solid rgba(185,255,77,.6);
  background:linear-gradient(100deg,rgba(185,255,77,.2),rgba(34,225,255,.12));color:#f0ffd9;
  font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;font-weight:700;
  box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 28px rgba(185,255,77,.12)}
.fz-how{margin-top:12px;border-top:1px solid rgba(151,168,205,.14);padding-top:10px}
.fz-how summary{font-size:.63rem;letter-spacing:.12em;text-transform:uppercase;color:var(--fz-dim);cursor:pointer}
.fz-how ol{margin:9px 0 0;padding-left:17px;color:#aab8cc;font-size:.68rem;line-height:1.6}
.fz-how b{color:#e6eeff;font-weight:600}

/* modals */
.fz-modal,.fz-victory{position:absolute;inset:0;z-index:30;display:grid;place-items:center;padding:calc(76px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));
  background:rgba(2,4,8,.62);backdrop-filter:blur(5px);pointer-events:auto}
.fz-modal[hidden],.fz-victory[hidden],.fz-start[hidden],.fz-sheet[hidden],.fz-scrim[hidden]{display:none!important}
.fz-card{width:100%;max-width:420px;max-height:100%;overflow-y:auto;border-radius:20px;border:1px solid rgba(151,168,205,.25);
  background:linear-gradient(180deg,rgba(15,19,30,.98),rgba(7,9,15,.99));padding:18px;
  box-shadow:0 24px 80px rgba(0,0,0,.7)}
.fz-card .kicker{display:block;font-family:ui-monospace,monospace;font-size:.55rem;letter-spacing:.18em;text-transform:uppercase;
  color:var(--fz-mg);margin-bottom:5px}
.fz-card h2{margin:0 0 6px;font-size:1.5rem;letter-spacing:-.035em}
.fz-card p{margin:0 0 12px;color:#aab8cc;font-size:.73rem;line-height:1.5}
.fz-comp{display:grid;gap:5px;margin:12px 0}
.fz-comp .fz-row{margin:0}
.fz-comp .fz-row .ico{background:rgba(185,255,77,.08);color:var(--fz-lm)}
.fz-comp .fz-row.boss .ico{background:rgba(255,47,142,.1);color:var(--fz-mg)}
.fz-comp .fz-row.boss b{color:#ff9dc0}
.fz-statgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0}
.fz-statgrid div{padding:8px 6px;border-radius:10px;border:1px solid rgba(151,168,205,.14);text-align:center}
.fz-statgrid span{display:block;font-size:.5rem;letter-spacing:.1em;text-transform:uppercase;color:var(--fz-dim)}
.fz-statgrid b{display:block;font-size:.9rem;margin-top:3px}
.fz-victory .fz-card{border-color:rgba(185,255,77,.42);box-shadow:0 24px 80px rgba(0,0,0,.7),0 0 40px rgba(185,255,77,.1)}
.fz-victory .kicker{color:var(--fz-lm)}
.fz-victory.is-defeat .fz-card{border-color:rgba(255,47,142,.5);box-shadow:0 24px 80px rgba(0,0,0,.7),0 0 40px rgba(255,47,142,.14)}
.fz-victory.is-defeat .kicker{color:var(--fz-mg)}
.fz-saved{margin:-6px 0 14px;padding:7px 10px;border-radius:10px;border:1px solid rgba(185,255,77,.22);
  background:rgba(185,255,77,.05);color:#c9ddb2}
.fz-vignette{position:absolute;inset:0;pointer-events:none;z-index:25;opacity:0;transition:opacity .5s;
  background:radial-gradient(120% 80% at 50% 40%,transparent 35%,rgba(120,0,20,.45) 100%)}
.fz-vignette.show{opacity:1}

@media (max-width:360px){
  .fz-chip small{display:none}
  .fz-horde .txt b{font-size:.7rem}
  .fz-bar button span{font-size:.48rem}
}
`;

function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

function fmt(value) {
  return String(Math.max(0, Math.floor(value)));
}

function costText(cost) {
  return Object.entries(cost)
    .map(([key, value]) => `${value} ${ABBR[key] || key}`)
    .join(' · ');
}

function pips(count, total = 3) {
  let html = '<span class="fz-pips">';
  for (let i = 0; i < total; i++) html += `<i class="${i < count ? 'on' : ''}"></i>`;
  return `${html}</span>`;
}

export function createUI(stage, callbacks) {
  const root = h('div', 'fz-ui');
  root.innerHTML = `
    <style>${CSS}</style>
    <div class="fz-top" data-el="top" hidden>
      <div class="fz-district">
        <div class="name"><b data-el="district">—</b><em data-el="phase">PREPARE</em></div>
        <button class="fz-fit" data-action="fit" aria-label="Fit the map">⤢</button>
      </div>
      <div class="fz-res" data-el="res"></div>
      <div class="fz-alert" data-el="alert" hidden></div>
      <div class="fz-boss" data-el="boss" hidden>
        <div class="fz-boss-top"><span>THE INFECTED CROWN</span><strong data-el="bossName"></strong></div>
        <div class="fz-boss-track"><i data-el="bossFill"></i></div>
      </div>
    </div>
    <div class="fz-bottom" data-el="bottom" hidden>
      <button class="fz-horde" data-el="horde" data-action="horde">
        <span class="txt"><b data-el="hordeTitle">Start attack</b><small data-el="hordeSub">Scout the horde first</small></span>
        <span class="go" data-el="hordeGo">HORDE I</span>
      </button>
      <div class="fz-bar" data-el="bar">
        <button data-action="panel" data-panel="army">${ICON.shield}<span>Army</span></button>
        <button data-action="panel" data-panel="cure">${ICON.cross}<span>Cure</span></button>
        <button data-action="panel" data-panel="market">${ICON.scales}<span>Market</span></button>
        <button data-action="panel" data-panel="workshop">${ICON.hammer}<span>Bottega</span></button>
      </div>
      <div class="fz-abilities" data-el="abilities" hidden>
        <button class="fz-ab" data-action="ability" data-id="volley"><b>Volley</b><small>8 energy</small><i class="fz-ab-cd"></i></button>
        <button class="fz-ab" data-action="ability" data-id="rally"><b>Rally</b><small>6 energy</small><i class="fz-ab-cd"></i></button>
        <button class="fz-ab" data-action="ability" data-id="repair"><b>Repair</b><small>18 mat</small><i class="fz-ab-cd"></i></button>
      </div>
    </div>
    <div class="fz-scrim" data-el="scrim" data-action="closeSheet"></div>
    <div class="fz-sheet" data-el="sheet" hidden>
      <div class="fz-sheet-head">
        <div><span class="eyebrow" data-el="sheetEyebrow"></span><h3 data-el="sheetTitle"></h3></div>
        <button class="fz-x" data-action="closeSheet" aria-label="Close">✕</button>
      </div>
      <div class="fz-sheet-body" data-el="sheetBody"></div>
    </div>
    <div class="fz-start" data-el="start" hidden></div>
    <div class="fz-modal" data-el="modal" hidden></div>
    <div class="fz-victory" data-el="victory" hidden></div>
    <div class="fz-flash" data-el="flash"></div>
    <div class="fz-vignette" data-el="vignette"></div>
  `;
  stage.appendChild(root);

  const el = {};
  for (const node of root.querySelectorAll('[data-el]')) el[node.dataset.el] = node;

  let sim = null;
  let save = null;
  let level = null;
  let startSelected = 1;
  let startVisible = false;
  let sheetKey = '';
  let sheetMode = null;
  let sheetId = null;
  let panelTab = 'exchange';
  let lastRefresh = 0;
  let flashTimer = 0;

  /* ------------------------------- resources -------------------------------- */

  const chipEls = {};
  for (const [key, def] of Object.entries(RES)) {
    const chip = h('div', 'fz-chip');
    chip.style.setProperty('--c', def.color);
    chip.title = def.name;
    chip.innerHTML = `${ICON[key]}<b></b>`;
    chipEls[key] = chip.querySelector('b');
    el.res.appendChild(chip);
  }

  function paintResources(state) {
    if (!state) return;
    chipEls.people.textContent = `${Math.floor(state.citizens)}/${state.cap}`;
    chipEls.food.textContent = fmt(state.resources.food);
    chipEls.materials.textContent = fmt(state.resources.materials);
    chipEls.energy.textContent = fmt(state.resources.energy);
    chipEls.biomass.textContent = fmt(state.resources.biomass);
    el.alert.hidden = !state.starving;
    if (state.starving) el.alert.textContent = 'Starving — production halved';
  }

  /* --------------------------------- start ---------------------------------- */

  function showStart(levels, saveRef, selected = 1) {
    sim = null;
    save = saveRef;
    startSelected = Math.min(3, Math.max(1, selected || 1));
    startVisible = true;
    el.top.hidden = true;
    el.bottom.hidden = true;
    el.start.hidden = false;
    paintStart(levels);
    el.start.scrollTop = 0;
  }

  function paintStart(levels) {
    const cards = levels
      .map((lv) => {
        const cleared = save?.cleared?.[lv.order] || 0;
        const locked = lv.order > (save?.unlocked || 1);
        const on = lv.order === startSelected;
        const city = save?.cities?.[lv.id];
        const built = city?.nodes?.filter((node) => node.restored).length || 0;
        const citizens = Number.isFinite(city?.citizens) ? city.citizens : 0;
        const detail = locked
          ? 'Locked'
          : cleared >= 3
            ? 'Secured'
            : `${cleared}/3 hordes held`;
        return `
          <button class="fz-district-card ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}"
            data-action="pickLevel" data-level="${lv.order}" ${locked ? 'disabled' : ''}>
            <span class="num">0${lv.order}</span>
            <span class="grow"><b>${lv.name}</b><small>${lv.place} · ${detail}${
              built ? ` · ${built} built · ${citizens} survivors` : ''
            }</small></span>
            ${locked ? '<span class="lock">▮</span>' : pips(cleared)}
          </button>`;
      })
      .join('');
    const current = levels.find((lv) => lv.order === startSelected) || levels[0];
    const city = save?.cities?.[current.id];
    const hasCity = Boolean(city?.nodes?.some((node) => node.restored || node.destroyed));
    el.start.innerHTML = `
      <div class="fz-start-inner">
        <span class="fz-kicker">Neon Arcade · District campaign</span>
        <h1>FIRENZE<em>last light</em></h1>
        <p class="fz-lede">The city is rubble and the infected own the streets. Rebuild the workshops,
          cure the nests for citizens and biomass, then ring the bell and hold the line. Three hordes per district.
          The last one brings a king.</p>
        <p class="fz-note fz-saved">Your Florence is saved on this device. Buildings, survivors and stores stay
          exactly as you left them — a lost horde never wipes the city.</p>
        <div class="fz-districts">${cards}</div>
        <button class="fz-enter" data-action="enter" data-level="${current.order}">${
          hasCity ? `Continue ${current.name}` : `Enter ${current.name}`
        }</button>
        <details class="fz-how">
          <summary>How to survive</summary>
          <ol>
            <li>Tap a ruin and <b>restore</b> it. Houses raise the population cap.</li>
            <li>Staff buildings with citizens: <b>clinic → farm → quarry → furnace</b>.</li>
            <li>Tap a nest and <b>cure</b> three infected for citizens, biomass and a thinner horde.</li>
            <li>Militia fight on their own. Watchtowers cover the approaches.</li>
            <li>Trade at the Mercato, craft at the Bottega, then <b>start the horde when ready</b>.</li>
            <li>If the landmark falls the horde withdraws. The city is never erased — repair it and try again.</li>
          </ol>
        </details>
      </div>`;
  }

  function hideStart() {
    startVisible = false;
    el.start.hidden = true;
    el.top.hidden = false;
    el.bottom.hidden = false;
  }

  /* ---------------------------------- sheet --------------------------------- */

  function closeSheet(silent = false) {
    sheetMode = null;
    sheetId = null;
    sheetKey = '';
    el.sheet.classList.remove('show');
    el.scrim.classList.remove('show');
    window.setTimeout(() => {
      if (!el.sheet.classList.contains('show')) el.sheet.hidden = true;
    }, 240);
    if (!silent) callbacks.onDeselect?.();
  }

  function openSheet(mode, id) {
    sheetMode = mode;
    sheetId = id;
    sheetKey = '';
    el.scrim.hidden = false;
    el.sheet.hidden = false;
    requestAnimationFrame(() => {
      el.scrim.classList.add('show');
      el.sheet.classList.add('show');
    });
    rebuildSheet(true);
  }

  function nodeInfo(id) {
    if (!sim) return null;
    const node = sim.state.nodes.find((n) => n.id === id);
    if (!node) return null;
    const kind = node.kind === 'plot' ? 'plot' : node.kind;
    const def = sim.nodeType(node) !== 'plot' ? null : null;
    return { node, kind, def };
  }

  function sheetSignature() {
    if (sheetMode === 'node' && sim) {
      const node = sim.state.nodes.find((n) => n.id === sheetId);
      if (!node) return 'none';
      return `n:${node.id}:${node.kind}:${node.restored}:${node.building}:${node.destroyed}:${Math.round(
        node.hp,
      )}:${node.staffed}:${node.staffNeed}`;
    }
    if (sheetMode === 'nest') return `e:${sheetId}:${panelTab}`;
    if (sheetMode === 'panel') {
      return `p:${sheetId}:${panelTab}:${save?.meta?.routes?.length || 0}:${save?.meta?.gear?.length || 0}:${save?.meta?.upg?.weapon || 0}:${save?.meta?.upg?.armor || 0}:${sim?.state.caravan.index ?? 0}`;
    }
    return 'none';
  }

  function rebuildSheet(force = false) {
    if (!sim || !sheetMode) return;
    const key = sheetSignature();
    if (!force && key === sheetKey) return;
    sheetKey = key;
    if (sheetMode === 'node') {
      const node = sim.state.nodes.find((n) => n.id === sheetId);
      if (!node) return closeSheet(true);
      renderNodeSheet(node);
    } else if (sheetMode === 'nest') {
      const nest = sim.state.nests.find((n) => n.id === sheetId);
      if (!nest) return closeSheet(true);
      renderNestSheet(nest);
    } else if (sheetMode === 'panel') {
      renderPanel(sheetId);
    }
  }

  function hpMarkup(node) {
    const frac = Math.max(0, Math.min(1, node.hp / Math.max(1, node.maxHp)));
    return `<div class="fz-hp ${frac < 0.35 ? 'low' : ''}"><i style="width:${frac * 100}%"></i></div>`;
  }

  function renderNodeSheet(node) {
    if (node.isCore) {
      el.sheetEyebrow.textContent = 'landmark · the line';
      el.sheetTitle.textContent = node.label;
      const frac = Math.round((node.hp / node.maxHp) * 100);
      const cost = sim.repairCost(node);
      el.sheetBody.innerHTML = `
        <p class="fz-desc">If this falls, the district is lost. Repair it between hordes.</p>
        ${hpMarkup(node)}
        <div class="fz-grid2">
          <div class="fz-kv"><span>Condition</span><b>${frac}%</b></div>
          <div class="fz-kv"><span>Horde</span><b>${sim.state.wave}/3</b></div>
        </div>
        <div class="fz-act">
          <button class="fz-btn primary" data-action="repair" data-id="core">Repair landmark<span class="fz-cost">${costText(cost)}</span></button>
        </div>`;
      return;
    }

    const type = sim.nodeType(node);
    const buildingDef = type !== 'plot' ? nodeMeta(type) : null;
    if (!node.restored && !node.building) {
      if (type === 'plot') {
        el.sheetEyebrow.textContent = 'empty plot';
        el.sheetTitle.textContent = 'Build here';
        el.sheetBody.innerHTML = `
          <p class="fz-desc">Choose what this plot becomes. Houses add population; farms and quarries feed the works.</p>
          ${['farm', 'quarry', 'house']
            .map(
              (kind) => `
            <div class="fz-row">
              <span class="ico">${kind === 'house' ? ICON.people : kind === 'farm' ? ICON.food : ICON.materials}</span>
              <span class="grow"><b>${nodeMeta(kind).label}</b><small>${nodeMeta(kind).blurb}</small></span>
              <button data-action="restore" data-id="${node.id}" data-kind="${kind}">${costText(nodeMeta(kind).cost)}</button>
            </div>`,
            )
            .join('')}`;
        return;
      }
      el.sheetEyebrow.textContent = node.destroyed ? 'destroyed' : 'ruin';
      el.sheetTitle.textContent = node.label;
      const cost = sim.costFor(node);
      el.sheetBody.innerHTML = `
        <p class="fz-desc">${buildingDef ? buildingDef.blurb : 'Rebuild this ruin to put it back to work.'}</p>
        ${
          buildingDef
            ? `<div class="fz-grid2">
                <div class="fz-kv"><span>Workers</span><b>${buildingDef.staff || 'none'}</b></div>
                <div class="fz-kv"><span>Integrity</span><b>${buildingDef.hp} hp</b></div>
              </div>`
            : ''
        }
        <div class="fz-act">
          <button class="fz-btn primary" data-action="restore" data-id="${node.id}">${node.destroyed ? 'Rebuild' : 'Restore'}<span class="fz-cost">${costText(cost)}</span></button>
        </div>`;
      return;
    }

    if (node.building) {
      el.sheetEyebrow.textContent = 'under construction';
      el.sheetTitle.textContent = node.label;
      el.sheetBody.innerHTML = `
        <p class="fz-desc">Scaffolding is up. The building opens when the workers finish.</p>
        <div class="fz-progress"><i data-live="nodeProgress" style="width:${node.progress * 100}%"></i></div>
        <p class="fz-note" data-live="nodeProgressText">${Math.round(node.progress * 100)}% · ${Math.ceil(
          (1 - node.progress) * node.buildTime,
        )}s</p>`;
      return;
    }

    const def = nodeMeta(type);
    el.sheetEyebrow.textContent = `${def.it} · standing`;
    el.sheetTitle.textContent = def.label;
    const staff = node.staffNeed ? `${node.staffed}/${node.staffNeed} workers` : 'No workers needed';
    const rate = def.rate
      ? Object.entries(def.rate)
          .map(([key, value]) => `+${value}/s ${key}`)
          .join(' · ')
      : def.tower
        ? `${def.damage} damage · ${def.range} range`
        : node.kind === 'house'
          ? '+4 population'
          : node.kind === 'barracks'
            ? `${sim.state.militia.length}/${sim.state.militiaCap} militia`
            : '—';
    const repair = sim.repairCost(node);
    const extraAction = ['market', 'workshop', 'clinic', 'barracks']
      .includes(type)
      ? `<button class="fz-btn" data-action="panel" data-panel="${
          type === 'workshop' ? 'workshop' : type === 'clinic' ? 'cure' : type
        }">${type === 'clinic' ? 'Cure the nests' : type === 'workshop' ? 'Open Bottega' : type === 'market' ? 'Open Mercato' : 'Army'}</button>`
      : '';
    el.sheetBody.innerHTML = `
      <p class="fz-desc">${def.blurb}</p>
      ${hpMarkup(node)}
      <div class="fz-grid2">
        <div class="fz-kv"><span>Staff</span><b>${staff}</b></div>
        <div class="fz-kv"><span>Output</span><b>${rate}</b></div>
      </div>
      <div class="fz-act">
        ${extraAction}
        ${
          node.hp < node.maxHp
            ? `<button class="fz-btn cyan" data-action="repair" data-id="${node.id}">Repair<span class="fz-cost">${costText(repair)}</span></button>`
            : ''
        }
      </div>`;
  }

  function nodeMeta(kind) {
    return sim?.state?.level?.catalog?.[kind] || CATALOG[kind];
  }

  // The catalogue is imported lazily below to avoid a circular module.
  let CATALOG = BUILDINGS;

  function renderNestSheet(nest) {
    const index = sim.state.nests.indexOf(nest) + 1;
    el.sheetEyebrow.textContent = 'infected nest';
    el.sheetTitle.textContent = `Nest ${['I', 'II', 'III'][index - 1] || index}`;
    const cure = sim.state.cure;
    const active = cure?.nestId === nest.id;
    const ready = sim.clinicReady();
    const canCure = nest.count >= 3 && !cure && ready;
    el.sheetBody.innerHTML = `
      <p class="fz-desc">${nest.count} infected are gathered here. They will join the next horde unless you cure
        them. A cure turns three into citizens and biomass.</p>
      <div class="fz-grid2">
        <div class="fz-kv"><span>Infected</span><b data-live="nestCount">${nest.count}</b></div>
        <div class="fz-kv"><span>Next wave</span><b>${sim.previewWave().contribution} from nests</b></div>
      </div>
      ${
        active
          ? `<div class="fz-progress"><i data-live="cureProgress" style="width:${(cure.t / cure.duration) * 100}%"></i></div>
             <p class="fz-note" data-live="cureText">Curing… ${Math.ceil(cure.duration - cure.t)}s</p>`
          : `<div class="fz-act">
               <button class="fz-btn primary" data-action="cure" data-id="${nest.id}" ${canCure ? '' : 'disabled'}>
                 Cure 3 infected<span class="fz-cost">14 energy · 6s</span>
               </button>
             </div>
             ${
               !ready
                 ? '<p class="fz-warn">Restore and staff the Infirmary to cure the infected.</p>'
                 : cure
                   ? '<p class="fz-note">The Infirmary is already curing another nest.</p>'
                   : '<p class="fz-note">Curing thins the next horde. Nests refill between waves.</p>'
             }`
      }`;
  }

  function renderPanel(name) {
    if (name === 'army') return renderArmy();
    if (name === 'cure') return renderCurePanel();
    if (name === 'market') return renderMarket();
    if (name === 'workshop') return renderWorkshop();
  }

  function renderArmy() {
    const stats = sim.militiaStats();
    el.sheetEyebrow.textContent = 'army';
    el.sheetTitle.textContent = 'The militia';
    el.sheetBody.innerHTML = `
      <div class="fz-grid2">
        <div class="fz-kv"><span>Militia</span><b>${sim.state.militia.length}/${sim.state.militiaCap}</b></div>
        <div class="fz-kv"><span>Watchtowers</span><b>${sim.state.nodes.filter((n) => n.restored && n.kind === 'tower').length}</b></div>
        <div class="fz-kv"><span>Health</span><b>${Math.round(stats.health)}</b></div>
        <div class="fz-kv"><span>Damage</span><b>${stats.damage.toFixed(1)} · ${stats.range > 1.2 ? 'ranged' : 'melee'}</b></div>
      </div>
      <p class="fz-desc">Every restored barracks musters two militia. They respawn on their own as long as food lasts.
        Craft gear at the Bottega to make them stronger.</p>
      <div class="fz-act"><button class="fz-btn" data-action="panel" data-panel="workshop">Open Bottega</button></div>`;
  }

  function renderCurePanel() {
    const clinic = sim.state.nodes.find((n) => n.kind === 'clinic');
    const cure = sim.state.cure;
    el.sheetEyebrow.textContent = 'spezieria';
    el.sheetTitle.textContent = 'The cure';
    const ready = sim.clinicReady();
    el.sheetBody.innerHTML = `
      <p class="fz-desc">${
        ready
          ? 'The Infirmary is staffed. Each cure costs 14 energy and takes six seconds.'
          : clinic?.restored
            ? 'The Infirmary needs two idle citizens to work.'
            : 'Restore the Infirmary to cure the infected instead of killing them.'
      }</p>
      ${
        cure
          ? `<div class="fz-progress"><i data-live="curePanelProgress" style="width:${(cure.t / cure.duration) * 100}%"></i></div>
             <p class="fz-note" data-live="curePanelText">Curing Nest ${
               ['I', 'II', 'III'][sim.state.nests.findIndex((n) => n.id === cure.nestId)]
             }… ${Math.ceil(cure.duration - cure.t)}s</p>`
          : ''
      }
      ${sim.state.nests
        .map((nest, i) => {
          const can = ready && !cure && nest.count >= 3 && sim.state.phase === 'prep';
          return `
            <div class="fz-row">
              <span class="ico">${ICON.skull}</span>
              <span class="grow"><b>Nest ${['I', 'II', 'III'][i]}</b><small>${nest.count} infected · sends ${Math.round(
                nest.count * NEST_FACTOR[Math.min(2, sim.state.wave)],
              )} to the next horde</small></span>
              <button data-action="cure" data-id="${nest.id}" ${can ? '' : 'disabled'}>Cure 3</button>
            </div>`;
        })
        .join('')}`;
  }

  function renderMarket() {
    const market = sim.state.nodes.find((n) => n.kind === 'market');
    el.sheetEyebrow.textContent = 'mercato';
    el.sheetTitle.textContent = 'Trade';
    const ready = Boolean(market?.restored);
    if (!ready) {
      el.sheetBody.innerHTML = `<p class="fz-desc">The Mercato is in ruins. Restore it to exchange goods, receive
        caravans and open permanent trade routes.</p>`;
      return;
    }
    const tabs = `
      <div class="fz-tabs">
        <button data-action="tab" data-tab="exchange" class="${panelTab === 'exchange' ? 'on' : ''}">Exchange</button>
        <button data-action="tab" data-tab="caravan" class="${panelTab === 'caravan' ? 'on' : ''}">Caravan</button>
        <button data-action="tab" data-tab="routes" class="${panelTab === 'routes' ? 'on' : ''}">Routes</button>
      </div>`;
    let body = '';
    if (panelTab === 'exchange') {
      body = EXCHANGE.map(
        (offer, i) => `
        <div class="fz-row">
          <span class="ico">${ICON.scales}</span>
          <span class="grow"><b>${costText(offer.give)}</b><small>for ${costText(offer.get)}</small></span>
          <button data-action="exchange" data-i="${i}" ${sim.canPay(offer.give) ? '' : 'disabled'}>Trade</button>
        </div>`,
      ).join('');
    } else if (panelTab === 'caravan') {
      const offer = sim.state.caravan;
      const data = CARAVANS[offer.index];
      body = `
        <div class="fz-grid2">
          <div class="fz-kv"><span>Caravan</span><b>${data.label}</b></div>
          <div class="fz-kv"><span>Arrives in</span><b data-live="caravan">${Math.ceil(offer.refresh)}s</b></div>
        </div>
        <div class="fz-row">
          <span class="ico">${ICON.scales}</span>
          <span class="grow"><b>${costText(data.give)}</b><small>for ${costText(data.get)}</small></span>
          <button data-action="caravan" ${sim.canPay(data.give) ? '' : 'disabled'}>Accept</button>
        </div>
        <p class="fz-note">One caravan per arrival. Trading is untaxed in a city with no tax collectors.</p>`;
    } else {
      body = Object.entries(ROUTES)
        .map(([id, route]) => {
          const owned = save?.meta?.routes?.includes(id);
          return `
            <div class="fz-row">
              <span class="ico">${ICON.scales}</span>
              <span class="grow"><b>${route.name}</b><small>${route.desc}</small></span>
              ${
                owned
                  ? '<button disabled>Owned</button>'
                  : `<button data-action="route" data-id="${id}" ${sim.canPay(route.cost) ? '' : 'disabled'}>${costText(route.cost)}</button>`
              }
            </div>`;
        })
        .join('');
    }
    el.sheetBody.innerHTML = `${tabs}${body}`;
  }

  function renderWorkshop() {
    const shop = sim.state.nodes.find((n) => n.kind === 'workshop');
    el.sheetEyebrow.textContent = 'bottega';
    el.sheetTitle.textContent = 'Forge & drill';
    if (!shop?.restored) {
      el.sheetBody.innerHTML = `<p class="fz-desc">The Bottega is cold. Restore it to craft weapons and train
        your militia. Gear and ranks are permanent across the campaign.</p>`;
      return;
    }
    const gear = Object.entries(GEAR)
      .map(([id, item]) => {
        const owned = save?.meta?.gear?.includes(id);
        return `
          <div class="fz-row">
            <span class="ico">${ICON.hammer}</span>
            <span class="grow"><b>${item.name}</b><small>${item.desc}</small></span>
            ${
              owned
                ? '<button disabled>Equipped</button>'
                : `<button data-action="gear" data-id="${id}" ${sim.canPay(item.cost) ? '' : 'disabled'}>${costText(item.cost)}</button>`
            }
          </div>`;
      })
      .join('');
    const upgrades = Object.entries(UPGRADES)
      .map(([track, up]) => {
        const rank = save?.meta?.upg?.[track] || 0;
        const max = rank >= up.costs.length;
        return `
          <div class="fz-row">
            <span class="ico">${ICON.shield}</span>
            <span class="grow"><b>${up.name} · rank ${rank}/${up.costs.length}</b><small>${up.desc}</small></span>
            ${
              max
                ? '<button disabled>Max</button>'
                : `<button data-action="upgrade" data-track="${track}" ${
                    sim.canPay(up.costs[rank]) ? '' : 'disabled'
                  }>${costText(up.costs[rank])}</button>`
            }
          </div>`;
      })
      .join('');
    el.sheetBody.innerHTML = `
      <p class="fz-desc">Permanent upgrades. They survive a lost district.</p>
      <div class="fz-sub">Gear</div>${gear}
      <div class="fz-sub">Training</div>${upgrades}`;
  }

  /* -------------------------------- panels ---------------------------------- */

  const NEST_FACTOR = [0.2, 0.35, 0.5];

  function refresh(state, saveRef, force = false) {
    if (!state || !sim) return;
    save = saveRef;
    const now = performance.now();
    if (!force && now - lastRefresh < 90) return;
    lastRefresh = now;
    paintResources(state);
    el.district.textContent = state.level.name;
    const inWave = state.phase === 'wave';
    const secured = (save?.cleared?.[state.level.order] || 0) >= 3;
    el.phase.textContent = inWave
      ? `HORDE ${state.wave}/3`
      : state.phase === 'victory' || secured
        ? 'SECURED'
        : 'PREPARE';
    el.phase.classList.toggle('is-wave', inWave);

    if (inWave) {
      el.horde.hidden = true;
      el.bar.hidden = true;
      el.abilities.hidden = false;
      for (const button of el.abilities.querySelectorAll('[data-id]')) {
        const ability = state.abilities[button.dataset.id];
        const ready = ability.cd <= 0 && state.phase === 'wave' && sim.canPay(ability.cost);
        button.classList.toggle('is-ready', ready);
        button.disabled = !ready;
        const cd = button.querySelector('.fz-ab-cd');
        if (cd) cd.style.height = `${Math.min(100, (ability.cd / ability.max) * 100)}%`;
        const small = button.querySelector('small');
        if (small) small.textContent = ability.cd > 0 ? `${Math.ceil(ability.cd)}s` : costText(ability.cost);
      }
    } else {
      el.horde.hidden = false;
      el.bar.hidden = false;
      el.abilities.hidden = true;
      const plan = sim.previewWave();
      el.hordeTitle.textContent = secured
        ? 'Replay the last horde'
        : `Start attack · Horde ${['I', 'II', 'III'][plan.wave - 1]}`;
      el.hordeSub.textContent = secured
        ? 'The district is held. Your city remains exactly as it is.'
        : state.phase === 'victory'
          ? 'District secured'
          : `${plan.walkers} shamblers${plan.runners ? ` · ${plan.runners} runners` : ''}${
              plan.brutes ? ` · ${plan.brutes} brutes` : ''
            }${plan.boss ? ' · a boss' : ''} · ${plan.nests} infected in nests`;
      el.hordeGo.textContent = `HORDE ${['I', 'II', 'III'][plan.wave - 1]}`;
      el.horde.classList.toggle('is-boss', Boolean(plan.boss));
      el.horde.disabled = state.phase !== 'prep';
    }
    el.bar.querySelector('[data-panel="cure"]').classList.toggle(
      'is-live',
      Boolean(state.cure) || sim.clinicReady(),
    );

    if (state.boss) {
      el.boss.hidden = false;
      el.bossName.textContent = state.boss.name;
      el.bossFill.style.width = `${Math.max(0, (state.boss.hp / state.boss.maxHp) * 100)}%`;
    } else {
      el.boss.hidden = true;
    }

    if (sheetMode) {
      rebuildSheet();
      updateLive(state);
    }
  }

  function updateLive(state) {
    if (sheetMode === 'node') {
      const node = state.nodes.find((n) => n.id === sheetId);
      if (node?.building) {
        const bar = el.sheetBody.querySelector('[data-live="nodeProgress"]');
        if (bar) bar.style.width = `${node.progress * 100}%`;
        const text = el.sheetBody.querySelector('[data-live="nodeProgressText"]');
        if (text)
          text.textContent = `${Math.round(node.progress * 100)}% · ${Math.ceil(
            (1 - node.progress) * node.buildTime,
          )}s`;
      }
      const repair = el.sheetBody.querySelector('[data-action="repair"]');
      if (repair && node) repair.disabled = !sim.canPay(sim.repairCost(node));
    }
    if (sheetMode === 'nest' && state.cure) {
      const bar = el.sheetBody.querySelector('[data-live="cureProgress"]');
      if (bar) bar.style.width = `${(state.cure.t / state.cure.duration) * 100}%`;
      const text = el.sheetBody.querySelector('[data-live="cureText"]');
      if (text) text.textContent = `Curing… ${Math.ceil(state.cure.duration - state.cure.t)}s`;
    }
    if (sheetMode === 'panel' && sheetId === 'market') {
      const name = el.sheetBody.querySelector('[data-live="caravan"]');
      if (name) name.textContent = `${Math.ceil(state.caravan.refresh)}s`;
    }
    if (sheetMode === 'panel' && sheetId === 'cure' && state.cure) {
      const bar = el.sheetBody.querySelector('[data-live="curePanelProgress"]');
      if (bar) bar.style.width = `${(state.cure.t / state.cure.duration) * 100}%`;
      const text = el.sheetBody.querySelector('[data-live="curePanelText"]');
      if (text) text.textContent = `Curing… ${Math.ceil(state.cure.duration - state.cure.t)}s`;
    }
    // affordability on every visible action
    for (const button of el.sheetBody.querySelectorAll('button[data-action="restore"],button[data-action="route"],button[data-action="gear"],button[data-action="upgrade"],button[data-action="exchange"],button[data-action="caravan"]')) {
      const action = button.dataset.action;
      let cost = null;
      if (action === 'restore') {
        const node = state.nodes.find((n) => n.id === button.dataset.id);
        if (node) cost = sim.costFor(node);
      } else if (action === 'route') cost = ROUTES[button.dataset.id]?.cost;
      else if (action === 'gear') cost = GEAR[button.dataset.id]?.cost;
      else if (action === 'upgrade') {
        const rank = save?.meta?.upg?.[button.dataset.track] || 0;
        cost = UPGRADES[button.dataset.track]?.costs[rank];
      } else if (action === 'exchange') cost = EXCHANGE[Number(button.dataset.i)]?.give;
      else if (action === 'caravan') cost = CARAVANS[state.caravan.index]?.give;
      if (cost) button.disabled = !sim.canPay(cost);
    }
  }

  /* -------------------------------- overlays -------------------------------- */

  function showWavePreview(plan, state) {
    const rows = [
      ['walker', 'Shamblers', plan.walkers],
      ['runner', 'Runners', plan.runners],
      ['brute', 'Brutes', plan.brutes],
    ]
      .filter(([, , count]) => count)
      .map(
        ([, label, count]) => `
        <div class="fz-row"><span class="ico">${ICON.skull}</span><span class="grow"><b>${label}</b>
        <small>${count} incoming</small></span></div>`,
      )
      .join('');
    const boss = plan.boss
      ? `<div class="fz-row boss"><span class="ico">${ICON.skull}</span><span class="grow"><b>${plan.boss}</b>
         <small>${plan.bossHp} hp · boss</small></span></div>`
      : '';
    const noMilitia = state.militia.length === 0;
    el.modal.innerHTML = `
      <div class="fz-card">
        <span class="kicker">${plan.boss ? 'final horde' : `horde ${['I', 'II', 'III'][plan.wave - 1]}`}</span>
        <h2>${plan.boss ? plan.boss : 'The streets are moving'}</h2>
        <p>${plan.contribution} of them are crawling out of the nests you left alone. Curing nests now thins this horde.</p>
        <div class="fz-comp">${rows}${boss}</div>
        ${noMilitia ? '<p class="fz-warn">No militia mustered. Restore a barracks before you ring the bell.</p>' : ''}
        <div class="fz-act">
          <button class="fz-btn" data-action="cancelWave">Not yet</button>
          <button class="fz-btn primary" data-action="beginWave">Begin attack</button>
        </div>
      </div>`;
    el.modal.hidden = false;
  }

  function hideModal() {
    el.modal.hidden = true;
    el.modal.innerHTML = '';
  }

  function showVictory({ level: lv, stats, totalWaves, final, next }) {
    closeSheet(true);
    el.victory.classList.remove('is-defeat');
    const secured = totalWaves;
    el.victory.innerHTML = `
      <div class="fz-card">
        <span class="kicker">${final ? 'campaign complete' : 'district secured'}</span>
        <h2>${final ? 'Florence still stands' : `${lv.name} holds`}</h2>
        <p>${final
          ? 'The crown is in the dust and the bells are ringing. Every district is free — and your city is still yours to keep building.'
          : `The last horde is broken. ${next ? `${next.name} is open.` : ''} Your city and its stores come with you.`}</p>
        <div class="fz-statgrid">
          <div><span>Kills</span><b>${stats.kills}</b></div>
          <div><span>Cured</span><b>${stats.cured}</b></div>
          <div><span>Hordes</span><b>${secured}</b></div>
        </div>
        <div class="fz-act">
          ${
            final
              ? '<button class="fz-btn primary" data-action="stay">Keep rebuilding</button><button class="fz-btn" data-action="replay">Replay Duomo</button>'
              : `<button class="fz-btn primary" data-action="nextLevel" data-level="${next?.order || lv.order}">Enter ${next?.name || 'next district'}</button>
                 <button class="fz-btn" data-action="stay">Keep building here</button>`
          }
        </div>
      </div>`;
    el.victory.hidden = false;
  }

  function showDefeat({ level: lv, wave, stats }) {
    closeSheet(true);
    el.victory.classList.add('is-defeat');
    el.victory.innerHTML = `
      <div class="fz-card">
        <span class="kicker">the line broke</span>
        <h2>${lv.coreName} has fallen</h2>
        <p>The horde pulls back at dawn, gorged and lazy. Nothing you built is erased — the district keeps
          its survivors, its stores and every standing workshop. Patch the landmark and ring the bell again.</p>
        <div class="fz-statgrid">
          <div><span>Horde</span><b>${['I', 'II', 'III'][Math.min(2, Math.max(0, wave - 1))]}</b></div>
          <div><span>Kills</span><b>${stats.kills}</b></div>
          <div><span>Cured</span><b>${stats.cured}</b></div>
        </div>
        <div class="fz-act">
          <button class="fz-btn primary" data-action="rally">Rally the city</button>
        </div>
      </div>`;
    el.victory.hidden = false;
  }

  function hideVictory() {
    el.victory.hidden = true;
    el.victory.classList.remove('is-defeat');
    el.victory.innerHTML = '';
  }

  function flash(text, tone = '') {
    el.flash.textContent = text;
    el.flash.className = `fz-flash show ${tone}`;
    clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => {
      el.flash.className = 'fz-flash';
    }, 2400);
  }

  function danger(on) {
    el.vignette.classList.toggle('show', on);
  }

  function showBoss() {
    el.boss.hidden = false;
  }

  function hideBoss() {
    el.boss.hidden = true;
  }

  /* --------------------------------- actions -------------------------------- */

  root.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.action;
      if (action === 'pickLevel') {
        startSelected = Number(button.dataset.level);
        callbacks.onPickLevel?.(startSelected);
        paintStart(LEVELS_REF || []);
        return;
      }
      if (action === 'enter') {
        callbacks.onStart?.(Number(button.dataset.level));
        return;
      }
      if (action === 'horde') {
        callbacks.onPreviewWave?.();
        return;
      }
      if (action === 'beginWave') {
        hideModal();
        callbacks.onStartWave?.();
        return;
      }
      if (action === 'cancelWave') {
        hideModal();
        return;
      }
      if (action === 'restore') {
        callbacks.onRestore?.(button.dataset.id, button.dataset.kind);
        return;
      }
      if (action === 'repair') {
        callbacks.onRepair?.(button.dataset.id);
        return;
      }
      if (action === 'cure') {
        callbacks.onCure?.(button.dataset.id);
        return;
      }
      if (action === 'ability') {
        callbacks.onAbility?.(button.dataset.id);
        return;
      }
      if (action === 'panel') {
        const panel = button.dataset.panel;
        if (panel === 'army') callbacks.onSelect?.(null, null);
        openSheet('panel', panel);
        return;
      }
      if (action === 'tab') {
        panelTab = button.dataset.tab;
        sheetKey = '';
        rebuildSheet(true);
        return;
      }
      if (action === 'exchange') {
        callbacks.onExchange?.(Number(button.dataset.i));
        return;
      }
      if (action === 'caravan') {
        callbacks.onCaravan?.();
        return;
      }
      if (action === 'route') {
        callbacks.onRoute?.(button.dataset.id);
        return;
      }
      if (action === 'gear') {
        callbacks.onGear?.(button.dataset.id);
        return;
      }
      if (action === 'upgrade') {
        callbacks.onUpgrade?.(button.dataset.track);
        return;
      }
      if (action === 'closeSheet') {
        closeSheet();
        return;
      }
      if (action === 'fit') {
        callbacks.onFit?.();
        return;
      }
      if (action === 'nextLevel') {
        hideVictory();
        callbacks.onNextLevel?.(Number(button.dataset.level));
        return;
      }
      if (action === 'replay') {
        hideVictory();
        callbacks.onReplay?.();
        return;
      }
      if (action === 'stay') {
        hideVictory();
        callbacks.onStay?.();
        return;
      }
      if (action === 'rally') {
        hideVictory();
        callbacks.onRally?.();
        return;
      }
      if (action === 'restart') {
        hideVictory();
        callbacks.onRestart?.();
        return;
      }
    },
    { passive: false },
  );

  /* ------------------------------- lifecycle -------------------------------- */

  function bind(simRef, saveRef, levelRef) {
    sim = simRef;
    save = saveRef;
    level = levelRef;
    panelTab = 'exchange';
    hideVictory();
    hideModal();
    danger(false);
  }

  function openNode(id) {
    if (!sim) return;
    const node = sim.state.nodes.find((n) => n.id === id);
    if (node) {
      callbacks.onSelect?.('node', id);
      openSheet('node', id);
    }
  }

  function openNest(id) {
    if (!sim) return;
    const nest = sim.state.nests.find((n) => n.id === id);
    if (nest) {
      callbacks.onSelect?.('nest', id);
      openSheet('nest', id);
    }
  }

  function openPanel(name) {
    openSheet('panel', name);
  }

  function setCatalog(catalog) {
    CATALOG = catalog;
  }

  let LEVELS_REF = null;
  function setLevels(levels) {
    LEVELS_REF = levels;
  }

  function dispose() {
    clearTimeout(flashTimer);
    root.remove();
  }

  return {
    showStart,
    hideStart,
    bind,
    refresh,
    openNode,
    openNest,
    openPanel,
    closeSheet,
    showWavePreview,
    hideModal,
    showVictory,
    showDefeat,
    hideVictory,
    flash,
    danger,
    showBoss,
    hideBoss,
    setCatalog,
    setLevels,
    paintStart: () => paintStart(LEVELS_REF || []),
    get startVisible() {
      return startVisible;
    },
    dispose,
  };
}
