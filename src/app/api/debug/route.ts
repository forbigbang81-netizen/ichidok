import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  const token = process.env.DATABASE_AUTH_TOKEN;
  const debug: any = { NODE_ENV: process.env.NODE_ENV, steps: [] };
  try {
    debug.steps.push("Testing db.anime.count()...");
    const count = await db.anime.count();
    debug.steps.push("✅ Anime count: " + count);
    debug.steps.push("Testing db.anime.findMany()...");
    const anime = await db.anime.findMany({ take: 2 });
    debug.steps.push("✅ Found " + anime.length + " anime");
    if (anime.length > 0) debug.steps.push("First: " + JSON.stringify(anime[0]).substring(0, 80));
    return NextResponse.json({ ok: true, debug });
  } catch (err) {
    debug.steps.push("❌ " + (err as Error).message);
    return NextResponse.json({ ok: false, debug, error: (err as Error).message }, { status: 500 });
  }
}
