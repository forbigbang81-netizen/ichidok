// Quick verification script for Apothecary Diaries S2
import { SEED_ANIME, resolveEpisodeUrl, episodeHasSub, episodeHasDub, resolveSubtitleUrl } from '../src/lib/seed';

console.log('=== Apothecary Diaries S2 (58514) ===');
const s2 = SEED_ANIME.find((s) => s.malId === 58514)!;
console.log('  title:', s2.title);
console.log('  hasSub:', s2.hasSub, '| hasDub:', s2.hasDub);
console.log('  localSubtitlePattern:', s2.localSubtitlePattern);
console.log('  sources:', s2.episodeSources.length);

for (const ep of [1, 11, 13, 24]) {
  console.log(`\n  --- Episode ${ep} ---`);
  console.log('    hasSub:', episodeHasSub(s2, ep), '| hasDub:', episodeHasDub(s2, ep));
  console.log('    subtitleUrl:', resolveSubtitleUrl(s2, ep));
  const sub = resolveEpisodeUrl(s2, ep, 'sub');
  console.log('    SUB url:', sub?.url ?? '(null)');
  console.log('    SUB source:', sub?.source);
  const dub = resolveEpisodeUrl(s2, ep, 'dub');
  console.log('    DUB url:', dub?.url ?? '(null)');
}
