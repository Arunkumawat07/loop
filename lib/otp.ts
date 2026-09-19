import { db } from "@/lib/db";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * NOTE on scope: real email delivery is explicitly out of scope for this
 * project (Section 4.2 of the brief excludes "Email/SMS delivery
 * infrastructure"). Rather than skip email verification entirely, the
 * OTP is generated and stored server-side exactly as a real flow would,
 * but is returned directly in the API response instead of being emailed
 * — the signup UI displays it in a clearly-labeled "dev preview" banner.
 * The verification logic itself (code + expiry + attempt limiting) is
 * real; only the delivery channel is swapped out. To go fully
 * production, wire sendOtpEmail() below to an email provider (e.g.
 * Resend) and stop returning the code in the response.
 */
export async function createPendingSignup(data: {
  name: string;
  workspaceName: string;
  email: string;
  passwordHash: string;
}) {
  const code = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const pending = await db.pendingSignup.upsert({
    where: { email: data.email },
    create: { ...data, otpCode: code, otpExpiresAt, attempts: 0 },
    update: { ...data, otpCode: code, otpExpiresAt, attempts: 0 },
  });

  return { pending, code, expiresInMinutes: OTP_TTL_MINUTES };
}

export type VerifyOtpResult =
  | { ok: true; pending: NonNullable<Awaited<ReturnType<typeof db.pendingSignup.findUnique>>> }
  | { ok: false; error: string };

export async function verifyOtpCode(email: string, code: string): Promise<VerifyOtpResult> {
  const pending = await db.pendingSignup.findUnique({ where: { email } });

  if (!pending) {
    return { ok: false, error: "No pending signup found for this email. Start over." };
  }
  if (pending.otpExpiresAt < new Date()) {
    return { ok: false, error: "This code has expired. Request a new one." };
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many incorrect attempts. Request a new code." };
  }
  if (pending.otpCode !== code) {
    await db.pendingSignup.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Incorrect code. Please try again." };
  }

  return { ok: true, pending };
}
