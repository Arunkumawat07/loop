import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { roleUpdateSchema } from "@/lib/validation/schemas";

// PATCH /api/workspace/members/:id — change a teammate's role.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = roleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (id === session.userId && parsed.data.role !== "ADMIN") {
    return NextResponse.json(
      { error: "You can't demote yourself out of Admin" },
      { status: 400 }
    );
  }

  // updateMany + workspaceId filter — same tenant-isolation pattern as
  // the feedback status route: prevents an Admin from touching a user
  // that belongs to a different workspace, even by guessing an id.
  const result = await db.user.updateMany({
    where: { id, workspaceId: session.workspaceId },
    data: { role: parsed.data.role },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(updated);
}

// DELETE /api/workspace/members/:id — remove a teammate from the workspace.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  if (id === session.userId) {
    return NextResponse.json(
      { error: "You can't remove yourself" },
      { status: 400 }
    );
  }

  const result = await db.user.deleteMany({
    where: { id, workspaceId: session.workspaceId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
