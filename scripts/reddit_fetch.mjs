#!/usr/bin/env node
/**
 * Fetch Reddit threads as JSON for offline analysis.
 * Usage: node scripts/reddit_fetch.mjs [urls-file]
 * - urls-file: newline-separated list of Reddit post URLs (may already include .json)
 *   Example: https://www.reddit.com/r/AutoDetailing/comments/abc123/post-title.json
 *   Tip: we append ".json?raw_json=1" automatically if missing.
 * Output: saves each thread JSON under docs/reddit_results/<sanitized>.json
 */

import fs from 'node:fs';
import path from 'node:path';

const urlsFile = process.argv[2] || 'docs/reddit_urls.txt';
const outDir = 'docs/reddit_results';

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function sanitizeFilename(s) {
  return s
    .replace(/^https?:\/\//, '')
    .replace(/\?.*$/, '')
    .replace(/[^a-z0-9]/gi, '_')
    .slice(0, 180);
}

function withJson(url) {
  let u = url.trim();
  if (!u) return null;
  // enforce https
  if (!/^https?:\/\//i.test(u)) {
    u = 'https://' + u;
  }
  // ensure .json at the end (Reddit post endpoint)
  if (!/\.json(\?|$)/i.test(u)) {
    if (u.endsWith('/')) u = u.slice(0, -1);
    u = u + '.json';
  }
  // ensure raw_json=1 for better unicode/emoji handling
  u += (u.includes('?') ? '&' : '?') + 'raw_json=1';
  return u;
}

async function main() {
  if (!fs.existsSync(urlsFile)) {
    console.error(`URLs file not found: ${urlsFile}`);
    process.exit(1);
  }

  ensureDir(outDir);
  const urls = fs.readFileSync(urlsFile, 'utf8').split(/\r?\n/).filter(Boolean);

  const results = [];
  for (const originalUrl of urls) {
    const url = withJson(originalUrl);
    if (!url) continue;
    const fileBase = sanitizeFilename(url);
    const outPath = path.join(outDir, `${fileBase}.json`);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (WRP-Validator)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.text();
      fs.writeFileSync(outPath, data, 'utf8');
      results.push({ url, outPath, ok: true });
      // simple rate limit
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      results.push({ url, outPath, ok: false, error: String(err) });
    }
  }

  // summary to stdout
  for (const r of results) {
    console.log(`${r.ok ? 'OK ' : 'ERR'} ${r.url} -> ${r.outPath}${r.ok ? '' : ' :: ' + r.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

