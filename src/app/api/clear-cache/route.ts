import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  const token = process.env.DATABASE_AUTH_TOKEN;
  if (!url || !url.startsWith("libsql://")) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }
  try {
    const libsql = createClient({ url, authToken: token || undefined });
    const result = await libsql.execute('DELETE FROM "Import"');
    return NextResponse.json({ ok: true, deleted: result.rowsAffected });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
