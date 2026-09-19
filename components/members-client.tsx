"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
  createdAt: string;
};

export function MembersClient({
  isAdmin,
  currentUserId,
}: {
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ANALYST" as const });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers() {
    setLoading(true);
    const res = await fetch("/api/workspace/members");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add member");
      setSubmitting(false);
      return;
    }
    setForm({ name: "", email: "", password: "", role: "ANALYST" });
    setShowAddForm(false);
    setSubmitting(false);
    loadMembers();
  }

  async function handleRoleChange(id: string, role: string) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: role as Member["role"] } : m)));
    await fetch(`/api/workspace/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this teammate from the workspace?")) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/workspace/members/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      {isAdmin && (
        <div className="mb-4">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-signal-ink hover:opacity-90"
            >
              + Add teammate
            </button>
          ) : (
            <form onSubmit={handleAdd} className="rounded-lg border border-line bg-paper-raised p-4 space-y-3">
              {error && <p className="text-xs text-negative">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-md border border-line px-3 py-2 text-sm"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="rounded-md border border-line px-3 py-2 text-sm"
                />
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder="Temporary password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="rounded-md border border-line px-3 py-2 text-sm"
                />
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}
                  className="rounded-md border border-line px-3 py-2 text-sm"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <p className="text-xs text-ink-faint">
                Share this email + password with your teammate directly — there's no
                email-invite delivery in this project's scope, so they'll log in with
                what you set here.
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-signal-ink hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Adding..." : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-paper"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-faint">Loading...</p>
      ) : (
        <div className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {m.name} {m.id === currentUserId && <span className="text-xs text-ink-faint">(you)</span>}
                </p>
                <p className="text-xs text-ink-faint">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="rounded-md border border-line px-2 py-1 text-xs"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="ANALYST">Analyst</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                ) : (
                  <span className="text-xs text-ink-soft">{m.role}</span>
                )}
                {isAdmin && m.id !== currentUserId && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-xs text-negative hover:text-negative"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
