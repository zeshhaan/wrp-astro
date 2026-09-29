/**
 * Render the body-shape card images for the quote flow's car step from the real
 * 3D models: `node scripts/cars/render-thumbs.mjs [baseUrl]`.
 * Writes public/models/cars/thumbs/<body>.webp (transparent, 2x).
 *
 * Needs a running dev server (default http://127.0.0.1:4321) and Playwright
 * (`playwright` resolvable, or PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs).
 * Re-run after `bun run import:cars` changes the models.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] ?? 'http://127.0.0.1:4321';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const sharp = createRequire(import.meta.url)('sharp');
const out = fileURLToPath(new URL('../../public/models/cars/thumbs/', import.meta.url));
mkdirSync(out, { recursive: true });

const W = 480;
const H = 220;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
// Warm-up load: the first dev-server visit can paint before its CSS arrives.
await page.goto(`${base}/design-lab/studio/car-viewer/`);
await page.waitForFunction(() => document.getElementById('status')?.dataset.ready, null, { timeout: 90000 });
for (const body of ['sedan', 'coupe', 'suv', 'pickup']) {
  await page.goto(`${base}/design-lab/studio/car-viewer/?body=${body}&mode=look&paint=b9bcc1`);
  // Only the canvas, full-bleed, on a transparent page.
  await page.addStyleTag({
    content: `html, body, main, .cv__stage { background: transparent !important; }
      body > *:not(main), [data-lab-bar], astro-dev-toolbar, .cv__head, .cv__controls, .cv__status, .cv__credit { display: none !important; }
      main, .cv, .cv__stage { padding: 0 !important; margin: 0 !important; max-width: none !important; border: 0 !important; }
      .cv__viewer { position: fixed !important; inset: 0 !important; width: ${W}px !important; height: ${H}px !important; border-radius: 0 !important; background: transparent !important; }`,
  });
  await page.waitForFunction(() => document.getElementById('status')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(6000); // let the intro turntable settle on the preset angle
  const png = await page.locator('#viewer').screenshot({ omitBackground: true });
  const file = `${out}${body}.webp`;
  const info = await sharp(png).trim({ threshold: 1 }).resize({ width: W * 2, height: H * 2, fit: 'inside' }).webp({ quality: 80, alphaQuality: 90 }).toFile(file);
  console.log(`${body}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
await browser.close();
