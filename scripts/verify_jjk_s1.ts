// Quick verification script for JJK S1
import { SEED_ANIME, resolveEpisodeUrl, episodeHasSub, episodeHasDub, resolveSubtitleUrl } from '../src/lib/seed';

console.log('=== JJK S1 (40748) ===');
const s1 = SEED_ANIME.find((s) => s.malId === 40748)!;
console.log('  title:', s1.title);
console.log('  hasSub:', s1.hasSub, '| hasDub:', s1.hasDub);
console.log('  localSubtitlePattern:', s1.localSubtitlePattern);
console.log('  sources:', s1.episodeSources.length);

for (const ep of [1, 7, 13, 24]) {
  console.log(`\n  --- Episode ${ep} ---`);
  console.log('    hasSub:', episodeHasSub(s1, ep), '| hasDub:', episodeHasDub(s1, ep));
  console.log('    subtitleUrl:', resolveSubtitleUrl(s1, ep));
  const sub = resolveEpisodeUrl(s1, ep, 'sub');
  console.log('    SUB url:', sub?.url ?? '(null)');
  console.log('    SUB source:', sub?.source);
  const dub = resolveEpisodeUrl(s1, ep, 'dub');
  console.log('    DUB url:', dub?.url ?? '(null)');
}
