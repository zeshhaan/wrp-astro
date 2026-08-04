/**
 * IndexNow submitter.
 *
 * IndexNow pushes changed URLs to Bing, Yandex, Seznam and Naver straight away
 * rather than waiting to be crawled. Google does NOT participate: Google
 * indexing still has to be requested through Search Console, so this script
 * covers everything except the engine you most care about. Treat it as half
 * the job.
 *
 * The key lives in exactly one place, `public/<key>.txt`, because IndexNow
 * verifies ownership by fetching that file over HTTP and comparing its body to
 * the key in the payload. Discovering it from disk rather than repeating it in
 * a constant is what stops the two from silently drifting apart.
 *
 * Usage:
 *   node scripts/indexnow.mjs                       # every URL in the live sitemap
 *   node scripts/indexnow.mjs /blog/some-post/ ...   # only these paths
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://wrpdetailing.ae';
const HOST = new URL(SITE_URL).host;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Locate the single `public/<key>.txt` ownership file and read the key from it. */
async function loadKey() {
  const files = await readdir(join(ROOT, 'public'));
  const keyFiles = files.filter((f) => /^[a-f0-9]{8,128}\.txt$/i.test(f));

  if (keyFiles.length === 0) {
    throw new Error(
      'No IndexNow key file in public/. Create one with:\n' +
        '  KEY=$(openssl rand -hex 16); printf "%s" "$KEY" > "public/$KEY.txt"',
    );
  }
  if (keyFiles.length > 1) {
    throw new Error(`Multiple IndexNow key files in public/: ${keyFiles.join(', ')}`);
  }

  const fileName = keyFiles[0];
  const key = (await readFile(join(ROOT, 'public', fileName), 'utf8')).trim();

  // The file name and its contents must match, otherwise verification fails
  // with a 403 that gives no hint as to why.
  if (key !== fileName.replace(/\.txt$/, '')) {
    throw new Error(`public/${fileName} does not contain its own key. Body was: ${key}`);
  }
  return { key, keyLocation: `${SITE_URL}/${fileName}` };
}

/** Pull every <loc> out of the published sitemap index and its child sitemaps. */
async function urlsFromSitemap() {
  const locs = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  };

  const children = await locs(`${SITE_URL}/sitemap-index.xml`);
  const nested = await Promise.all(children.map(locs));
  return [...new Set(nested.flat())];
}

const args = process.argv.slice(2);
const { key, keyLocation } = await loadKey();

const urlList = args.length
  ? args.map((a) => new URL(a, SITE_URL).toString())
  : await urlsFromSitemap();

if (urlList.length === 0) {
  console.error('Nothing to submit.');
  process.exit(1);
}

// IndexNow rejects the whole batch if any URL is off-host, so fail loudly here
// rather than reading a 422 later and guessing which one was wrong.
const offHost = urlList.filter((u) => new URL(u).host !== HOST);
if (offHost.length) {
  console.error(`Refusing to submit URLs outside ${HOST}:\n  ${offHost.join('\n  ')}`);
  process.exit(1);
}

console.log(`Submitting ${urlList.length} URL(s) to IndexNow as ${keyLocation}`);
for (const u of urlList) console.log(`  ${u}`);

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation, urlList }),
});

const body = await res.text();

// 200 accepted, 202 accepted but the key is still being verified. Everything
// else is a real failure worth a non-zero exit so CI or a caller notices.
if (res.status === 200 || res.status === 202) {
  const note = res.status === 202 ? ' (key pending verification)' : '';
  console.log(`\nIndexNow ${res.status}${note}: ${urlList.length} URL(s) accepted.`);
} else {
  console.error(`\nIndexNow ${res.status}: ${body || '(empty body)'}`);
  process.exit(1);
}
