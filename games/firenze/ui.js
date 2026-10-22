/**
 * FIRENZE: LAST LIGHT — touch UI for one persistent city and three sieges.
 * Panels live inside the host stage; all colours are travertine, terracotta and gilt.
 */

import {
  BUILDINGS,
  CARAVANS,
  EXCHANGE,
  GEAR,
  PLOT_OPTIONS,
  ROUTES,
  TROOPS,
  UPGRADES,
  WAVES,
} from './levels.js';

const RES = {
  people: { name: 'Citizens', color: '#e7d7b6' },
  food: { name: 'Food', color: '#d7a85a' },
  materials: { name: 'Materials', color: '#c6b18a' },
  energy: { name: 'Oil', color: '#d98b4a' },
  biomass: { name: 'Biomass', color: '#8d9a5d' },
};

const ABBR = { food: 'food', materials: 'materials', energy: 'oil', biomass: 'biomass' };

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
  spear:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 21 17 5"/><path d="m16 3 4 2-2 4"/><path d="m4 18 4 2"/></svg>',
  bow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 19C12 17 17 12 19 4"/><path d="M4 19 20 4"/><path d="m15 4 5 0 0 5"/></svg>',
  horse:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20v-5l2-4 3-2 1-4 3 3 4 1 2 4-2 3-4 1-2 3v3"/><path d="M8 11 5 9"/></svg>',
  flag:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V3"/><path d="M6 4h11l-2 4 2 4H6"/></svg>',
  crown:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 18h16l-1-8-4 3-3-6-3 6-4-3-1 8Z"/><path d="M6 21h12"/></svg>',
};

const TROOP_ICON = { levy: ICON.spear, crossbow: ICON.bow, knight: ICON.horse };

const CSS = `
.fz-ui{position:absolute;inset:0;z-index:1;pointer-events:none;color:#f0e6cf;
  font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --fz-gold:#d8b36a;--fz-terra:#b05a3c;--fz-olive:#8d9a5d;--fz-amber:#e0b25f;--fz-parch:#f0e6cf;
  --fz-panel:rgba(27,22,16,.94);--fz-line:rgba(216,179,106,.26);--fz-dim:#b9aa8e;--fz-ink:#17130e;}
.fz-ui *{box-sizing:border-box}
.fz-ui button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.fz-ui button:disabled{opacity:.38;cursor:default}
.fz-ui .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.fz-ui h1,.fz-ui h2,.fz-ui h3,.fz-ui .serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:600}

/* top */
.fz-top{position:absolute;top:calc(70px + env(safe-area-inset-top));left:calc(10px + env(safe-area-inset-left));
  right:calc(10px + env(safe-area-inset-right));display:flex;flex-direction:column;gap:6px;pointer-events:none;z-index:2}
.fz-district{display:flex;align-items:center;gap:8px;min-width:0}
.fz-district .name{flex:1;display:flex;align-items:baseline;gap:7px;min-width:0;padding:5px 10px;border-radius:999px;
  border:1px solid var(--fz-line);background:rgba(24,19,13,.72);backdrop-filter:blur(10px)}
.fz-district .name b{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--fz-parch)}
.fz-district .name em{font-style:normal;font-family:ui-monospace,monospace;font-size:.56rem;letter-spacing:.1em;color:var(--fz-gold);white-space:nowrap}
.fz-district .name em.is-wave{color:#e79a72}
.fz-fit{pointer-events:auto;flex:0 0 auto;width:36px;height:36px;border-radius:12px;border:1px solid var(--fz-line);
  background:rgba(24,19,13,.8);backdrop-filter:blur(10px);color:var(--fz-dim);font-size:1rem}
.fz-res{display:flex;gap:4px}
.fz-chip{flex:1;min-width:0;display:flex;align-items:center;gap:5px;padding:5px 6px;border-radius:10px;
  border:1px solid rgba(216,179,106,.16);background:rgba(24,19,13,.76);backdrop-filter:blur(10px)}
.fz-chip svg{width:12px;height:12px;flex:0 0 auto;color:var(--c)}
.fz-chip b{font-size:.69rem;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:650}
.fz-alert{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;width:fit-content;
  border:1px solid rgba(224,142,94,.4);background:rgba(47,23,12,.86);color:#f2b38d;font-size:.6rem;letter-spacing:.03em}
.fz-boss{padding:7px 9px;border-radius:12px;border:1px solid rgba(176,90,60,.5);background:rgba(35,16,11,.9);
  backdrop-filter:blur(10px);box-shadow:0 0 22px rgba(176,90,60,.15)}
.fz-boss-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:5px}
.fz-boss-top span{font-size:.5rem;letter-spacing:.16em;color:#d88b67;font-family:ui-monospace,monospace}
.fz-boss-top strong{font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;color:#f2e6cd}
.fz-boss-track{height:7px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}
.fz-boss-track i{display:block;height:100%;width:100%;border-radius:99px;background:linear-gradient(90deg,#a9573c,#d8b36a);
  transition:width .18s linear}

/* bottom */
.fz-bottom{position:absolute;left:calc(9px + env(safe-area-inset-left));right:calc(9px + env(safe-area-inset-right));
  bottom:calc(9px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:7px;z-index:3;pointer-events:none}
.fz-horde{pointer-events:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;
  padding:9px 13px;border-radius:15px;border:1px solid rgba(216,179,106,.45);
  background:linear-gradient(100deg,rgba(74,48,28,.96),rgba(32,25,17,.96) 58%,rgba(55,31,22,.96));
  box-shadow:0 8px 26px rgba(0,0,0,.45),inset 0 0 24px rgba(216,179,106,.05)}
.fz-horde .txt{display:flex;flex-direction:column;gap:2px;text-align:left;min-width:0}
.fz-horde .txt b{font-size:.74rem;letter-spacing:.09em;text-transform:uppercase;color:#f3e6c9}
.fz-horde .txt small{font-size:.56rem;color:#c4b394;letter-spacing:.02em}
.fz-horde .go{flex:0 0 auto;font-family:ui-monospace,monospace;font-size:.56rem;letter-spacing:.09em;padding:6px 9px;
  border-radius:9px;background:rgba(216,179,106,.14);border:1px solid rgba(216,179,106,.38);color:#ecd39b}
.fz-horde.is-boss{border-color:rgba(176,90,60,.58);background:linear-gradient(100deg,rgba(58,22,15,.96),rgba(29,20,16,.96))}
.fz-horde.is-boss .go{background:rgba(176,90,60,.16);border-color:rgba(176,90,60,.44);color:#eda382}
.fz-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;pointer-events:none}
.fz-bar button{pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  padding:7px 3px 6px;border-radius:12px;border:1px solid rgba(216,179,106,.18);
  background:rgba(24,19,13,.82);backdrop-filter:blur(12px);color:#e4d5b8}
.fz-bar button svg{width:17px;height:17px;color:var(--fz-gold)}
.fz-bar button span{font-size:.5rem;letter-spacing:.08em;text-transform:uppercase;color:var(--fz-dim)}
.fz-bar button:active{background:rgba(216,179,106,.13)}
.fz-bar button.is-live{border-color:rgba(141,154,93,.55);box-shadow:inset 0 0 16px rgba(141,154,93,.08)}
.fz-abilities{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;pointer-events:none}
.fz-ab{position:relative;pointer-events:auto;overflow:hidden;padding:8px 3px;border-radius:12px;
  border:1px solid rgba(216,179,106,.2);background:rgba(24,19,13,.86);backdrop-filter:blur(12px)}
.fz-ab b{display:block;font-size:.64rem;letter-spacing:.06em;text-transform:uppercase;color:#f1e3c6}
.fz-ab small{display:block;font-size:.5rem;color:var(--fz-dim);margin-top:2px;font-family:ui-monospace,monospace}
.fz-ab .fz-ab-cd{position:absolute;left:0;right:0;bottom:0;height:0%;background:rgba(216,179,106,.12);pointer-events:none}
.fz-ab.is-ready{border-color:rgba(216,179,106,.55);box-shadow:inset 0 0 16px rgba(216,179,106,.08)}
.fz-ab[data-id="deploy"]{border-color:rgba(141,154,93,.5)}

/* flash */
.fz-flash{position:absolute;left:50%;bottom:calc(142px + env(safe-area-inset-bottom));transform:translate(-50%,8px);
  max-width:88%;padding:7px 13px;border-radius:99px;border:1px solid var(--fz-line);background:rgba(24,19,13,.95);
  font-size:.64rem;letter-spacing:.02em;text-align:center;opacity:0;transition:.22s;pointer-events:none;z-index:6;
  box-shadow:0 8px 24px rgba(0,0,0,.5)}
.fz-flash.show{opacity:1;transform:translate(-50%,0)}
.fz-flash.good{border-color:rgba(141,154,93,.55);color:#e0ebbd}
.fz-flash.bad{border-color:rgba(176,90,60,.55);color:#f0b295}

/* scrim + sheet */
.fz-scrim{position:absolute;inset:0;background:rgba(8,6,4,.55);opacity:0;transition:.2s;pointer-events:none;z-index:4}
.fz-scrim.show{opacity:1;pointer-events:auto}
.fz-sheet{position:absolute;left:calc(7px + env(safe-area-inset-left));right:calc(7px + env(safe-area-inset-right));
  bottom:calc(7px + env(safe-area-inset-bottom));max-height:72%;display:flex;flex-direction:column;
  border-radius:18px;border:1px solid rgba(216,179,106,.32);background:var(--fz-panel);
  backdrop-filter:blur(18px);z-index:5;pointer-events:auto;transform:translateY(105%);transition:transform .24s cubic-bezier(.2,.8,.2,1);
  box-shadow:0 -14px 60px rgba(0,0,0,.62),inset 0 1px 0 rgba(240,230,207,.06)}
.fz-sheet.show{transform:translateY(0)}
.fz-sheet-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 14px 8px}
.fz-sheet-head .eyebrow{display:block;font-family:ui-monospace,monospace;font-size:.53rem;letter-spacing:.15em;
  text-transform:uppercase;color:var(--fz-gold);margin-bottom:3px}
.fz-sheet-head h3{margin:0;font-size:1.14rem;letter-spacing:-.01em;color:#f5ead2}
.fz-x{flex:0 0 auto;width:34px;height:34px;border-radius:11px;border:1px solid var(--fz-line);color:var(--fz-dim);font-size:.9rem}
.fz-sheet-body{overflow-y:auto;padding:0 14px calc(14px + env(safe-area-inset-bottom));overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch}
.fz-desc{margin:0 0 10px;color:#cbbda2;font-size:.72rem;line-height:1.48}
.fz-grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}
.fz-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
.fz-kv{padding:7px 9px;border-radius:9px;border:1px solid rgba(216,179,106,.15);background:rgba(255,255,255,.025)}
.fz-kv span{display:block;font-size:.49rem;letter-spacing:.09em;text-transform:uppercase;color:var(--fz-dim)}
.fz-kv b{display:block;margin-top:2px;font-size:.74rem;font-weight:600;color:#f0e2c6}
.fz-hp{height:7px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden;margin:0 0 12px}
.fz-hp i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#8d9a5d,#d8b36a)}
.fz-hp.low i{background:linear-gradient(90deg,#a9573c,#d9a441)}
.fz-act{display:flex;gap:7px;flex-wrap:wrap}
.fz-btn{pointer-events:auto;flex:1;min-width:104px;padding:10px 11px;border-radius:11px;border:1px solid var(--fz-line);
  background:rgba(255,255,255,.035);font-size:.72rem;letter-spacing:.03em;text-align:center;color:#eadcc2}
.fz-btn.primary{border-color:rgba(216,179,106,.62);background:linear-gradient(100deg,rgba(216,179,106,.2),rgba(141,154,93,.13));color:#f4e8c9}
.fz-btn.olive{border-color:rgba(141,154,93,.55);background:rgba(141,154,93,.13);color:#e0e9bf}
.fz-btn.danger{border-color:rgba(176,90,60,.5);background:rgba(176,90,60,.12);color:#f2bda5}
.fz-btn.wide{width:100%;flex-basis:100%}
.fz-btn:active{transform:translateY(1px)}
.fz-cost{display:block;margin-top:2px;font-size:.53rem;color:var(--fz-dim);font-family:ui-monospace,monospace}
.fz-sub{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 6px;
  font-size:.53rem;letter-spacing:.13em;text-transform:uppercase;color:var(--fz-dim);font-family:ui-monospace,monospace}
.fz-sub em{font-style:normal;color:var(--fz-gold)}
.fz-row{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:10px;border:1px solid rgba(216,179,106,.13);
  background:rgba(255,255,255,.02);margin-bottom:5px}
.fz-row .ico{flex:0 0 auto;width:27px;height:27px;border-radius:8px;display:grid;place-items:center;
  background:rgba(216,179,106,.09);color:var(--fz-gold)}
.fz-row .ico svg{width:15px;height:15px}
.fz-row .grow{flex:1;min-width:0}
.fz-row .grow b{display:block;font-size:.71rem;color:#f0e3c8}
.fz-row .grow small{display:block;font-size:.54rem;color:var(--fz-dim);line-height:1.35;margin-top:1px}
.fz-row button{flex:0 0 auto;padding:7px 9px;border-radius:8px;border:1px solid rgba(216,179,106,.42);
  background:rgba(216,179,106,.1);font-size:.58rem;letter-spacing:.03em;color:#eed9a8}
.fz-row .fz-actions{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:46%}
.fz-row .fz-actions button{flex:0 0 auto}
.fz-row.is-locked{opacity:.55}
.fz-pips{display:flex;gap:3px}
.fz-pips i{width:15px;height:4px;border-radius:9px;background:rgba(255,255,255,.14)}
.fz-pips i.on{background:var(--fz-gold);box-shadow:0 0 7px rgba(216,179,106,.4)}
.fz-progress{height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:7px 0}
.fz-progress i{display:block;height:100%;background:linear-gradient(90deg,var(--fz-gold),var(--fz-olive));border-radius:99px;transition:width .12s linear}
.fz-note{font-size:.58rem;color:var(--fz-dim);line-height:1.42;margin:8px 0 0}
.fz-warn{font-size:.61rem;line-height:1.42;color:#f0b295;background:rgba(176,90,60,.1);border:1px solid rgba(176,90,60,.3);
  padding:7px 9px;border-radius:9px;margin:8px 0 0}
.fz-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:0 14px 10px}
.fz-tabs button{padding:7px 4px;border-radius:8px;border:1px solid rgba(216,179,106,.16);background:rgba(255,255,255,.02);
  font-size:.58rem;letter-spacing:.05em;text-transform:uppercase;color:var(--fz-dim)}
.fz-tabs button.on{color:#f5e8c9;border-color:rgba(216,179,106,.48);background:rgba(216,179,106,.1)}
.fz-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:99px;border:1px solid rgba(216,179,106,.25);
  font-size:.48rem;letter-spacing:.06em;text-transform:uppercase;color:var(--fz-gold);font-family:ui-monospace,monospace}
.fz-tag.olive{border-color:rgba(141,154,93,.35);color:#bdc98d}
.fz-tag.terra{border-color:rgba(176,90,60,.4);color:#e2a184}

/* start */
.fz-start{position:absolute;inset:0;z-index:20;pointer-events:auto;overflow-y:auto;overscroll-behavior:contain;
  background:
    radial-gradient(120% 80% at 50% 0%,rgba(79,45,33,.82),rgba(27,22,16,.96) 58%,rgba(16,13,10,.99)),
    repeating-linear-gradient(0deg,rgba(216,179,106,.018) 0 1px,transparent 1px 3px);
  backdrop-filter:blur(3px);-webkit-overflow-scrolling:touch}
.fz-start-inner{max-width:470px;margin:0 auto;padding:calc(78px + env(safe-area-inset-top)) 18px calc(30px + env(safe-area-inset-bottom))}
.fz-kicker{display:inline-flex;align-items:center;gap:7px;font-family:ui-monospace,monospace;font-size:.54rem;
  letter-spacing:.17em;text-transform:uppercase;color:#b9aa8e}
.fz-kicker::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--fz-gold);box-shadow:0 0 9px rgba(216,179,106,.7)}
.fz-start h1{margin:12px 0 6px;font-size:clamp(42px,14vw,62px);line-height:.9;letter-spacing:-.025em;font-weight:600;
  background:linear-gradient(100deg,#f4e6c6 4%,#d8b36a 46%,#b05a3c 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.fz-start h1 em{display:block;font-style:normal;font-size:.2em;letter-spacing:.31em;text-transform:uppercase;
  color:#d8b36a;-webkit-text-fill-color:#d8b36a;margin-top:10px;font-family:ui-monospace,monospace}
.fz-lede{margin:14px 0 14px;color:#cdbfa4;font-size:.8rem;line-height:1.58;max-width:41ch}
.fz-saved{margin:0 0 14px;padding:8px 10px;border-radius:9px;border:1px solid rgba(141,154,93,.28);
  background:rgba(141,154,93,.07);color:#d8dfbc;font-size:.59rem;line-height:1.45}
.fz-city-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:12px 0}
.fz-city-summary div{padding:8px 4px;border-radius:9px;border:1px solid rgba(216,179,106,.16);text-align:center;
  background:rgba(255,255,255,.025)}
.fz-city-summary b{display:block;font-size:.82rem;color:#f0e2c4}
.fz-city-summary span{display:block;font-size:.46rem;letter-spacing:.08em;text-transform:uppercase;color:var(--fz-dim);margin-top:2px}
.fz-districts{display:grid;gap:7px;margin-bottom:12px}
.fz-district-card{display:flex;align-items:center;gap:10px;width:100%;padding:9px 11px;border-radius:12px;text-align:left;
  border:1px solid rgba(216,179,106,.18);background:rgba(255,255,255,.025);transition:.15s}
.fz-district-card .num{flex:0 0 auto;width:30px;font-family:ui-monospace,monospace;font-size:.66rem;color:var(--fz-dim);
  letter-spacing:.06em}
.fz-district-card .grow{flex:1;min-width:0}
.fz-district-card b{display:block;font-size:.79rem;letter-spacing:0;color:#f1e4c9}
.fz-district-card small{display:block;font-size:.56rem;color:var(--fz-dim);margin-top:2px}
.fz-district-card .pips{flex:0 0 auto}
.fz-district-card.is-on{border-color:rgba(216,179,106,.62);background:rgba(216,179,106,.09);
  box-shadow:0 0 0 1px rgba(216,179,106,.14),inset 0 0 24px rgba(216,179,106,.04)}
.fz-district-card.is-locked{opacity:.45}
.fz-district-card .lock{font-size:.62rem;color:var(--fz-dim)}
.fz-enter{width:100%;padding:13px;border-radius:12px;border:1px solid rgba(216,179,106,.65);
  background:linear-gradient(100deg,rgba(216,179,106,.22),rgba(176,90,60,.16));color:#f7ebcf;
  font-size:.77rem;letter-spacing:.1em;text-transform:uppercase;font-weight:700;
  box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 24px rgba(216,179,106,.1)}
.fz-how{margin-top:12px;border-top:1px solid rgba(216,179,106,.15);padding-top:10px}
.fz-how summary{font-size:.61rem;letter-spacing:.11em;text-transform:uppercase;color:var(--fz-dim);cursor:pointer}
.fz-how ol{margin:9px 0 0;padding-left:17px;color:#bfb196;font-size:.66rem;line-height:1.62}
.fz-how b{color:#f0e2c6;font-weight:600}

/* modals */
.fz-modal,.fz-victory{position:absolute;inset:0;z-index:30;display:grid;place-items:center;padding:calc(76px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));
  background:rgba(8,6,4,.64);backdrop-filter:blur(5px);pointer-events:auto}
.fz-modal[hidden],.fz-victory[hidden],.fz-start[hidden],.fz-sheet[hidden],.fz-scrim[hidden]{display:none!important}
.fz-card{width:100%;max-width:420px;max-height:100%;overflow-y:auto;border-radius:18px;border:1px solid rgba(216,179,106,.34);
  background:linear-gradient(180deg,rgba(35,28,20,.99),rgba(18,14,10,.99));padding:18px;
  box-shadow:0 24px 80px rgba(0,0,0,.72)}
.fz-card .kicker{display:block;font-family:ui-monospace,monospace;font-size:.53rem;letter-spacing:.16em;text-transform:uppercase;
  color:#d99a72;margin-bottom:5px}
.fz-card h2{margin:0 0 6px;font-size:1.45rem;letter-spacing:-.02em;color:#f4e7ca}
.fz-card p{margin:0 0 12px;color:#c3b59a;font-size:.72rem;line-height:1.5}
.fz-comp{display:grid;gap:5px;margin:12px 0}
.fz-comp .fz-row{margin:0}
.fz-comp .fz-row .ico{background:rgba(141,154,93,.1);color:#bdc98d}
.fz-comp .fz-row.boss .ico{background:rgba(176,90,60,.12);color:#e0a083}
.fz-comp .fz-row.boss b{color:#eda789}
.fz-statgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0}
.fz-statgrid div{padding:8px 6px;border-radius:9px;border:1px solid rgba(216,179,106,.16);text-align:center}
.fz-statgrid span{display:block;font-size:.48rem;letter-spacing:.09em;text-transform:uppercase;color:var(--fz-dim)}
.fz-statgrid b{display:block;font-size:.88rem;margin-top:3px;color:#f0e2c4}
.fz-victory .fz-card{border-color:rgba(141,154,93,.48);box-shadow:0 24px 80px rgba(0,0,0,.72),0 0 34px rgba(141,154,93,.1)}
.fz-victory .kicker{color:#bdc98d}
.fz-victory.is-defeat .fz-card{border-color:rgba(176,90,60,.55);box-shadow:0 24px 80px rgba(0,0,0,.72),0 0 34px rgba(176,90,60,.15)}
.fz-victory.is-defeat .kicker{color:#df9b7a}
.fz-vignette{position:absolute;inset:0;pointer-events:none;z-index:25;opacity:0;transition:opacity .5s;
  background:radial-gradient(120% 80% at 50% 40%,transparent 35%,rgba(90,16,8,.42) 100%)}
.fz-vignette.show{opacity:1}

@media (max-width:360px){
  .fz-chip b{font-size:.64rem}
  .fz-horde .txt b{font-size:.68rem}
  .fz-bar button span,.fz-ab b{font-size:.46rem}
  .fz-city-summary b{font-size:.75rem}
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
    .map(([key, value]) => `${Math.round(value)} ${ABBR[key] || key}`)
    .join(' · ');
}

function pips(count, total = 3) {
  let html = '<span class="fz-pips">';
  for (let i = 0; i < total; i++) html += `<i class="${i < count ? 'on' : ''}"></i>`;
  return `${html}</span>`;
}

function roman(n) {
  return ['I', 'II', 'III', 'IV', 'V'][Math.max(0, Math.min(5, n - 1))] || String(n);
}

function troopIcon(type) {
  return TROOP_ICON[type] || ICON.spear;
}

function armyTotal(army) {
  return Object.values(army || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

export function createUI(stage, callbacks) {
  const root = h('div', 'fz-ui');
  root.innerHTML = `
    <style>${CSS}</style>
    <div class="fz-top" data-el="top" hidden>
      <div class="fz-district">
        <div class="name"><b data-el="district">Firenze</b><em data-el="phase">PREPARE</em></div>
        <button class="fz-fit" data-action="fit" aria-label="Fit the city">⌂</button>
      </div>
      <div class="fz-res" data-el="res"></div>
      <div class="fz-alert" data-el="alert" hidden></div>
      <div class="fz-boss" data-el="boss" hidden>
        <div class="fz-boss-top"><span>THE CROWNED INFECTED</span><strong data-el="bossName"></strong></div>
        <div class="fz-boss-track"><i data-el="bossFill"></i></div>
      </div>
    </div>
    <div class="fz-bottom" data-el="bottom" hidden>
      <button class="fz-horde" data-el="horde" data-action="horde">
        <span class="txt"><b data-el="hordeTitle">Sound the bell</b><small data-el="hordeSub">Scout the besiegers</small></span>
        <span class="go" data-el="hordeGo">SIEGE I</span>
      </button>
      <div class="fz-bar" data-el="bar">
        <button data-action="panel" data-panel="army">${ICON.shield}<span>Army</span></button>
        <button data-action="panel" data-panel="deploy">${ICON.flag}<span>Deploy</span></button>
        <button data-action="panel" data-panel="cure">${ICON.cross}<span>Cure</span></button>
        <button data-action="panel" data-panel="market">${ICON.scales}<span>Market</span></button>
      </div>
      <div class="fz-abilities" data-el="abilities" hidden>
        <button class="fz-ab" data-action="deploySheet" data-id="deploy"><b>Deploy</b><small>rally troops</small><i class="fz-ab-cd"></i></button>
        <button class="fz-ab" data-action="ability" data-id="volley"><b>Volley</b><small>9 oil</small><i class="fz-ab-cd"></i></button>
        <button class="fz-ab" data-action="ability" data-id="rally"><b>Rally</b><small>7 oil</small><i class="fz-ab-cd"></i></button>
        <button class="fz-ab" data-action="ability" data-id="repair"><b>Repair</b><small>22 mat</small><i class="fz-ab-cd"></i></button>
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
  let CATALOG = BUILDINGS;
  let LEVELS_REF = null;

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
    const alerts = [];
    if (state.starving) alerts.push('Hungry — production halved');
    if (state.overcrowded) alerts.push('Overcrowded — build houses');
    el.alert.hidden = alerts.length === 0;
    if (alerts.length) el.alert.textContent = alerts.join(' · ');
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

  function citySummary() {
    const city = save?.city;
    const nodes = city?.nodes || [];
    const built = nodes.filter((node) => node.restored).length;
    const citizens = Number.isFinite(city?.citizens) ? city.citizens : 0;
    const army = armyTotal(city?.army) + armyTotal(city?.field);
    const cap = nodes.reduce((total, node) => {
      if (!node.restored) return total;
      const def = BUILDINGS[node.kind];
      if (!def?.armyCap) return total;
      const lv = Math.max(1, Math.min(3, Number(node.level) || 1));
      return total + def.armyCap + (node.kind === 'barracks' ? 50 : 20) * (lv - 1);
    }, 0);
    const coreHp = Number.isFinite(city?.coreHp) ? city.coreHp : 0;
    return { built, citizens, army, cap: Math.max(cap, 20), coreHp };
  }

  function paintStart(levels) {
    const cards = levels
      .map((lv) => {
        const cleared = save?.cleared?.[lv.order] || 0;
        const locked = lv.order > (save?.unlocked || 1);
        const on = lv.order === startSelected;
        const detail = locked
          ? 'Sealed'
          : cleared >= 3
            ? 'Held'
            : `${cleared}/3 hordes broken`;
        return `
          <button class="fz-district-card ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}"
            data-action="pickLevel" data-level="${lv.order}" ${locked ? 'disabled' : ''}>
            <span class="num">${roman(lv.order)}</span>
            <span class="grow"><b>${lv.name}</b><small>${lv.siege} · ${detail} · deploy limit ${lv.waveCap?.[2] || 130}</small></span>
            ${locked ? '<span class="lock">▮</span>' : pips(cleared)}
          </button>`;
      })
      .join('');
    const current = levels.find((lv) => lv.order === startSelected) || levels[0];
    const summary = citySummary();
    const hasCity = summary.built > 0 || summary.citizens > 0;
    el.start.innerHTML = `
      <div class="fz-start-inner">
        <span class="fz-kicker">Neon Arcade · Assedio di Firenze</span>
        <h1>FIRENZE<em>l'ultima luce</em></h1>
        <p class="fz-lede">One city. Three sieges. Build on the same streets, drill the same army and hold the
          Palazzo through every assault. The dead change their approach — Florence does not.</p>
        <p class="fz-saved">Your Florence is saved on this device. Buildings, upgrades, citizens, stores and the
          army all stay exactly as you left them. A lost siege never erases the city.</p>
        <div class="fz-city-summary">
          <div><b>${summary.built}</b><span>standing</span></div>
          <div><b>${summary.citizens}</b><span>citizens</span></div>
          <div><b>${summary.army}</b><span>army</span></div>
          <div><b>${summary.cap}</b><span>army cap</span></div>
        </div>
        <div class="fz-districts">${cards}</div>
        <button class="fz-enter" data-action="enter" data-level="${current.order}">${
          hasCity ? `Return to Florence · ${current.siege}` : `Enter Florence · ${current.siege}`
        }</button>
        <details class="fz-how">
          <summary>How to hold the city</summary>
          <ol>
            <li>Tap empty lots and ruins to <b>build or restore</b>. Every building can be upgraded to level III.</li>
            <li>Staff the <b>Spezieria</b> to cure nests into citizens and biomass; houses raise the population cap.</li>
            <li>Drill <b>Lancieri</b>, <b>Balestrieri</b> and <b>Cavalieri</b> in the army panel. Hundreds can fit in a full city.</li>
            <li>Before or during a siege, tap a gold <b>rally banner</b> and deploy your reserve there. Each siege level sets a deployment limit.</li>
            <li>Watchtowers, the armory and gear make the whole army harder to break.</li>
            <li>If the Palazzo falls the horde withdraws. Repair, rebuild and ring the bell again — nothing is erased.</li>
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

  function nodeRef(id) {
    return sim?.state.nodes.find((n) => n.id === id) || null;
  }

  function sheetSignature() {
    if (sheetMode === 'node' && sim) {
      const node = nodeRef(sheetId);
      if (!node) return 'none';
      return `n:${node.id}:${node.kind}:${node.level}:${node.restored}:${node.building}:${node.upgrading}:${
        node.destroyed
      }:${Math.round(node.hp)}:${node.staffed}:${node.staffNeed}:${node.progress.toFixed(2)}`;
    }
    if (sheetMode === 'zone' && sim) {
      return `z:${sheetId}:${sim.zoneUsed(sheetId)}:${sim.state.militia.length}:${JSON.stringify(sim.state.army)}`;
    }
    if (sheetMode === 'nest') return `e:${sheetId}:${panelTab}:${sim?.state.cure?.nestId || ''}`;
    if (sheetMode === 'panel') {
      return `p:${sheetId}:${panelTab}:${save?.meta?.routes?.length || 0}:${save?.meta?.gear?.length || 0}:${
        save?.meta?.upg?.weapon || 0
      }:${save?.meta?.upg?.armor || 0}:${JSON.stringify(sim?.state.army || {})}:${
        sim?.state.training?.map((t) => `${t.type}${t.count}`).join(',') || ''
      }:${sim?.state.caravan.index ?? 0}:${sim?.state.militia.length ?? 0}`;
    }
    return 'none';
  }

  function rebuildSheet(force = false) {
    if (!sim || !sheetMode) return;
    const key = sheetSignature();
    if (!force && key === sheetKey) return;
    sheetKey = key;
    if (sheetMode === 'node') {
      const node = nodeRef(sheetId);
      if (!node) return closeSheet(true);
      renderNodeSheet(node);
    } else if (sheetMode === 'zone') {
      const zone = sim.zoneById(sheetId);
      if (!zone) return closeSheet(true);
      renderZoneSheet(zone);
    } else if (sheetMode === 'nest') {
      const nest = sim.nestById(sheetId);
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

  function levelPips(node) {
    return `<span class="fz-tag">level ${roman(sim.nodeLevel(node))}</span>`;
  }

  function outputText(node) {
    const def = nodeMeta(node.kind);
    if (!def) return '—';
    const lv = sim.nodeLevel(node);
    const scale = 1 + 0.4 * (lv - 1);
    if (def.rate) {
      return Object.entries(def.rate)
        .map(([key, value]) => `+${(value * scale).toFixed(2)}/s ${ABBR[key] || key}`)
        .join(' · ');
    }
    if (def.tower) return `${Math.round(def.damage * scale)} dmg · ${(def.range + 1.8 * (lv - 1)).toFixed(1)} range`;
    if (node.kind === 'house') return `+${def.cap + 3 * (lv - 1)} citizens`;
    if (node.kind === 'barracks') return `+${def.armyCap + 50 * (lv - 1)} army space`;
    if (node.kind === 'stable') return `+${20 + 20 * (lv - 1)} space · unlocks Cavalieri`;
    if (node.kind === 'armory') return `+${8 * lv}% damage · +${6 * lv}% health`;
    if (node.kind === 'clinic') return `cure in ${sim.cureDuration().toFixed(1)}s`;
    if (node.kind === 'workshop') return 'gear · unlocks Balestrieri';
    if (node.kind === 'market') return 'exchange · caravans · routes';
    return '—';
  }

  function renderNodeSheet(node) {
    if (node.isCore) {
      el.sheetEyebrow.textContent = 'the heart of Florence';
      el.sheetTitle.textContent = node.label;
      const frac = Math.round((node.hp / node.maxHp) * 100);
      const cost = sim.repairCost(node);
      el.sheetBody.innerHTML = `
        <p class="fz-desc">If the Palazzo falls, the siege is lost. The city itself is never erased: repair the
          landmark, rally the survivors and meet the same horde again.</p>
        ${hpMarkup(node)}
        <div class="fz-grid3">
          <div class="fz-kv"><span>Condition</span><b>${frac}%</b></div>
          <div class="fz-kv"><span>Horde</span><b>${sim.state.wave}/3</b></div>
          <div class="fz-kv"><span>Citizens</span><b>${sim.state.citizens}/${sim.state.cap}</b></div>
        </div>
        <div class="fz-act">
          <button class="fz-btn primary" data-action="repair" data-id="core">Repair the Palazzo<span class="fz-cost">${costText(cost)}</span></button>
          <button class="fz-btn" data-action="panel" data-panel="deploy">Deploy the army</button>
        </div>`;
      return;
    }

    if (!node.restored && !node.building && !node.upgrading) {
      if (node.plot) {
        el.sheetEyebrow.textContent = 'empty lot';
        el.sheetTitle.textContent = 'Raise a building';
        const rows = PLOT_OPTIONS.map((kind) => {
          const def = nodeMeta(kind);
          return `
            <div class="fz-row">
              <span class="ico">${buildingIcon(kind)}</span>
              <span class="grow"><b>${def.label} <span class="fz-tag olive">${def.it}</span></b>
                <small>${def.blurb}</small></span>
              <button data-action="restore" data-id="${node.id}" data-kind="${kind}">${costText(def.cost)}</button>
            </div>`;
        }).join('');
        el.sheetBody.innerHTML = `
          <p class="fz-desc">Florence has room to grow. Choose a building; its role and upgrade path are permanent.</p>
          ${rows}`;
        return;
      }

      el.sheetEyebrow.textContent = node.destroyed ? 'destroyed' : 'ruin';
      el.sheetTitle.textContent = node.label;
      const def = nodeMeta(node.kind);
      const cost = sim.costFor(node);
      el.sheetBody.innerHTML = `
        <p class="fz-desc">${def?.blurb || 'Clear the rubble and put this ground back to work.'}</p>
        ${
          def
            ? `<div class="fz-grid2">
                <div class="fz-kv"><span>Workers</span><b>${def.staff || 'none'}</b></div>
                <div class="fz-kv"><span>Integrity</span><b>${def.hp} hp</b></div>
              </div>`
            : ''
        }
        <div class="fz-act">
          <button class="fz-btn primary" data-action="restore" data-id="${node.id}">${
            node.destroyed ? 'Rebuild' : 'Restore'
          }<span class="fz-cost">${costText(cost)}</span></button>
        </div>`;
      return;
    }

    if (node.building || node.upgrading) {
      const verb = node.upgrading ? 'Upgrading' : 'Under construction';
      el.sheetEyebrow.textContent = node.upgrading ? 'works in progress' : 'scaffolding';
      el.sheetTitle.textContent = node.label;
      el.sheetBody.innerHTML = `
        <p class="fz-desc">${verb}. The building opens when the workers finish.</p>
        <div class="fz-progress"><i data-live="nodeProgress" style="width:${node.progress * 100}%"></i></div>
        <p class="fz-note" data-live="nodeProgressText">${Math.round(node.progress * 100)}% · ${Math.ceil(
          (1 - node.progress) * node.buildTime,
        )}s</p>`;
      return;
    }

    const def = nodeMeta(node.kind);
    el.sheetEyebrow.textContent = `${def?.it || 'building'} · ${node.level >= 3 ? 'fully raised' : 'standing'}`;
    el.sheetTitle.textContent = def?.label || node.label;
    const staff = node.staffNeed ? `${node.staffed}/${node.staffNeed} workers` : 'No workers needed';
    const repair = sim.repairCost(node);
    const upCost = sim.upgradeCost(node);
    const panelFor = {
      clinic: 'cure',
      market: 'market',
      workshop: 'workshop',
      barracks: 'army',
      stable: 'army',
      armory: 'army',
    }[node.kind];
    const panelLabel = {
      cure: 'Open Spezieria',
      market: 'Open Mercato',
      workshop: 'Open Bottega',
      army: 'Open army',
    }[panelFor];
    el.sheetBody.innerHTML = `
      <p class="fz-desc">${def?.blurb || ''}</p>
      ${hpMarkup(node)}
      <div class="fz-grid3">
        <div class="fz-kv"><span>Level</span><b>${levelPips(node)}</b></div>
        <div class="fz-kv"><span>Staff</span><b>${staff}</b></div>
        <div class="fz-kv"><span>Output</span><b>${outputText(node)}</b></div>
      </div>
      <div class="fz-act">
        ${panelFor ? `<button class="fz-btn olive" data-action="panel" data-panel="${panelFor}">${panelLabel}</button>` : ''}
        ${
          upCost
            ? `<button class="fz-btn primary" data-action="upgrade" data-id="${node.id}">Upgrade to ${roman(
                sim.nodeLevel(node) + 1,
              )}<span class="fz-cost">${costText(upCost)}</span></button>`
            : '<button class="fz-btn" disabled>Maximum level</button>'
        }
        ${
          node.hp < node.maxHp
            ? `<button class="fz-btn" data-action="repair" data-id="${node.id}">Repair<span class="fz-cost">${costText(repair)}</span></button>`
            : ''
        }
      </div>`;
  }

  function buildingIcon(kind) {
    if (kind === 'farm') return ICON.food;
    if (kind === 'quarry' || kind === 'workshop' || kind === 'armory') return ICON.materials;
    if (kind === 'furnace') return ICON.energy;
    if (kind === 'clinic') return ICON.cross;
    if (kind === 'barracks' || kind === 'stable' || kind === 'tower') return ICON.shield;
    if (kind === 'market') return ICON.scales;
    if (kind === 'house') return ICON.people;
    return ICON.hammer;
  }

  function nodeMeta(kind) {
    return CATALOG[kind] || BUILDINGS[kind];
  }

  function renderNestSheet(nest) {
    const index = sim.state.nests.indexOf(nest) + 1;
    el.sheetEyebrow.textContent = 'infected nest';
    el.sheetTitle.textContent = `Nest ${roman(index)}`;
    const cure = sim.state.cure;
    const active = cure?.nestId === nest.id;
    const ready = sim.clinicReady();
    const canCure = nest.count >= 3 && !cure && ready && sim.state.phase === 'prep';
    el.sheetBody.innerHTML = `
      <p class="fz-desc">${nest.count} infected are gathered here. They will join the next horde unless cured.
        A cure turns three into citizens and biomass.</p>
      <div class="fz-grid2">
        <div class="fz-kv"><span>Infected</span><b data-live="nestCount">${nest.count}</b></div>
        <div class="fz-kv"><span>Next horde</span><b>${sim.previewWave().contribution} from nests</b></div>
      </div>
      ${
        active
          ? `<div class="fz-progress"><i data-live="cureProgress" style="width:${(cure.t / cure.duration) * 100}%"></i></div>
             <p class="fz-note" data-live="cureText">Curing… ${Math.ceil(cure.duration - cure.t)}s</p>`
          : `<div class="fz-act">
               <button class="fz-btn primary" data-action="cure" data-id="${nest.id}" ${canCure ? '' : 'disabled'}>
                 Cure 3 infected<span class="fz-cost">14 oil · ${sim.cureDuration().toFixed(1)}s</span>
               </button>
             </div>
             ${
               !ready
                 ? '<p class="fz-warn">Restore and staff the Spezieria to cure the infected.</p>'
                 : cure
                   ? '<p class="fz-note">The Spezieria is already curing another nest.</p>'
                   : '<p class="fz-note">Curing thins the next horde. Nests refill between sieges.</p>'
             }`
      }`;
  }

  function renderZoneSheet(zone) {
    const cap = sim.deployCapForWave(sim.state.phase === 'wave' ? sim.state.wave : sim.state.wave + 1);
    const used = sim.zoneUsed(zone.id);
    const zoneCap = Math.ceil(cap * 0.62);
    el.sheetEyebrow.textContent = 'rally point';
    el.sheetTitle.textContent = zone.name;
    const rows = Object.keys(TROOPS)
      .map((type) => {
        const def = sim.troopStats(type);
        const unlocked = sim.troopUnlocked(type);
        const reserve = sim.state.army[type] || 0;
        return `
          <div class="fz-row ${unlocked ? '' : 'is-locked'}">
            <span class="ico">${troopIcon(type)}</span>
            <span class="grow"><b>${def.label} <span class="fz-tag olive">${reserve} ready</span></b>
              <small>${def.blurb} · ${Math.round(def.damage)} dmg · ${Math.round(def.health)} hp</small></span>
            <span class="fz-actions">
              ${
                unlocked
                  ? `<button data-action="deploy" data-zone="${zone.id}" data-type="${type}" data-count="5" ${
                      reserve >= 1 ? '' : 'disabled'
                    }>+5</button>
                     <button data-action="deploy" data-zone="${zone.id}" data-type="${type}" data-count="10" ${
                       reserve >= 1 ? '' : 'disabled'
                     }>+10</button>`
                  : `<button disabled>${sim.lockedReason(type)}</button>`
              }
            </span>
          </div>`;
      })
      .join('');
    el.sheetBody.innerHTML = `
      <p class="fz-desc">${zone.blurb} Troops arrive here and fight on their own. A single rally point can hold
        only part of a wave, so use two or three gates.</p>
      <div class="fz-grid3">
        <div class="fz-kv"><span>This gate</span><b>${used}/${zoneCap} space</b></div>
        <div class="fz-kv"><span>Wave limit</span><b>${sim.deployedSpace()}/${cap}</b></div>
        <div class="fz-kv"><span>Reserve</span><b>${armyTotal(sim.state.army)} troops</b></div>
      </div>
      ${rows}
      ${
        sim.state.phase === 'prep' && sim.state.militia.length
          ? '<div class="fz-act"><button class="fz-btn" data-action="recall">Recall the whole field</button></div>'
          : ''
      }`;
  }

  function renderPanel(name) {
    if (name === 'army') return renderArmy();
    if (name === 'deploy') return renderDeploy();
    if (name === 'cure') return renderCurePanel();
    if (name === 'market') return renderMarket();
    if (name === 'workshop') return renderWorkshop();
  }

  function trainingQueueMarkup() {
    const queue = sim.state.training;
    if (!queue.length) return '<p class="fz-note">No troops in training.</p>';
    return queue
      .map((entry, index) => {
        const def = TROOPS[entry.type];
        const pct = def ? Math.min(100, (entry.progress / def.time) * 100) : 0;
        return `
          <div class="fz-row">
            <span class="ico">${troopIcon(entry.type)}</span>
            <span class="grow"><b>${def?.label || entry.type} × ${entry.count}</b>
              <small data-live="trainText-${index}">drilling…</small>
              <div class="fz-progress"><i data-live="trainBar-${index}" style="width:${pct}%"></i></div>
            </span>
            <button data-action="cancelTrain" data-index="${index}">Stop</button>
          </div>`;
      })
      .join('');
  }

  function renderArmy() {
    const army = sim.state.army;
    const cap = sim.state.armyCap;
    const nextCap = sim.deployCapForWave(sim.state.wave + 1);
    el.sheetEyebrow.textContent = 'caserma';
    el.sheetTitle.textContent = 'The army of Florence';
    const rows = Object.keys(TROOPS)
      .map((type) => {
        const def = sim.troopStats(type);
        const unlocked = sim.troopUnlocked(type);
        const reserve = army[type] || 0;
        const cost10 = sim.trainCost(type, 10);
        const cost25 = sim.trainCost(type, 25);
        return `
          <div class="fz-row ${unlocked ? '' : 'is-locked'}">
            <span class="ico">${troopIcon(type)}</span>
            <span class="grow"><b>${def.label} <span class="fz-tag">${def.en}</span></b>
              <small>${def.blurb}<br>${Math.round(def.damage)} dmg · ${Math.round(def.health)} hp · ${
                def.range > 1.2 ? `${def.range.toFixed(1)} range` : 'melee'
              } · ${def.space} space</small></span>
            <span class="fz-actions">
              ${
                unlocked
                  ? `<button data-action="train" data-type="${type}" data-count="10" ${
                      sim.canPay(cost10) ? '' : 'disabled'
                    }>+10<span class="fz-cost">${costText(cost10)}</span></button>
                     <button data-action="train" data-type="${type}" data-count="25" ${
                       sim.canPay(cost25) ? '' : 'disabled'
                     }>+25<span class="fz-cost">${costText(cost25)}</span></button>`
                  : `<button disabled>${sim.lockedReason(type)}</button>`
              }
            </span>
          </div>`;
      })
      .join('');
    el.sheetBody.innerHTML = `
      <div class="fz-grid3">
        <div class="fz-kv"><span>Reserve</span><b>${armyTotal(army)} troops</b></div>
        <div class="fz-kv"><span>Army space</span><b>${sim.armySpace()}/${cap}</b></div>
        <div class="fz-kv"><span>Next wave limit</span><b>${nextCap} space</b></div>
      </div>
      <p class="fz-desc">Drill troops here, then deploy them at one of the three gold rally banners. Losses are
        permanent, but survivors return to reserve after a horde breaks.</p>
      <div class="fz-sub">Recruitment <em>${sim.state.phase === 'prep' ? 'open' : 'siege in progress'}</em></div>
      ${rows}
      <div class="fz-sub">Training queue <em>${sim.state.training.length ? 'working' : 'idle'}</em></div>
      ${trainingQueueMarkup()}
      <div class="fz-act">
        <button class="fz-btn primary" data-action="panel" data-panel="deploy">Deploy troops</button>
        ${
          sim.state.phase === 'prep' && sim.state.militia.length
            ? '<button class="fz-btn" data-action="recall">Recall field</button>'
            : ''
        }
      </div>`;
  }

  function renderDeploy() {
    const cap = sim.deployCapForWave(sim.state.phase === 'wave' ? sim.state.wave : sim.state.wave + 1);
    el.sheetEyebrow.textContent = 'take the field';
    el.sheetTitle.textContent = 'Rally points';
    const zones = sim.state.zones
      .map((zone) => {
        const used = sim.zoneUsed(zone.id);
        return `
          <div class="fz-row">
            <span class="ico">${ICON.flag}</span>
            <span class="grow"><b>${zone.name}</b><small>${zone.blurb}</small></span>
            <button data-action="zone" data-id="${zone.id}">${used ? `${used} space` : 'Deploy'}</button>
          </div>`;
      })
      .join('');
    el.sheetBody.innerHTML = `
      <div class="fz-grid3">
        <div class="fz-kv"><span>On field</span><b>${sim.deployedSpace()}/${cap}</b></div>
        <div class="fz-kv"><span>Reserve</span><b>${armyTotal(sim.state.army)}</b></div>
        <div class="fz-kv"><span>Wave</span><b>${Math.min(3, sim.state.wave + 1)}/3</b></div>
      </div>
      <p class="fz-desc">Tap a gold rally banner on the map or choose a gate below. Troops must be trained in the
        army panel first. One gate can hold ${Math.ceil(cap * 0.62)} army space of this wave's ${cap}.</p>
      ${zones}
      ${
        sim.state.phase === 'prep' && sim.state.militia.length
          ? '<div class="fz-act"><button class="fz-btn" data-action="recall">Recall the whole field</button></div>'
          : ''
      }
      <p class="fz-note">During a siege, reinforce through the Deploy button above the abilities.</p>`;
  }

  function renderCurePanel() {
    const cure = sim.state.cure;
    el.sheetEyebrow.textContent = 'spezieria';
    el.sheetTitle.textContent = 'The cure';
    const ready = sim.clinicReady();
    el.sheetBody.innerHTML = `
      <p class="fz-desc">${
        ready
          ? `The Spezieria is staffed. Each cure costs 14 oil and takes ${sim.cureDuration().toFixed(1)}s.`
          : 'Restore and staff the Spezieria to cure the infected instead of killing them.'
      }</p>
      ${
        cure
          ? `<div class="fz-progress"><i data-live="curePanelProgress" style="width:${(cure.t / cure.duration) * 100}%"></i></div>
             <p class="fz-note" data-live="curePanelText">Curing Nest ${roman(
               sim.state.nests.findIndex((n) => n.id === cure.nestId) + 1,
             )}… ${Math.ceil(cure.duration - cure.t)}s</p>`
          : ''
      }
      ${sim.state.nests
        .map((nest, i) => {
          const can = ready && !cure && nest.count >= 3 && sim.state.phase === 'prep';
          return `
            <div class="fz-row">
              <span class="ico">${ICON.skull}</span>
              <span class="grow"><b>Nest ${roman(i + 1)}</b><small>${nest.count} infected · sends ${Math.round(
                nest.count * WAVES.nestFactor[Math.min(2, sim.state.wave)],
              )} to the next horde</small></span>
              <button data-action="cure" data-id="${nest.id}" ${can ? '' : 'disabled'}>Cure 3</button>
            </div>`;
        })
        .join('')}`;
  }

  function renderMarket() {
    const market = sim.state.nodes.find((n) => n.kind === 'market');
    el.sheetEyebrow.textContent = 'mercato';
    el.sheetTitle.textContent = 'Trade in Florence';
    if (!market?.restored) {
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
        <p class="fz-note">One caravan per arrival. The roads are dangerous, but the price is fixed.</p>`;
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
                  ? '<button disabled>Open</button>'
                  : `<button data-action="route" data-id="${id}" ${sim.canPay(route.cost) ? '' : 'disabled'}>${costText(
                      route.cost,
                    )}</button>`
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
      el.sheetBody.innerHTML = `<p class="fz-desc">The Bottega is cold. Restore it to craft gear, unlock
        Balestrieri and train the army. Gear and ranks are permanent.</p>`;
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
                : `<button data-action="gear" data-id="${id}" ${sim.canPay(item.cost) ? '' : 'disabled'}>${costText(
                    item.cost,
                  )}</button>`
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
                : `<button data-action="upgradeTrack" data-track="${track}" ${
                    sim.canPay(up.costs[rank]) ? '' : 'disabled'
                  }>${costText(up.costs[rank])}</button>`
            }
          </div>`;
      })
      .join('');
    el.sheetBody.innerHTML = `
      <p class="fz-desc">Permanent improvements to the army. They survive every lost siege.</p>
      <div class="fz-sub">Gear</div>${gear}
      <div class="fz-sub">Drill</div>${upgrades}
      <div class="fz-act"><button class="fz-btn primary" data-action="panel" data-panel="army">Open army</button></div>`;
  }

  /* -------------------------------- refresh --------------------------------- */

  function refresh(state, saveRef, force = false) {
    if (!state || !sim) return;
    save = saveRef;
    const now = performance.now();
    if (!force && now - lastRefresh < 90) return;
    lastRefresh = now;
    paintResources(state);
    el.district.textContent = `Firenze · ${state.level.name}`;
    const inWave = state.phase === 'wave';
    const secured = (save?.cleared?.[state.level.order] || 0) >= 3;
    el.phase.textContent = inWave
      ? `SIEGE ${state.wave}/3`
      : state.phase === 'victory' || secured
        ? 'HELD'
        : 'PREPARE';
    el.phase.classList.toggle('is-wave', inWave);

    if (inWave) {
      el.horde.hidden = true;
      el.bar.hidden = true;
      el.abilities.hidden = false;
      for (const button of el.abilities.querySelectorAll('[data-id]')) {
        if (button.dataset.id === 'deploy') {
          const canDeploy = armyTotal(state.army) > 0 && sim.deployedSpace() < sim.deployCapForWave(state.wave);
          button.disabled = !canDeploy;
          button.classList.toggle('is-ready', canDeploy);
          const small = button.querySelector('small');
          if (small) small.textContent = `${armyTotal(state.army)} reserve`;
          continue;
        }
        const ability = state.abilities[button.dataset.id];
        if (!ability) continue;
        const ready = ability.cd <= 0 && sim.canPay(ability.cost);
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
        ? 'Ring the bell again'
        : `Sound the bell · Horde ${roman(plan.wave)}`;
      el.hordeSub.textContent = secured
        ? 'The city is held. Replay the assault with the army you have now.'
        : state.phase === 'victory'
          ? 'Florence still stands'
          : `${plan.walkers} shamblers${plan.runners ? ` · ${plan.runners} runners` : ''}${
              plan.brutes ? ` · ${plan.brutes} brutes` : ''
            }${plan.boss ? ' · a crowned boss' : ''} · deploy limit ${plan.deployCap}`;
      el.hordeGo.textContent = `HORDE ${roman(plan.wave)}`;
      el.horde.classList.toggle('is-boss', Boolean(plan.boss));
      el.horde.disabled = state.phase !== 'prep';
    }
    el.bar.querySelector('[data-panel="cure"]').classList.toggle('is-live', Boolean(state.cure) || sim.clinicReady());
    el.bar.querySelector('[data-panel="army"]').classList.toggle(
      'is-live',
      state.training.length > 0 || armyTotal(state.army) > 0,
    );
    el.bar.querySelector('[data-panel="deploy"]').classList.toggle(
      'is-live',
      state.militia.length > 0 || armyTotal(state.army) > 0,
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
      const node = nodeRef(sheetId);
      if (node?.building || node?.upgrading) {
        const bar = el.sheetBody.querySelector('[data-live="nodeProgress"]');
        if (bar) bar.style.width = `${node.progress * 100}%`;
        const text = el.sheetBody.querySelector('[data-live="nodeProgressText"]');
        if (text)
          text.textContent = `${Math.round(node.progress * 100)}% · ${Math.ceil(
            (1 - node.progress) * node.buildTime,
          )}s`;
      }
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
    if (sheetMode === 'panel' && sheetId === 'army') {
      state.training.forEach((entry, index) => {
        const def = TROOPS[entry.type];
        if (!def) return;
        const bar = el.sheetBody.querySelector(`[data-live="trainBar-${index}"]`);
        if (bar) bar.style.width = `${Math.min(100, (entry.progress / def.time) * 100)}%`;
        const text = el.sheetBody.querySelector(`[data-live="trainText-${index}"]`);
        if (text)
          text.textContent = `${entry.count} left · next in ${Math.max(0, def.time - entry.progress).toFixed(1)}s`;
      });
    }

    for (const button of el.sheetBody.querySelectorAll(
      'button[data-action="restore"],button[data-action="route"],button[data-action="gear"],button[data-action="upgrade"],button[data-action="upgradeTrack"],button[data-action="exchange"],button[data-action="caravan"],button[data-action="train"],button[data-action="repair"]',
    )) {
      const action = button.dataset.action;
      let cost = null;
      if (action === 'restore') {
        const node = nodeRef(button.dataset.id);
        if (node) cost = node.plot && button.dataset.kind ? sim.buildCost(button.dataset.kind) : sim.costFor(node);
      } else if (action === 'route') cost = ROUTES[button.dataset.id]?.cost;
      else if (action === 'gear') cost = GEAR[button.dataset.id]?.cost;
      else if (action === 'upgrade') {
        const node = nodeRef(button.dataset.id);
        if (node) cost = sim.upgradeCost(node);
      } else if (action === 'upgradeTrack') {
        const rank = save?.meta?.upg?.[button.dataset.track] || 0;
        cost = UPGRADES[button.dataset.track]?.costs[rank];
      } else if (action === 'exchange') cost = EXCHANGE[Number(button.dataset.i)]?.give;
      else if (action === 'caravan') cost = CARAVANS[state.caravan.index]?.give;
      else if (action === 'train') cost = sim.trainCost(button.dataset.type, Number(button.dataset.count));
      else if (action === 'repair') {
        const node = button.dataset.id === 'core' ? state.core : nodeRef(button.dataset.id);
        if (node) cost = sim.repairCost(node);
      }
      if (cost) button.disabled = !sim.canPay(cost);
    }

    for (const button of el.sheetBody.querySelectorAll('button[data-action="deploy"]')) {
      const type = button.dataset.type;
      const reserve = state.army[type] || 0;
      button.disabled = reserve <= 0 || !sim.troopUnlocked(type);
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
      ? `<div class="fz-row boss"><span class="ico">${ICON.crown}</span><span class="grow"><b>${plan.boss}</b>
         <small>${plan.bossHp} hp · the crowned infected</small></span></div>`
      : '';
    const reserve = armyTotal(state.army);
    const field = state.militia.length;
    const noTroops = reserve + field === 0;
    el.modal.innerHTML = `
      <div class="fz-card">
        <span class="kicker">${plan.boss ? 'the last horde' : `horde ${roman(plan.wave)} of iii`}</span>
        <h2>${plan.boss ? plan.boss : 'The streets are moving'}</h2>
        <p>${plan.contribution} of them crawl out of nests you left alone. Your wave limit is
          <b>${plan.deployCap} army space</b>. Field ${field} · reserve ${reserve}.</p>
        <div class="fz-comp">${rows}${boss}</div>
        ${noTroops ? '<p class="fz-warn">No troops are trained or deployed. The Palazzo will stand alone.</p>' : ''}
        ${field === 0 && reserve > 0 ? '<p class="fz-warn">Your reserve is still in the barracks. Deploy at a gold banner before the bell — or reinforce during the siege.</p>' : ''}
        <div class="fz-act">
          <button class="fz-btn" data-action="cancelWave">Not yet</button>
          <button class="fz-btn primary" data-action="beginWave">Begin the siege</button>
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
    el.victory.innerHTML = `
      <div class="fz-card">
        <span class="kicker">${final ? 'florence endures' : 'siege broken'}</span>
        <h2>${final ? 'The last light holds' : `${lv.name} is held`}</h2>
        <p>${final
          ? 'The crowned thing is down in the piazza and the bells are ringing. The city is still yours — every wall, every workshop, every soldier left standing.'
          : `The horde is broken and the roads are open. ${next ? `${next.name} is next.` : ''} Your city and army come with you.`}</p>
        <div class="fz-statgrid">
          <div><span>Kills</span><b>${stats.kills}</b></div>
          <div><span>Cured</span><b>${stats.cured}</b></div>
          <div><span>Hordes</span><b>${totalWaves}</b></div>
        </div>
        <div class="fz-act">
          ${
            final
              ? '<button class="fz-btn primary" data-action="stay">Keep building Florence</button><button class="fz-btn" data-action="replay">Replay the last siege</button>'
              : `<button class="fz-btn primary" data-action="nextLevel" data-level="${next?.order || lv.order}">March to ${next?.name || 'the next siege'}</button>
                 <button class="fz-btn" data-action="stay">Keep building</button>`
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
        <span class="kicker">the piazza is lost</span>
        <h2>${lv.coreName} has fallen</h2>
        <p>The horde pulls back at dawn, gorged and lazy. Nothing is erased: every building, every citizen,
          every upgrade and every surviving soldier remains. Patch the Palazzo and ring the bell again.</p>
        <div class="fz-statgrid">
          <div><span>Horde</span><b>${roman(Math.max(1, wave))}</b></div>
          <div><span>Kills</span><b>${stats.kills}</b></div>
          <div><span>Cured</span><b>${stats.cured}</b></div>
        </div>
        <div class="fz-act">
          <button class="fz-btn primary" data-action="rally">Rally Florence</button>
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
    }, 2600);
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
      if (action === 'upgrade') {
        callbacks.onUpgrade?.(button.dataset.id);
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
      if (action === 'deploySheet') {
        openSheet('panel', 'deploy');
        return;
      }
      if (action === 'panel') {
        const panel = button.dataset.panel;
        if (panel === 'army' || panel === 'deploy') callbacks.onSelect?.(null, null);
        openSheet('panel', panel);
        return;
      }
      if (action === 'zone') {
        openSheet('zone', button.dataset.id);
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
      if (action === 'upgradeTrack') {
        callbacks.onUpgradeTrack?.(button.dataset.track);
        return;
      }
      if (action === 'train') {
        callbacks.onTrain?.(button.dataset.type, Number(button.dataset.count));
        return;
      }
      if (action === 'cancelTrain') {
        callbacks.onCancelTraining?.(Number(button.dataset.index));
        return;
      }
      if (action === 'deploy') {
        callbacks.onDeploy?.(button.dataset.zone, button.dataset.type, Number(button.dataset.count));
        return;
      }
      if (action === 'recall') {
        callbacks.onRecall?.();
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

  function openZone(id) {
    if (!sim) return;
    const zone = sim.state.zones.find((z) => z.id === id);
    if (zone) {
      callbacks.onSelect?.('zone', id);
      openSheet('zone', id);
    }
  }

  function openPanel(name) {
    openSheet('panel', name);
  }

  function setCatalog(catalog) {
    CATALOG = catalog;
  }

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
    openZone,
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
