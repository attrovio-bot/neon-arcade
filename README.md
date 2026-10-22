# Neon Arcade

[![Deploy arcade to GitHub Pages](https://github.com/attrovio-bot/neon-arcade/actions/workflows/deploy.yml/badge.svg)](https://github.com/attrovio-bot/neon-arcade/actions/workflows/deploy.yml)

A mobile-first Three.js arcade where the hub stays tiny and every game arrives as a
versioned binary pack. Tap a game, watch it stream and verify, then play — online or in
airplane mode. Delete a pack whenever you want the space back.

Live: **https://attrovio-bot.github.io/neon-arcade/**

| Game | What it is | Controls |
| --- | --- | --- |
| **Neon Stack** | Drop sliding slabs, keep the tower alive, win width back with dead-centre drops. | Tap |
| **Tunnel Run** | Steer a ship through collapsing neon gates, thread the holes, grab orbs. | Drag / keys |
| **Firenze: Last Light** | One persistent Florence, three sieges: rebuild and upgrade the city, drill a specialized army, then deploy it at the gates. | Tap / drag |

## How it works

The hub (`src/`) is a plain ES-module Vite app: catalog UI, download/verify/unpack,
IndexedDB cache, PWA shell and the player runtime. It ships **no game code and no
game engine** — Three.js is bundled inside each pack, so a pack is self-contained.

```
GitHub Pages
├─ /                     hub shell (HTML/JS/CSS + icons), precached by the service worker
└─ /packs/
   ├─ index.json         catalog: id, version, file, size, sha256
   ├─ stack-1.0.0.arcp   Neon Stack
   ├─ tunnel-1.0.0.arcp  Tunnel Run
   └─ firenze-2.0.0.arcp Firenze: Last Light
```

Tapping a game:

1. Looks up the pack in the catalog and fetches the `.arcp` file with a streamed
   reader, so the loader can show real byte progress and be cancelled.
2. Verifies the gzip-decompressed entry against the SHA-256 in the file header and
   checks the payload length. A truncated or tampered file is rejected before any
   code is executed.
3. Stores the header + payload in IndexedDB (`neon-arcade` → `meta` and `blobs`).
4. Imports the entry from a blob URL and hands it a stage, audio, haptics and score
   callbacks. The player owns the rAF loop, HUD, pause, retry and best scores.

Offline: the service worker precaches the shell; installed packs live in IndexedDB.
The catalog is NetworkFirst, so the shelf opens offline and shows what is installed.
Ignoring `.arcp` in the precache is deliberate — game downloads stay user-initiated.

### Pack format (`ARCP`)

```
offset 0   "ARCP"          magic
offset 4   1               container format
offset 5   flags           reserved
offset 8   u32 LE          header length
offset 12  JSON header     id, name, version, art, controls, asset table,
                           payloadBytes, payloadSha256, entry {offset,length,...}
...        payload         gzip(entry JS) followed by assets, back to back
```

Building (`scripts/build-packs.mjs`) bundles each `games/<id>/index.js` with esbuild
(minified ESM, Three.js included), gzips it, appends declared assets, wraps it in the
container and writes `public/packs/<id>-<version>.arcp` plus `index.json`. Packs are
budgeted at 2 MB; the three shipped packs are ~137–172 KB each. Assets (glow/noise
textures, icons) are generated at build time by a dependency-free PNG writer in
`scripts/png.mjs`, so no binary art is committed.

## Firenze: Last Light

A compact real-time strategy game about holding one city together after the outbreak.
The same Florence is used for all three sieges (Porta San Frediano, Ponte Vecchio and
Santa Maria del Fiore), and every building, upgrade, citizen and soldier is carried
between them. Each siege has three hordes; the third brings a crowned boss.

- **Build and upgrade** houses, farms, quarries, lime kilns, spezierie, barracks,
  stables, armories, markets, botteghe and watchtowers. Empty lots accept any building,
  and every building can be raised to level III. Citizens staff workplaces
  automatically in priority order `spezieria → farm → quarry → furnace → market →
  bottega → armory → stables`.
- **Raise a specialized army**: Lancieri (cheap spearmen), Balestrieri (ranged
  crossbowmen, unlocked by the Bottega) and Cavalieri (armoured shock troops, unlocked
  by the Stables). Barracks, stable levels, armory levels, gear and permanent drill
  ranks determine capacity, damage and health. A fully developed city can keep
  hundreds of soldiers.
- **Deploy at three rally banners** (Porta a Prato, Borgo Ognissanti and Santa Croce)
  before or during a siege. Each siege level and horde sets a deployment limit; a
  single gate can only hold part of the force, so spreading across two or three
  approaches matters. Deployed troops auto-fight; survivors return to reserve when a
  horde breaks, while the fallen are lost.
- **Cure** three infected from a nest to gain citizens and biomass, and to make the
  next horde smaller. Biomass burns for energy at the lime kiln.
- **Trade** through caravans, permanent routes and fixed exchanges. The Bottega
  crafts gear and permanent army drills.
- **Fight** with auto-battling soldiers, watchtowers, a rally ability, volleys and
  emergency repairs.
- **Persist** the whole city in `localStorage` under
  `neon-arcade:firenze:city:v1`: every plot, building level, store, citizen, nest,
  reserve soldier, training queue and wave. A lost siege withdraws the horde, patches
  the Palazzo and leaves the city intact. Nothing resets or restarts Florence — the
  same city and army are there next launch. Version 1 saves are migrated by keeping
  the most developed district.
- The arcade best for this pack is the total number of hordes held (0–9), committed
  through `ctx.saveScore()` as soon as it grows.

## Local development

```bash
npm ci
npm run dev          # builds packs, then Vite dev server
npm run build        # packs + production bundle into dist/
npm run preview      # serve dist/ on http://localhost:4173/
npm run packs        # rebuild packs only
npm run packs:inspect -- public/packs/stack-1.0.0.arcp
```

Install Playwright's Chromium once to run the end-to-end test:

```bash
npx playwright install chromium
npm run build
npm run preview            # in one terminal
npm run smoke              # in another; screenshots land in shots/
```

The smoke test covers catalog render, download/verify/cache, gameplay and scoring,
retry, offline relaunch from IndexedDB, Firenze's persistent city, the storage sheet,
pack deletion and tamper rejection.

## Adding a game

1. Create `games/<id>/game.json`:

   ```json
   {
     "id": "orbit",
     "order": 4,
     "name": "Orbit",
     "tagline": "One-line pitch shown on the card.",
     "version": "1.0.0",
     "accent": "#22e1ff",
     "accent2": "#ff2f8e",
     "art": "orbit",
     "hint": "Hold to thrust",
     "scoreLabel": "SCORE",
     "controls": ["hold"],
     "entry": "index.js",
     "assets": [{ "path": "glow.png", "file": "assets/glow.png", "mime": "image/png" }]
   }
   ```

2. Add `games/<id>/index.js` exporting a game:

   ```js
   export default {
     init(ctx) {
       // ctx: stage, meta, width, height, dpr, assets.url(path), audio, haptic,
       //      best, reducedMotion, coarsePointer,
       //      setScore(n), saveScore(n), setLabel(text),
       //      gameOver({ score, note, delay }), toast(msg)
       return {
         update(dt) {},
         render() {},
         resize(width, height, dpr) {},
         dispose() {},
       };
     },
   };
   ```

3. `npm run build`. The pack and catalog entry are generated automatically; bump
   `version` to make existing installs show **update available**.

`art` selects the cover styling (`stack`, `tunnel`, `firenze`, or a custom drawing key
in `src/main.js`); `accent`/`accent2` theme the card, loader and HUD.

## Storage and privacy

- Installed packs and best scores live locally in IndexedDB.
- Firenze keeps its city in `localStorage` (`neon-arcade:firenze:city:v1`):
  buildings and levels, citizens, stores, nests, reserve army, training queue, wave
  progress and permanent upgrades. It survives reloads, losses and pack updates, and
  is only removed if you clear site data or browser storage.
- **Storage** in the hub shows usage, requests persistent storage, and deletes one
  pack or everything.
- Deleting a pack removes its header and payload; best scores stay on the device.
- No analytics, accounts or network calls beyond fetching the catalog and packs.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci`, `npm run build`
with `BASE_PATH=/<repo>/`, uploads `dist/` as a Pages artifact and deploys it. Enable
Pages with **Settings → Pages → Source: GitHub Actions** (or `build_type=workflow`).
The catalog and all packs are rebuilt and published with the shell, so a version bump
reaches clients on the next visit.

## Ideas

- A daily seeded challenge with a shareable result string.
- Ghost replays: store the input trace, not video, and replay it on the card.
- Delta packs or per-game chunks for larger games.
- Ed25519-signed catalogs if packs ever come from more than one repo.
- Optional global leaderboard (small Worker + D1) with an offline queue.
