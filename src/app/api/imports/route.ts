import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const malId = searchParams.get("malId");
    const episode = searchParams.get("episode");

    const where: Record<string, unknown> = {};
    if (malId) where.malId = Number(malId);
    if (episode) where.episode = Number(episode);

    const imports = await db.import.findMany({
      where,
      include: { anime: true },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json({
      total: imports.length,
      imports,
    });
  } catch (err) {
    console.error("[/api/imports] GET error:", err);
    return NextResponse.json(
      { error: "Failed to list imports", detail: String(err) },
      { status: 500 },
    );
  }
}
