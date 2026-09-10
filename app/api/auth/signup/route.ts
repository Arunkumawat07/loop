import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation/schemas";

// C1, acceptance criterion 1: "Sign-up creates a User and a Workspace;
// the creator becomes ADMIN." Done as a single transaction so we never
// end up with an orphaned Workspace or User if one half fails.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, workspaceName, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: workspaceName },
    });

    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "ADMIN",
        workspaceId: workspace.id,
      },
    });

    return { workspace, user };
  });

  return NextResponse.json(
    {
      id: result.user.id,
      email: result.user.email,
      workspaceId: result.workspace.id,
    },
    { status: 201 }
  );
}
