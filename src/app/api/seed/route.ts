import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await ensureSeeded();
    const count = await db.anime.count();
    return NextResponse.json({
      ok: true,
      message: "Seed complete",
      count,
    });
  } catch (err) {
    console.error("[/api/seed] error:", err);
    return NextResponse.json(
      { error: "Seed failed", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const count = await db.anime.count();
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    console.error("[/api/seed] GET error:", err);
    return NextResponse.json(
      { error: "Failed to read seed status", detail: String(err) },
      { status: 500 },
    );
  }
}
