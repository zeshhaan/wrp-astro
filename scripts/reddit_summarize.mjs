#!/usr/bin/env node
/**
 * Summarize Reddit thread JSON files saved by reddit_fetch.mjs.
 * Usage: node scripts/reddit_summarize.mjs [results-dir]
 * Output: prints a concise summary and writes docs/reddit_summary.txt
 */

import fs from 'node:fs';
import path from 'node:path';

const inDir = process.argv[2] || 'docs/reddit_results';
const outPath = 'docs/reddit_summary.txt';

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
}

function extractThreadSummary(json) {
  try {
    const post = json?.[0]?.data?.children?.[0]?.data || {};
    const comments = json?.[1]?.data?.children || [];
    const topComments = comments
      .map((c) => c.data)
      .filter(Boolean)
      .sort((a, b) => (b.ups || 0) - (a.ups || 0))
      .slice(0, 5)
      .map((c) => ({ ups: c.ups || 0, body: (c.body || '').replace(/\s+/g, ' ').slice(0, 300) }));

    // lightweight signal extraction
    const blob = [post.selftext || '', ...topComments.map((c) => c.body)].join(' ').toLowerCase();

    const signals = [];
    if (/self[-\s]?healing/.test(blob)) signals.push('self-healing noted');
    if (/bubble|bubbles|silvering/.test(blob)) signals.push('install bubbles/silvering');
    if (/seam|edge|lift/.test(blob)) signals.push('seams/edges/lifting discussed');
    if (/water ?spots?|etch/.test(blob)) signals.push('water spotting/etching');
    if (/(\b\d+\s*(years?|yrs?)\b)/.test(blob)) signals.push('longevity referenced');
    if (/(\bAED\b|dirham|د\.إ|د\.ا|د\.م)/.test(blob)) signals.push('AED pricing');
    if (/dubai|uae|abu dhabi/.test(blob)) signals.push('UAE context');
    if (/xpel|suntek|3m|llumar/.test(blob)) signals.push('brand mentions');
    if (/ceramic\s+coating/.test(blob)) signals.push('ceramic coating discussed');

    return {
      title: post.title || '(untitled)',
      url: post.url || (post.permalink ? `https://www.reddit.com${post.permalink}` : '(n/a)'),
      ups: post.ups || 0,
      num_comments: post.num_comments || 0,
      topComments,
      signals,
    };
  } catch (e) {
    return { error: String(e) };
  }
}

function summarizeSignals(all) {
  const tally = new Map();
  for (const t of all) {
    for (const s of t.signals || []) {
      tally.set(s, (tally.get(s) || 0) + 1);
    }
  }
  return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
}

function renderReport(threads) {
  const lines = [];
  lines.push('Reddit Validation Summary');
  lines.push('');
  for (const t of threads) {
    if (t.error) {
      lines.push(`- ERROR: ${t.error}`);
      continue;
    }
    lines.push(`- ${t.title} [▲${t.ups} | 💬 ${t.num_comments}]`);
    lines.push(`  ${t.url}`);
    if (t.signals?.length) lines.push(`  Signals: ${t.signals.join(', ')}`);
    for (const c of t.topComments) {
      lines.push(`  • [▲${c.ups}] ${c.body}`);
    }
    lines.push('');
  }

  const totals = summarizeSignals(threads);
  if (totals.length) {
    lines.push('Signal Totals:');
    for (const [s, n] of totals) lines.push(`- ${s}: ${n}`);
  }
  lines.push('');

  // Expected alignment checks
  lines.push('Checks vs Site Claims:');
  lines.push('- Self-healing only for light marring (not deep cuts).');
  lines.push('- Water spots can still occur on ceramic; proper drying needed.');
  lines.push('- Longevity ranges: PPF ~7–10y, Pro Ceramic ~3–5y (varies).');
  lines.push('- Pricing in UAE should align with AED 4–8k (front) and 12–25k+ (full).');
  lines.push('- PPF + Ceramic (on top) commonly recommended for ease of maintenance.');

  return lines.join('\n');
}

function main() {
  const files = listJsonFiles(inDir);
  const threads = [];
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      threads.push(extractThreadSummary(j));
    } catch (e) {
      threads.push({ error: `Failed to parse ${f}: ${e}` });
    }
  }
  const report = renderReport(threads);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, 'utf8');
  console.log(report);
}

main();
