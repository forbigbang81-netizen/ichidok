const { chromium } = require('playwright');
const fs = require('fs');

const OUTPUT_FILE = '/home/z/my-project/scripts/one-piece-wcoflix-urls.json';
const ANIME_URL = 'https://www.wcoflix.tv/anime/one-piece';

async function getAllEpisodeLinks(page) {
  await page.goto(ANIME_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(15000);
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="one-piece-episode"]'))
      .map(a => ({ href: a.href, text: a.textContent.trim() }));
  });
  
  const episodes = [];
  const seen = new Set();
  
  for (const link of links) {
    const match = link.href.match(/one-piece-episode-(\d+(?:-\d+)?)-english-(subbed|dubbed)/);
    if (!match) continue;
    
    const epNum = parseInt(match[1].split('-')[0]);
    const lang = match[2];
    
    const key = `${epNum}-${lang}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    episodes.push({
      episode: epNum,
      language: lang === 'subbed' ? 'sub' : 'dub',
      url: link.href,
    });
  }
  
  episodes.sort((a, b) => a.episode - b.episode || (a.language === 'sub' ? -1 : 1));
  return episodes;
}

async function extractVideoUrl(browser, episodeUrl) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  
  try {
    await page.goto(episodeUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    const frames = page.frames();
    for (const f of frames) {
      if (f.url().includes('embed.wcostream')) {
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
        
        try {
          const videoInfo = await f.evaluate(() => {
            const v = document.querySelector('video');
            return { videoSrc: v ? v.src : null };
          });
          return videoInfo.videoSrc;
        } catch {}
      }
    }
  } finally {
    await context.close();
  }
  return null;
}

async function main() {
  console.log('=== One Piece wcoflix URL Extractor v2 ===\n');
  
  // Load existing results
  let results = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`Loaded ${Object.keys(results).length} existing results`);
    } catch {}
  }
  
  // Get episode list using a fresh browser
  const browser = await chromium.launch({ headless: true });
  const listContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const listPage = await listContext.newPage();
  
  console.log('Getting episode links...');
  const allEpisodes = await getAllEpisodeLinks(listPage);
  await listContext.close();
  
  const subEpisodes = allEpisodes.filter(e => e.language === 'sub');
  console.log(`Found ${subEpisodes.length} subbed episodes\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const ep of subEpisodes) {
    const key = `e${ep.episode}`;
    if (results[key]) {
      success++;
      continue;
    }
    
    process.stdout.write(`E${ep.episode}: `);
    
    try {
      // Use a fresh context for each episode (avoids Cloudflare cookie issues)
      const videoUrl = await extractVideoUrl(browser, ep.url);
      if (videoUrl) {
        results[key] = {
          episode: ep.episode,
          language: 'sub',
          wcoflixUrl: ep.url,
          videoUrl: videoUrl,
        };
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
        console.log('OK');
        success++;
      } else {
        console.log('FAILED (no video)');
        failed++;
      }
    } catch (e) {
      console.log(`ERROR: ${e.message.substring(0, 50)}`);
      failed++;
    }
    
    // Wait between episodes to avoid rate limiting
    await new Promise(r => setTimeout(r, 5000));
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n=== DONE: ${success} success, ${failed} failed ===`);
  
  await browser.close();
}

main().catch(console.error);
