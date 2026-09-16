import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guard";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const themes = await db.theme.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { name: "asc" },
    include: { _count: { select: { feedback: true } } },
  });

  return NextResponse.json(themes);
}
