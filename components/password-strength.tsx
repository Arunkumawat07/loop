"use client";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordMeetsRequirements(password: string): boolean {
  return RULES.every((r) => r.test(password));
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  return (
    <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              met ? "text-positive" : "text-ink-faint"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                met ? "border-positive bg-positive-soft" : "border-line"
              }`}
            >
              {met && (
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
