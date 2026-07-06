import { NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const malId = Number(searchParams.get("malId"));
  if (!malId) return NextResponse.json({ error: "malId required" }, { status: 400 });
  
  try {
    const client = getDb();
    const result = await client.execute({
      sql: 'SELECT * FROM "Comment" WHERE "malId" = ? ORDER BY "createdAt" DESC',
      args: [malId],
    });
    return NextResponse.json({ comments: result.rows });
  } catch (e) {
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(request: Request) {
  const { malId, name, text } = await request.json();
  if (!malId || !text) return NextResponse.json({ error: "malId and text required" }, { status: 400 });
  
  try {
    const client = getDb();
    await client.execute({
      sql: 'INSERT INTO "Comment" ("id", "malId", "name", "text", "createdAt") VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      args: [generateId(), Number(malId), name || "Anonymous", text],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
