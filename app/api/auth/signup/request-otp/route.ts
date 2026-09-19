import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signupRequestSchema } from "@/lib/validation/schemas";
import { createPendingSignup } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = signupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, workspaceName, email, password } = parsed.data;

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { code, expiresInMinutes } = await createPendingSignup({
    name,
    workspaceName,
    email,
    passwordHash,
  });

  // devCode is returned only because real email delivery is out of this
  // project's scope (see lib/otp.ts). In a production build this would
  // be emailed instead, and this field would be removed from the response.
  return NextResponse.json({
    email,
    expiresInMinutes,
    devCode: code,
  });
}
