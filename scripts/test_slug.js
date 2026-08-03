#!/usr/bin/env node
/**
 * Test a GDrivePlayer slug by fetching the embed page and extracting
 * the actual video URL from the obfuscated JS.
 * 
 * Usage: node test_slug.js <slug>
 * Output: JSON with { slug, ok, videoUrl, error }
 */

const https = require('https');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function decodePayload(html) {
  const m = html.match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/);
  if (!m) return null;
  
  const payload = m[1];
  const a = parseInt(m[2]);
  const arr = m[4].split('|');
  
  function fromBase(s, base) {
    const digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (base <= 36) return parseInt(s, base);
    let r = 0;
    for (const c of s) r = r * base + digits.indexOf(c);
    return r;
  }
  
  return payload.replace(/\b\w+\b/g, (t) => {
    const i = fromBase(t, a);
    return i < arr.length && arr[i] ? arr[i] : t;
  });
}

function extractVideoUrl(decoded) {
  // Look for: file:'//redirector.gdriveplayer.me/...id=...'
  const m = decoded.match(/file:\\?'([^']+redirector[^']+)'/);
  if (!m) return null;
  let url = m[1].replace(/\\'/g, "'");
  if (url.startsWith('//')) url = 'https:' + url;
  return url;
}

async function testSlug(slug) {
  const url = `https://database.gdriveplayer.me/embed.php?type=anime&slug=${encodeURIComponent(slug)}&episode=1`;
  try {
    const html = await fetch(url);
    const decoded = decodePayload(html);
    if (!decoded) {
      return { slug, ok: false, error: 'Could not decode payload' };
    }
    const videoUrl = extractVideoUrl(decoded);
    if (!videoUrl) {
      return { slug, ok: false, error: 'No video URL in decoded JS', decodedSnippet: decoded.substring(0, 200) };
    }
    // Check if the video URL has a real ID (not empty)
    const idMatch = videoUrl.match(/id=([^&]+)/);
    if (!idMatch || idMatch[1].length < 10) {
      return { slug, ok: false, error: 'Video URL has no/short ID', videoUrl };
    }
    return { slug, ok: true, videoUrl: videoUrl.substring(0, 120) };
  } catch (e) {
    return { slug, ok: false, error: String(e) };
  }
}

async function main() {
  const slugs = process.argv.slice(2);
  if (slugs.length === 0) {
    console.error('Usage: node test_slug.js <slug1> [slug2] ...');
    process.exit(1);
  }
  
  const results = [];
  for (const slug of slugs) {
    const r = await testSlug(slug);
    results.push(r);
    console.log(JSON.stringify(r));
    // Be polite — small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  
  // Summary
  const ok = results.filter((r) => r.ok).length;
  console.error(`\n${ok}/${results.length} slugs OK`);
}

main();
