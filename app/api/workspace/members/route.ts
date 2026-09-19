import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { memberCreateSchema } from "@/lib/validation/schemas";

// GET /api/workspace/members — any role can see who's in the workspace.
export async function GET() {
  const session = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
  if (session instanceof NextResponse) return session;

  const members = await db.user.findMany({
    where: { workspaceId: session.workspaceId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

// POST /api/workspace/members — Admin adds a teammate directly.
// (Real email-invite delivery is explicitly out of scope per the brief's
// Section 4.2 — Admin sets an initial password and shares it with the
// teammate themselves, who can change it after logging in.)
export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const parsed = memberCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const member = await db.user.create({
    data: { name, email, passwordHash, role, workspaceId: session.workspaceId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(member, { status: 201 });
}
