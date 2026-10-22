/**
 * End-to-end smoke test against a built preview server.
 *   npm run build && npm run preview     (in one terminal)
 *   node scripts/smoke.mjs               (in another)
 *
 * Covers: catalog render, pack download + verify + cache, gameplay mount,
 * offline relaunch from cache, pack deletion and tampered-pack rejection.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const TARGET = process.env.URL || 'http://localhost:4173/';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
});
const page = await context.newPage();

const problems = [];
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  shot ${name}`);
};
const step = (label) => console.log(`\n▸ ${label}`);
const leaveGame = async () => {
  if (await page.locator('#over').isVisible()) {
    await page.click('#overExitBtn');
  } else {
    await page.click('#exitBtn');
  }
  await page.waitForTimeout(700);
};

try {
  step('hub renders');
  await page.goto(TARGET, { waitUntil: 'networkidle' });
  await page.waitForSelector('.card .btn.primary');
  await page.waitForTimeout(1000);
  await shot('01-hub');

  const cards = await page.locator('.card').count();
  console.log(`  cards: ${cards}`);
  if (cards !== 3) throw new Error(`expected 3 cards, saw ${cards}`);

  step('download + verify + launch Neon Stack');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 40,
    downloadThroughput: 140 * 1024,
    uploadThroughput: 140 * 1024,
  });
  await page.locator('.card', { hasText: 'Neon Stack' }).locator('.btn.primary').click();
  await page.waitForSelector('#loader:not([hidden])');
  await page.waitForTimeout(500);
  await shot('02-loader');
  await page.waitForSelector('#play:not([hidden]) .stage canvas', { timeout: 30000 });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await page.waitForTimeout(1400);
  await shot('03-stack-idle');

  step('play a few drops');
  for (let i = 0; i < 7; i++) {
    await page.mouse.click(195, 520);
    await page.waitForTimeout(420);
  }
  await shot('04-stack-playing');
  const score = await page.textContent('#hudScore');
  console.log(`  hud score: ${score}`);
  if (Number(score.replace(/\D/g, '')) < 1) throw new Error('score did not increase');

  step('back to the shelf (pack should read ready offline)');
  if (await page.locator('#over').isVisible()) {
    await shot('04b-game-over');
    await page.click('#againBtn');
    await page.waitForTimeout(1100);
    await shot('04c-retry');
    if (!(await page.locator('#stage canvas').isVisible())) throw new Error('retry did not remount');
  }
  await leaveGame();
  await page.waitForTimeout(300);
  await shot('05-hub-installed');
  const chip = await page.textContent('#storageLabel');
  console.log(`  storage chip: ${chip}`);
  const status = await page.locator('.card', { hasText: 'Neon Stack' }).locator('.cover-state').textContent();
  console.log(`  card status: ${status}`);
  if (!/ready/i.test(status)) throw new Error('pack did not report ready offline');

  step('go offline and relaunch from cache');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.card h2');
  await page.waitForTimeout(600);
  await shot('06-hub-offline');
  await page.locator('.card', { hasText: 'Neon Stack' }).locator('.btn.primary').click();
  await page.waitForSelector('#play:not([hidden]) .stage canvas', { timeout: 30000 });
  await page.waitForTimeout(1200);
  await shot('07-offline-play');
  await leaveGame();
  await context.setOffline(false);

  step('Tunnel Run boots (second pack)');
  await page.locator('.card', { hasText: 'Tunnel Run' }).locator('.btn.primary').click();
  await page.waitForSelector('#play:not([hidden]) .stage canvas', { timeout: 30000 });
  await page.waitForTimeout(2600);
  await shot('08-tunnel');
  await page.mouse.move(195, 600);
  await page.mouse.down();
  await page.mouse.move(255, 520, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  await shot('09-tunnel-steer');
  const tunnelScore = await page.textContent('#hudScore');
  console.log(`  tunnel score: ${tunnelScore}`);
  if (Number(tunnelScore.replace(/\D/g, '')) < 1) throw new Error('tunnel score stayed at zero');
  await leaveGame();

  step('Firenze boots and persists its city');
  await page.locator('.card', { hasText: 'Firenze' }).locator('.btn.primary').click();
  await page.waitForSelector('.fz-start:not([hidden])', { timeout: 40000 });
  await page.waitForTimeout(700);
  await shot('10-firenze-start');
  const cityLine = await page.textContent('.fz-saved');
  if (!/saved on this device/i.test(cityLine)) throw new Error('Firenze did not advertise its local save');
  await page.click('.fz-enter');
  await page.waitForSelector('.fz-top:not([hidden])', { timeout: 10000 });
  await page.waitForTimeout(3600);
  await shot('10b-firenze-city');
  const citySave = await page.evaluate(() => {
    const raw = localStorage.getItem('neon-arcade:firenze:city:v1');
    if (!raw) return null;
    const save = JSON.parse(raw);
    return save?.city ?? null;
  });
  if (!citySave) throw new Error('Firenze city was not written to localStorage');
  if (!(citySave.nodes || []).length) throw new Error('Firenze save has no buildings');
  if (!citySave.army || typeof citySave.army !== 'object') throw new Error('Firenze save has no army');
  console.log(
    `  city saved: ${citySave.nodes.length} plots, ${citySave.citizens} citizens, ${Object.values(citySave.army).reduce(
      (sum, n) => sum + n,
      0,
    )} troops`,
  );
  await leaveGame();

  step('storage sheet');
  await page.click('#storageBtn');
  await page.waitForTimeout(700);
  await shot('10-storage');
  const sheet = await page.textContent('#sheetUsage');
  console.log(`  sheet: ${sheet}`);

  step('delete one pack');
  await page.locator('.pack-row', { hasText: 'Tunnel Run' }).locator('button').click();
  await page.waitForTimeout(800);
  await shot('11-storage-after-delete');
  await page.click('#sheetClose');

  step('tampered pack is rejected');
  // empty the cache so the next launch must hit the network
  await page.click('#storageBtn');
  await page.waitForTimeout(500);
  await page.click('#clearBtn');
  await page.waitForTimeout(200);
  await page.click('#clearBtn');
  await page.waitForTimeout(700);
  await page.click('#sheetClose');
  await page.waitForTimeout(300);

  const packResponse = await context.request.get(`${TARGET}packs/index.json`);
  const catalog = await packResponse.json();
  const packUrl = new URL(catalog.packs[0].file, TARGET).href;
  const original = await (await context.request.get(packUrl)).body();
  const corrupted = Buffer.concat([original, Buffer.from('tampered')]);
  await page.route('**/*.arcp', (route) => route.fulfill({ body: corrupted, contentType: 'application/octet-stream' }));
  await page.locator('.card', { hasText: 'Neon Stack' }).locator('.btn.primary').click();
  await page.waitForSelector('#loader:not([hidden])');
  await page.waitForTimeout(2500);
  await shot('12-tampered');
  const statusText = await page.textContent('#loaderStatus');
  console.log(`  loader said: ${statusText}`);
  const retryVisible = await page.locator('#retryBtn').isVisible();
  if (!/checksum|mismatch|incomplete|hash/i.test(statusText) && !retryVisible) {
    throw new Error('tampered pack was not rejected clearly');
  }
  await page.unroute('**/*.arcp');
  await page.click('#cancelBtn');

  step('errors');
  const fatal = problems.filter(
    (line) =>
      !/favicon|sw\.js|service worker/i.test(line) &&
      // Expected while the test forces the browser offline or aborts a download.
      !/net::ERR_(FAILED|INTERNET_DISCONNECTED|ABORTED)/i.test(line),
  );
  console.log(`  ${fatal.length} console/page errors`);
  for (const line of fatal) console.log(`   ! ${line}`);
  if (fatal.length) process.exitCode = 1;
} catch (error) {
  console.error(`\n✗ ${error.message}`);
  await shot('99-failure');
  process.exitCode = 1;
} finally {
  await browser.close();
}
