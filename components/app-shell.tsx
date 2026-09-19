"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/trends", label: "Trends" },
  { href: "/ask", label: "Ask LOOP" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  email,
  role,
  children,
}: {
  email: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
              active
                ? "bg-signal-soft text-signal font-medium"
                : "text-paper/70 hover:bg-white/5 hover:text-paper"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${active ? "bg-signal" : "bg-transparent"}`}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col justify-between bg-ink px-4 py-6 md:flex">
        <div>
          <span className="font-display px-3 text-lg font-semibold text-paper">LOOP</span>
          <div className="mt-8">{navList}</div>
        </div>
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="px-3 text-xs text-paper/60">
            {email}
            <br />
            <span className="text-paper/40">{role}</span>
          </div>
          <div className="flex items-center justify-between px-3">
            <ThemeToggle className="border-paper/20 text-paper/70 hover:text-paper" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-paper/60 hover:text-paper"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="flex items-center justify-between border-b border-line bg-ink px-4 py-3 md:hidden">
        <span className="font-display text-lg font-semibold text-paper">LOOP</span>
        <div className="flex items-center gap-2">
          <ThemeToggle className="border-paper/20 text-paper/70 hover:text-paper" />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-paper/80"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col justify-between bg-ink px-4 py-6">
            <div>
              <div className="flex items-center justify-between px-3">
                <span className="font-display text-lg font-semibold text-paper">LOOP</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="text-paper/70"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div className="mt-8">{navList}</div>
            </div>
            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="px-3 text-xs text-paper/60">
                {email}
                <br />
                <span className="text-paper/40">{role}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-3 text-xs text-paper/60 hover:text-paper"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
