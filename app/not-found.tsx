import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <h1 className="text-3xl font-semibold text-ink">404</h1>
      <p className="mt-2 text-sm text-ink-soft">
        This page, or the item it points to, doesn't exist — or it belongs
        to a different workspace.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
