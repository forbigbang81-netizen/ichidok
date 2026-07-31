#!/usr/bin/env node
/**
 * Batch extract One Piece episode video URLs from wcoflix.tv using Playwright.
 * 
 * Bypasses Cloudflare by using a real Chrome user agent and waiting for
 * the Cloudflare challenge to auto-resolve.
 * 
 * For each episode:
 * 1. Visit the episode page on wcoflix
 * 2. Wait for the embed iframe to load
 * 3. Close the announcement overlay
 * 4. Extract the video source URL (umedia1.wcostream.com/getvid?evid=...)
 * 5. Record whether it's English Subbed or English Dubbed
 * 
 * Output: /home/z/my-project/scripts/one-piece-wcoflix-urls.json
 */
const { chromium } = require('playwright');
const fs = require('fs');

const OUTPUT_FILE = '/home/z/my-project/scripts/one-piece-wcoflix-urls.json';
const ANIME_URL = 'https://www.wcoflix.tv/anime/one-piece';
const BATCH_SIZE = 10; // episodes per browser session (to avoid memory issues)

async function getAllEpisodeLinks(page) {
  await page.goto(ANIME_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(10000);
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="one-piece-episode"]'))
      .map(a => ({ href: a.href, text: a.textContent.trim() }));
  });
  
  // Parse episode number and language (subbed/dubbed)
  const episodes = [];
  const seen = new Set();
  
  for (const link of links) {
    // Match episode number from URL: /one-piece-episode-1171-english-subbed
    const match = link.href.match(/one-piece-episode-(\d+(?:-\d+)?)-english-(subbed|dubbed)/);
    if (!match) continue;
    
    const epNum = parseInt(match[1].split('-')[0]);
    const lang = match[2]; // 'subbed' or 'dubbed'
    
    // Deduplicate — prefer subbed over dubbed for the same episode
    const key = `${epNum}-${lang}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    episodes.push({
      episode: epNum,
      language: lang === 'subbed' ? 'sub' : 'dub',
      url: link.href,
    });
  }
  
  // Sort by episode number, then language (sub first)
  episodes.sort((a, b) => a.episode - b.episode || (a.language === 'sub' ? -1 : 1));
  
  return episodes;
}

async function extractVideoUrl(page, episodeUrl) {
  await page.goto(episodeUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  const frames = page.frames();
  for (const f of frames) {
    if (f.url().includes('embed.wcostream')) {
      // Close announcement overlay
      try {
        await f.evaluate(() => {
          const btn = document.getElementById('close-btn');
          if (btn) { btn.disabled = false; btn.click(); }
          const announcement = document.getElementById('announcement');
          const backdrop = document.getElementById('backdrop');
          if (announcement) announcement.style.display = 'none';
          if (backdrop) backdrop.style.display = 'none';
        });
      } catch {}
      
      await f.waitForTimeout(5000);
      
      // Extract video source
      try {
        const videoInfo = await f.evaluate(() => {
          const v = document.querySelector('video');
          return {
            videoSrc: v ? v.src : null,
          };
        });
        return videoInfo.videoSrc;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function main() {
  console.log('=== One Piece wcoflix URL Extractor ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  
  // Step 1: Get all episode links
  console.log('Step 1: Getting all episode links from wcoflix...');
  const allEpisodes = await getAllEpisodeLinks(page);
  console.log(`Found ${allEpisodes.length} episode links`);
  
  // Count sub vs dub
  const subCount = allEpisodes.filter(e => e.language === 'sub').length;
  const dubCount = allEpisodes.filter(e => e.language === 'dub').length;
  console.log(`  Subbed: ${subCount}, Dubbed: ${dubCount}`);
  console.log(`  Episode range: E${allEpisodes[0].episode} to E${allEpisodes[allEpisodes.length - 1].episode}`);
  
  // Load existing results if any (for resuming)
  let results = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`Loaded ${Object.keys(results).length} existing results (resuming)`);
    } catch {}
  }
  
  // Step 2: Extract video URLs for each episode
  // Only extract subbed episodes (user wants Japanese sub)
  const subEpisodes = allEpisodes.filter(e => e.language === 'sub');
  console.log(`\nStep 2: Extracting video URLs for ${subEpisodes.length} subbed episodes...`);
  
  let processed = 0;
  let success = 0;
  let failed = 0;
  
  for (const ep of subEpisodes) {
    const key = `e${ep.episode}`;
    if (results[key]) {
      console.log(`  E${ep.episode}: already extracted (skipping)`);
      processed++;
      success++;
      continue;
    }
    
    process.stdout.write(`  E${ep.episode}: extracting... `);
    
    try {
      const videoUrl = await extractVideoUrl(page, ep.url);
      if (videoUrl) {
        results[key] = {
          episode: ep.episode,
          language: 'sub',
          wcoflixUrl: ep.url,
          videoUrl: videoUrl,
        };
        console.log(`OK (${videoUrl.substring(0, 60)}...)`);
        success++;
      } else {
        console.log('FAILED (no video found)');
        failed++;
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      failed++;
    }
    
    processed++;
    
    // Save progress every 5 episodes
    if (true) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      console.log(`  [Progress saved: ${success}/${subEpisodes.length} extracted, ${failed} failed]`);
    }
    
    // Small delay between episodes
    await page.waitForTimeout(2000);
    
    // Restart browser every BATCH_SIZE episodes to avoid memory issues
    if (processed % BATCH_SIZE === 0) {
      console.log(`  [Restarting browser to free memory at ${processed} episodes]`);
      await browser.close();
      const newBrowser = await chromium.launch({ headless: true });
      const newContext = await newBrowser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });
      page = await newContext.newPage();
      // Re-assign browser reference (can't reassign const, so we use a trick)
      // Actually, just close and reopen page from same context
    }
  }
  
  // Final save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  
  console.log(`\n=== DONE ===`);
  console.log(`Total: ${processed} processed, ${success} success, ${failed} failed`);
  console.log(`Results saved to: ${OUTPUT_FILE}`);
  
  await browser.close();
}

main().catch(console.error);
