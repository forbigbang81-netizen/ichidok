import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const malId = searchParams.get("malId");
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

    const where = malId ? { malId: Number(malId) } : {};
    const items = await db.history.findMany({
      where,
      orderBy: [{ watchedAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({ total: items.length, history: items });
  } catch (err) {
    console.error("[/api/history] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch history", detail: String(err) },
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

    const {
      malId,
      title,
      poster,
      type = "TV",
      episode,
      progress = 0,
      position = 0,
      duration = 0,
    } = body as Record<string, unknown>;

    if (!Number.isFinite(Number(malId)) || !Number.isFinite(Number(episode))) {
      return NextResponse.json(
        { error: "malId and episode are required" },
        { status: 400 },
      );
    }

    const record = await db.history.upsert({
      where: {
        malId: Number(malId), episode: Number(episode),
      },
      create: {
        malId: Number(malId),
        title: String(title ?? ""),
        poster: poster ? String(poster) : null,
        type: String(type ?? "TV"),
        episode: Number(episode),
        progress: Number(progress ?? 0),
        position: Number(position ?? 0),
        duration: Number(duration ?? 0),
      },
      update: {
        title: String(title ?? ""),
        poster: poster ? String(poster) : null,
        type: String(type ?? "TV"),
        progress: Number(progress ?? 0),
        position: Number(position ?? 0),
        duration: Number(duration ?? 0),
        watchedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, history: record });
  } catch (err) {
    console.error("[/api/history] POST error:", err);
    return NextResponse.json(
      { error: "Failed to save history", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const malId = searchParams.get("malId");
    const episode = searchParams.get("episode");
    const id = searchParams.get("id");

    if (id) {
      await db.history.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ ok: true, deleted: { id } });
    }

    if (malId && episode) {
      await db.history
        .delete({
          where: {
            malId: Number(malId),
            episode: Number(episode),
          },
        })
        .catch(() => null);
      return NextResponse.json({
        ok: true,
        deleted: { malId: Number(malId), episode: Number(episode) },
      });
    }

    if (malId) {
      await db.history.deleteMany({ where: { malId: Number(malId) } });
      return NextResponse.json({
        ok: true,
        cleared: { malId: Number(malId) },
      });
    }

    // Clear all history
    await db.history.deleteMany({});
    return NextResponse.json({ ok: true, cleared: "all" });
  } catch (err) {
    console.error("[/api/history] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete history", detail: String(err) },
      { status: 500 },
    );
  }
}
