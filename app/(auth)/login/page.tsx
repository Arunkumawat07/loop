"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);

    if (result?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen bg-paper">
      <AuthPanel tagline="Close the loop on customer feedback." />

      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <span className="font-display text-lg font-semibold text-ink">LOOP</span>
            <ThemeToggle />
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-md bg-negative-soft px-3 py-2 text-sm text-negative">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink outline-none transition focus:border-signal focus:ring-1 focus:ring-signal"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink outline-none transition focus:border-signal focus:ring-1 focus:ring-signal"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-signal px-3 py-2.5 text-sm font-medium text-signal-ink transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            No workspace yet?{" "}
            <Link href="/signup" className="font-medium text-signal hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
