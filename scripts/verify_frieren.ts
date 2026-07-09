// Quick verification script for Frieren S1 + S2 seed changes
// Run with: npx tsx scripts/verify_frieren.ts
import { SEED_ANIME, resolveEpisodeUrl, episodeHasSub, episodeHasDub, resolveSubtitleUrl } from '../src/lib/seed';

console.log('=== Frieren S1 (52991) ===');
const s1 = SEED_ANIME.find((s) => s.malId === 52991)!;
console.log('  title:', s1.title);
console.log('  hasSub:', s1.hasSub, '| hasDub:', s1.hasDub);
console.log('  localSubtitlePattern:', s1.localSubtitlePattern);
console.log('  sources:', s1.episodeSources.length);

for (const ep of [1, 13, 26, 28]) {
  console.log(`\n  --- Episode ${ep} ---`);
  console.log('    hasSub:', episodeHasSub(s1, ep), '| hasDub:', episodeHasDub(s1, ep));
  console.log('    subtitleUrl:', resolveSubtitleUrl(s1, ep));
  const sub = resolveEpisodeUrl(s1, ep, 'sub');
  console.log('    SUB url:', sub?.url ?? '(null)');
  console.log('    SUB source:', sub?.source);
  const dub = resolveEpisodeUrl(s1, ep, 'dub');
  console.log('    DUB url:', dub?.url ?? '(null)');
  console.log('    DUB source:', dub?.source);
}

console.log('\n=== Frieren S2 (59978) ===');
const s2 = SEED_ANIME.find((s) => s.malId === 59978)!;
console.log('  title:', s2.title);
console.log('  hasSub:', s2.hasSub, '| hasDub:', s2.hasDub);
console.log('  localSubtitlePattern:', s2.localSubtitlePattern);
console.log('  sources:', s2.episodeSources.length);

for (const ep of [1, 5, 10]) {
  console.log(`\n  --- Episode ${ep} ---`);
  console.log('    hasSub:', episodeHasSub(s2, ep), '| hasDub:', episodeHasDub(s2, ep));
  console.log('    subtitleUrl:', resolveSubtitleUrl(s2, ep));
  const sub = resolveEpisodeUrl(s2, ep, 'sub');
  console.log('    SUB url:', sub?.url ?? '(null)');
  console.log('    SUB source:', sub?.source);
  const dub = resolveEpisodeUrl(s2, ep, 'dub');
  console.log('    DUB url:', dub?.url ?? '(null)');
}
