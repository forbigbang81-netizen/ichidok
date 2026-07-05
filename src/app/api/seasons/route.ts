import { NextResponse } from "next/server";
import { findSeasonGroup } from "@/lib/seed";
import { ensureSeeded } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/seasons?malId=12345
 *
 * Returns the ordered list of seasons for the franchise that contains
 * the given malId. Each season has { malId, label }.
 *
 * If the anime isn't part of a franchise (single-season anime), returns
 * an empty array.
 */
export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const malId = Number(searchParams.get("malId"));

    if (!Number.isFinite(malId) || malId <= 0) {
      return NextResponse.json(
        { error: "malId is required" },
        { status: 400 },
      );
    }

    const group = findSeasonGroup(malId);
    if (!group) {
      return NextResponse.json({ seasons: [], franchise: null });
    }

    return NextResponse.json({
      franchise: group.franchise,
      seasons: group.seasons,
    });
  } catch (err) {
    console.error("[/api/seasons] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch seasons", detail: String(err) },
      { status: 500 },
    );
  }
}
