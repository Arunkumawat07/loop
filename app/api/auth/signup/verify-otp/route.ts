import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { otpVerifySchema } from "@/lib/validation/schemas";
import { verifyOtpCode } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, code } = parsed.data;
  const result = await verifyOtpCode(email, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { pending } = result;

  // C1, criterion 1 — sign-up creates a User and a Workspace, creator
  // becomes ADMIN. Done in a transaction, and the pending row is
  // cleaned up in the same transaction so a retry can never double-create.
  const created = await db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: pending.workspaceName },
    });
    const user = await tx.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        passwordHash: pending.passwordHash,
        role: "ADMIN",
        workspaceId: workspace.id,
      },
    });
    await tx.pendingSignup.delete({ where: { email } });
    return { workspace, user };
  });

  return NextResponse.json(
    { id: created.user.id, email: created.user.email, workspaceId: created.workspace.id },
    { status: 201 }
  );
}
