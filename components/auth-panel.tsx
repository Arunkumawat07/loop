import { ThemeToggle } from "@/components/theme-toggle";

export function AuthPanel({ tagline }: { tagline: string }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-ink px-10 py-10 text-paper md:flex md:w-[42%]">
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-semibold tracking-tight">LOOP</span>
        <ThemeToggle className="border-paper/20 text-paper/70 hover:text-paper" />
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        {/* The one bold move: concentric arcs standing in for a feedback
           loop — feedback goes in, insight comes back out. Pure SVG, no
           external assets. */}
        <svg
          viewBox="0 0 320 320"
          className="h-64 w-64 opacity-90"
          aria-hidden="true"
        >
          <circle cx="160" cy="160" r="140" stroke="var(--signal)" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
          <circle cx="160" cy="160" r="105" stroke="var(--signal)" strokeOpacity="0.4" strokeWidth="1.5" fill="none" />
          <circle cx="160" cy="160" r="70" stroke="var(--signal)" strokeOpacity="0.65" strokeWidth="1.5" fill="none" />
          <path
            d="M160 90a70 70 0 1 1-49.5 20.5"
            stroke="var(--signal)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M100 100l10.5 22 22-8.5z" fill="var(--signal)" />
          <circle cx="160" cy="160" r="8" fill="var(--signal)" />
        </svg>
      </div>

      <p className="max-w-xs font-display text-xl leading-snug">
        {tagline}
      </p>
    </div>
  );
}
