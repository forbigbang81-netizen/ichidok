import { NextResponse } from "next/server";
import { SEED_ANIME } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const s1 = SEED_ANIME.find((s) => s.malId === 52412);
  const s2 = SEED_ANIME.find((s) => s.malId === 58514);
  return NextResponse.json({
    s1: s1 ? { hasSub: s1.hasSub, hasDub: s1.hasDub, sources: s1.episodeSources?.map((s) => ({ audio: s.audio, collection: s.collection })) } : null,
    s2: s2 ? { hasSub: s2.hasSub, hasDub: s2.hasDub, sources: s2.episodeSources?.map((s) => ({ audio: s.audio, collection: s.collection })) } : null,
  });
}
