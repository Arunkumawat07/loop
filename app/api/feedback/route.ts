import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { feedbackCreateSchema, feedbackQuerySchema } from "@/lib/validation/schemas";
import { Prisma } from "@prisma/client";
import { classifyAndStoreFeedback } from "@/lib/classification";

// GET /api/feedback — the Inbox (C4). Server-side pagination, search,
// and filters by channel/sentiment/status/theme/date range. Every query
// is scoped to session.workspaceId — never trust a workspaceId from the
// client, even if one is passed in.
export async function GET(req: NextRequest) {
  const session = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const parsed = feedbackQuerySchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { page, pageSize, channel, sentiment, status, themeId, search, dateFrom, dateTo } =
    parsed.data;

  const where: Prisma.FeedbackWhereInput = {
    workspaceId: session.workspaceId, // <- tenant isolation, non-negotiable
    ...(channel && { channel }),
    ...(sentiment && { sentiment }),
    ...(status && { status }),
    ...(themeId && { themes: { some: { themeId } } }),
    ...(search && { content: { contains: search, mode: "insensitive" } }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: dateFrom }),
            ...(dateTo && { lte: dateTo }),
          },
        }
      : {}),
  };

  const [total, items] = await db.$transaction([
    db.feedback.count({ where }),
    db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { themes: { include: { theme: true } } },
    }),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST /api/feedback — single-entry ingestion (C3). ADMIN/ANALYST only;
// VIEWER is read-only per the role matrix in Section 08.
export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN", "ANALYST"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const parsed = feedbackCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const feedback = await db.feedback.create({
    data: {
      ...parsed.data,
      workspaceId: session.workspaceId,
      status: "NEW",
    },
  });

  // AI1 — classify on ingest, store the result, never recompute on page
  // load. Awaited inline (not queued) for simplicity at this project's
  // scale; a production system would push this onto a background job.
  // A classification failure must never fail the user's create request —
  // the item just stays unclassified and can be retried via the manual
  // re-classify endpoint.
  const classifyResult = await classifyAndStoreFeedback(feedback.id, session.workspaceId);
  if (!classifyResult.ok) {
    console.error(`Auto-classification failed for ${feedback.id}: ${classifyResult.error}`);
  }

  const withThemes = await db.feedback.findUnique({
    where: { id: feedback.id },
    include: { themes: { include: { theme: true } } },
  });

  return NextResponse.json(withThemes, { status: 201 });
}
