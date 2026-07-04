import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "1";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

    const where = unreadOnly ? { read: false } : {};
    const items = await db.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });

    const unreadCount = await db.notification.count({
      where: { read: false },
    });

    return NextResponse.json({
      total: items.length,
      unread: unreadCount,
      notifications: items,
    });
  } catch (err) {
    console.error("[/api/notifications] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications", detail: String(err) },
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
    const { title, body: bodyText, type = "info" } = body as Record<
      string,
      unknown
    >;

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }

    const record = await db.notification.create({
      data: {
        title: String(title),
        body: String(bodyText ?? ""),
        type: String(type ?? "info"),
      },
    });

    return NextResponse.json({ ok: true, notification: record });
  } catch (err) {
    console.error("[/api/notifications] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create notification", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const markAll = searchParams.get("all") === "1";

    if (markAll) {
      await db.notification.updateMany({
        where: { read: false },
        data: { read: true },
      });
      return NextResponse.json({ ok: true, marked: "all" });
    }

    if (id) {
      await db.notification
        .update({ where: { id }, data: { read: true } })
        .catch(() => null);
      return NextResponse.json({ ok: true, marked: id });
    }

    return NextResponse.json(
      { error: "Provide id or all=1" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[/api/notifications] PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to mark notification", detail: String(err) },
      { status: 500 },
    );
  }
}
