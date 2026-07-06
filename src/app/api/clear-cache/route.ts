import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { SEED_ANIME } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  const token = process.env.DATABASE_AUTH_TOKEN;
  if (!url || !url.startsWith("libsql://")) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }
  try {
    const libsql = createClient({ url, authToken: token || undefined });
    // 1) Clear the Import cache so episode URLs get re-resolved.
    const importResult = await libsql.execute('DELETE FROM "Import"');
    // 2) Delete stale Anime rows whose malId is no longer in the seed list.
    //    This happens when a malId is corrected (e.g. Haikyuu S2 20584 -> 28891)
    //    — the old row lingers because upsert only updates matching malIds.
    const seedIds = SEED_ANIME.map((s) => s.malId);
    let staleDeleted = 0;
    if (seedIds.length > 0) {
      // Query all malIds in DB, then delete the ones not in seedIds. We do
      // this client-side to avoid building a huge NOT IN clause.
      const allRows = await libsql.execute('SELECT "malId" FROM "Anime"');
      const toDelete: number[] = [];
      for (const row of allRows.rows) {
        const mid = Number((row as Record<string, unknown>).malId);
        if (!seedIds.includes(mid)) toDelete.push(mid);
      }
      for (const mid of toDelete) {
        try {
          await libsql.execute({ sql: 'DELETE FROM "Anime" WHERE "malId" = ?', args: [mid] });
          staleDeleted++;
        } catch (e) {
          // Foreign key constraint from Import/Episode etc. — ignore, the
          // Import table was already cleared above.
        }
      }
    }
    return NextResponse.json({
      ok: true,
      importsDeleted: importResult.rowsAffected,
      staleAnimeDeleted: staleDeleted,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
