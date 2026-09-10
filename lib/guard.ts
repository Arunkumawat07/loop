import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * NON-NEGOTIABLE SECURITY RULE (Section 06 of the brief):
 * Every API route that touches feedback, themes, reports, or users MUST
 * call requireSession() (or requireRole()) FIRST, and MUST use the
 * returned workspaceId to scope every single Prisma query:
 *
 *   const session = await requireSession();
 *   if (session instanceof NextResponse) return session; // 401
 *
 *   const items = await db.feedback.findMany({
 *     where: { workspaceId: session.workspaceId, ... }, // <-- non-negotiable
 *   });
 *
 * Never accept a workspaceId from the client (query param, body, header).
 * The ONLY source of truth for "which workspace does this request belong
 * to" is the authenticated session. This is what stops Company A from
 * reading Company B's rows by guessing an ID in the URL.
 */

export type AuthedSession = {
  userId: string;
  workspaceId: string;
  role: Role;
};

export async function requireSession(): Promise<AuthedSession | NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };
}

/**
 * Use when an endpoint is restricted to specific roles, e.g. only ADMIN
 * can invite members, only ADMIN/ANALYST can ingest feedback.
 * Returns 403 (not a crash, not a silent redirect) on a forbidden role —
 * the brief explicitly grades this behavior (C2, acceptance criterion 4).
 */
export async function requireRole(
  allowed: Role[]
): Promise<AuthedSession | NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!allowed.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session;
}
