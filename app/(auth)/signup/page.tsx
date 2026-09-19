"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { PasswordStrength, passwordMeetsRequirements } from "@/components/password-strength";

type Step = "details" | "otp";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({ name: "", workspaceName: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!passwordMeetsRequirements(form.password)) {
      setError("Your password doesn't meet all the requirements below.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/signup/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    // See lib/otp.ts — real email delivery is out of this project's
    // scope, so the code is shown here directly instead of being emailed.
    setDevCode(data.devCode);
    setStep("otp");
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, code: otp }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Verification failed.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen bg-paper">
      <AuthPanel tagline="Every piece of feedback, understood." />

      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <span className="font-display text-lg font-semibold text-ink">LOOP</span>
            <ThemeToggle />
          </div>

          {step === "details" ? (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">
                Create your workspace
              </h1>
              <p className="mt-1 text-sm text-ink-soft">You'll be the workspace admin</p>

              <form onSubmit={requestOtp} className="mt-8 space-y-4">
                {error && (
                  <div className="rounded-md bg-negative-soft px-3 py-2 text-sm text-negative">
                    {error}
                  </div>
                )}

                <Field label="Your name" value={form.name} onChange={update("name")} placeholder="Ana Analyst" />
                <Field label="Workspace name" value={form.workspaceName} onChange={update("workspaceName")} placeholder="Acme Corp" />
                <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@company.com" />

                <div>
                  <label className="block text-sm font-medium text-ink">Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={update("password")}
                    className="mt-1.5 w-full rounded-md border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink outline-none transition focus:border-signal focus:ring-1 focus:ring-signal"
                    placeholder="Create a strong password"
                  />
                  <PasswordStrength password={form.password} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-signal px-3 py-2.5 text-sm font-medium text-signal-ink transition hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Sending code..." : "Continue"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">Verify your email</h1>
              <p className="mt-1 text-sm text-ink-soft">
                Enter the 6-digit code we sent to <span className="text-ink">{form.email}</span>
              </p>

              {devCode && (
                <div className="mt-4 rounded-md border border-signal/30 bg-signal-soft px-3 py-2 text-sm text-ink">
                  <span className="font-medium">Dev preview:</span> this project doesn't send
                  real emails (out of scope), so your code is shown here —{" "}
                  <span className="font-display font-semibold tracking-wider">{devCode}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="mt-6 space-y-4">
                {error && (
                  <div className="rounded-md bg-negative-soft px-3 py-2 text-sm text-negative">
                    {error}
                  </div>
                )}

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-md border border-line bg-paper-raised px-3 py-2.5 text-center font-display text-xl tracking-[0.5em] text-ink outline-none transition focus:border-signal focus:ring-1 focus:ring-signal"
                  placeholder="000000"
                />

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-md bg-signal px-3 py-2.5 text-sm font-medium text-signal-ink transition hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify and create workspace"}
                </button>

                <div className="flex items-center justify-between text-xs text-ink-soft">
                  <button type="button" onClick={() => setStep("details")} className="hover:text-ink">
                    ← Edit details
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={() => requestOtp()}
                    className="hover:text-ink disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-signal hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-md border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink outline-none transition focus:border-signal focus:ring-1 focus:ring-signal"
      />
    </div>
  );
}
