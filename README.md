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
| **Firenze: Last Light** | Rebuild a ruined neon Florence, cure the infected, trade, craft and hold off three hordes per district. The city is saved on your device. | Tap / drag |

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
   └─ firenze-1.0.0.arcp Firenze: Last Light
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
budgeted at 2 MB; the three shipped packs are ~137–164 KB each. Assets (glow/noise
textures, icons) are generated at build time by a dependency-free PNG writer in
`scripts/png.mjs`, so no binary art is committed.

## Firenze: Last Light

A compact real-time strategy game about holding a city together after the outbreak.
Each of the three districts (Oltrarno, Santa Croce, Duomo) has three hordes, and the
third always brings a boss. You choose when to ring the bell.

- **Rebuild** ruined houses, farms, quarries, furnaces, infirmaries, barracks,
  markets, workshops and watchtowers. Citizens staff them automatically, in priority
  order `clinic → farm → quarry → furnace → market → workshop`.
- **Cure** three infected from a nest to gain survivors and biomass, and to make the
  next horde smaller. Biomass burns for energy at the furnace.
- **Trade** through caravans, permanent routes and fixed exchanges. The Bottega
  crafts gear and trains militia ranks.
- **Fight** with auto-battling militia and towers, plus three cooldown abilities.
- **Persist** the whole city in `localStorage` under
  `neon-arcade:firenze:city:v1`: every plot, store, survivor, nest count and wave.
  A lost horde withdraws, patches the landmark and leaves the city intact. Nothing
  resets or restarts the district — the same Florence is there next launch.
  Permanent gear, routes and upgrades live in the same save.
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
  buildings, survivors, stores, nests, wave progress and permanent upgrades. It
  survives reloads, losses and pack updates, and is only removed if you clear site
  data or browser storage.
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
