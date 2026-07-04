import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureSeeded();
    const { id } = await params;

    const existing = await db.import.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Import not found", id },
        { status: 404 },
      );
    }

    await db.import.delete({ where: { id } });

    return NextResponse.json({ ok: true, deleted: id });
  } catch (err) {
    console.error("[/api/imports/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete import", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureSeeded();
    const { id } = await params;
    const imp = await db.import.findUnique({
      where: { id },
      include: { anime: true },
    });
    if (!imp) {
      return NextResponse.json(
        { error: "Import not found", id },
        { status: 404 },
      );
    }
    return NextResponse.json({ import: imp });
  } catch (err) {
    console.error("[/api/imports/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch import", detail: String(err) },
      { status: 500 },
    );
  }
}
