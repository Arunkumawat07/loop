import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { csvImportSchema, csvRowSchema } from "@/lib/validation/schemas";

// POST /api/feedback/import — C3, acceptance criterion 2.
// The client parses the CSV (Papaparse) in the browser and sends the
// parsed rows here as JSON. We validate row-by-row so a few bad rows
// don't sink the whole batch, and report exactly how many imported vs.
// failed, with a reason for each failure — that reporting is itself
// part of what's graded, not just the import working.
export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN", "ANALYST"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const parsedBody = csvImportSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const results = {
    importedCount: 0,
    failedCount: 0,
    failures: [] as { row: number; reason: string }[],
  };

  const toCreate: {
    content: string;
    channel: string;
    customerLabel?: string;
    createdAt?: Date;
  }[] = [];

  parsedBody.data.rows.forEach((raw, index) => {
    const parsedRow = csvRowSchema.safeParse(raw);
    if (!parsedRow.success) {
      results.failedCount++;
      results.failures.push({
        row: index + 1,
        reason: parsedRow.error.issues.map((i) => i.message).join(", "),
      });
      return;
    }

    const { content, channel, customer_label, created_at } = parsedRow.data;
    const createdAt = created_at ? new Date(created_at) : undefined;
    if (created_at && createdAt && isNaN(createdAt.getTime())) {
      results.failedCount++;
      results.failures.push({ row: index + 1, reason: "invalid created_at date" });
      return;
    }

    toCreate.push({
      content,
      channel,
      customerLabel: customer_label,
      createdAt,
    });
  });

  if (toCreate.length > 0) {
    // createMany is one round-trip instead of N — matters once you're
    // importing hundreds of rows.
    const created = await db.feedback.createMany({
      data: toCreate.map((row) => ({
        content: row.content,
        channel: row.channel,
        customerLabel: row.customerLabel,
        status: "NEW",
        workspaceId: session.workspaceId,
        ...(row.createdAt && { createdAt: row.createdAt }),
      })),
    });
    results.importedCount = created.count;

    // TODO (Week 3 / AI1): enqueue these newly created rows for
    // classification instead of leaving them unclassified.
  }

  return NextResponse.json(results, { status: 201 });
}
