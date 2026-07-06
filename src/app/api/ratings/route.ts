import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const malId = Number(searchParams.get("malId"));
  if (!malId) return NextResponse.json({ error: "malId required" }, { status: 400 });
  
  const ratings = await dbRating.getRating(malId);
  return NextResponse.json({ malId, ...ratings });
}

export async function POST(request: Request) {
  const { malId, rating } = await request.json();
  if (!malId || !rating) return NextResponse.json({ error: "malId and rating required" }, { status: 400 });
  
  const result = await dbRating.submitRating(Number(malId), Number(rating));
  return NextResponse.json(result);
}

// Simple in-memory rating store (persists via Turso DB)
const dbRating = {
  async getRating(malId: number) {
    try {
      const { getDb } = await import("@/lib/db");
      const client = getDb();
      const result = await client.execute({
        sql: 'SELECT AVG(rating) as avg, COUNT(*) as count FROM "Rating" WHERE "malId" = ?',
        args: [malId],
      });
      const row = result.rows[0] as any;
      const avg = row?.avg ? Number(row.avg) : 0;
      const count = row?.count ? Number(row.count) : 0;
      // Convert 5-star to 10-point scale, round to 2 decimals
      const score10 = avg > 0 ? Math.round((avg / 5) * 10 * 100) / 100 : 0;
      return { avg: score10, count, rawAvg: avg };
    } catch {
      return { avg: 0, count: 0, rawAvg: 0 };
    }
  },
  async submitRating(malId: number, rating: number) {
    try {
      const { getDb, generateId } = await import("@/lib/db");
      const client = getDb();
      // Upsert: delete existing, insert new
      await client.execute({ sql: 'DELETE FROM "Rating" WHERE "malId" = ?', args: [malId] });
      await client.execute({
        sql: 'INSERT INTO "Rating" ("id", "malId", "rating", "createdAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        args: [generateId(), malId, rating],
      });
      return await this.getRating(malId);
    } catch (e) {
      return { error: String(e) };
    }
  },
};
