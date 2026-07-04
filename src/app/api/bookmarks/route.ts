import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const bookmarks = await db.bookmark.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ total: bookmarks.length, bookmarks });
  } catch (err) {
    console.error("[/api/bookmarks] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    const { malId, title, poster, type = "TV" } = body as Record<
      string,
      unknown
    >;

    if (!Number.isFinite(Number(malId))) {
      return NextResponse.json(
        { error: "malId is required" },
        { status: 400 },
      );
    }

    const record = await db.bookmark.upsert({
      where: { malId: Number(malId) },
      create: {
        malId: Number(malId),
        title: String(title ?? ""),
        poster: poster ? String(poster) : null,
        type: String(type ?? "TV"),
      },
      update: {
        title: String(title ?? ""),
        poster: poster ? String(poster) : null,
        type: String(type ?? "TV"),
      },
    });

    return NextResponse.json({ ok: true, bookmark: record });
  } catch (err) {
    console.error("[/api/bookmarks] POST error:", err);
    return NextResponse.json(
      { error: "Failed to save bookmark", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const malId = searchParams.get("malId");
    const id = searchParams.get("id");

    if (id) {
      await db.bookmark.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ ok: true, deleted: { id } });
    }
    if (malId) {
      await db.bookmark
        .delete({ where: { malId: Number(malId) } })
        .catch(() => null);
      return NextResponse.json({
        ok: true,
        deleted: { malId: Number(malId) },
      });
    }

    await db.bookmark.deleteMany({});
    return NextResponse.json({ ok: true, cleared: "all" });
  } catch (err) {
    console.error("[/api/bookmarks] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete bookmark", detail: String(err) },
      { status: 500 },
    );
  }
}
