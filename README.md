# LOOP — AI Customer-Feedback Intelligence Platform

> Zidio Development Internship — Web Development Track — Project LOOP
> "Close the loop on customer feedback."

LOOP ingests multi-channel customer feedback (support tickets, app-store
reviews, NPS surveys, sales notes, community posts), uses Claude to
classify and cluster it, surfaces trending themes, answers plain-English
questions grounded in the actual feedback, and generates a shareable
Voice-of-Customer report — all inside a secure, multi-tenant workspace
with role-based access control.

## Status

This repo is scaffolded through the **Week 1 foundation** milestone (M1):
auth, workspaces, RBAC guard, feedback create/list API, seed data. See
commit history for what's built vs. still to do against the 4-week plan.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon / Supabase free tier) |
| ORM | Prisma |
| Auth | NextAuth (Auth.js) v5, credentials provider |
| AI | Anthropic Claude API |
| Validation | Zod |
| Charts | Recharts (Week 2) |
| Deployment | Vercel |

## Local setup

### 1. Prerequisites
- Node.js 18+ and npm
- A free PostgreSQL database — [Neon](https://neon.tech) or [Supabase](https://supabase.com)
- An Anthropic API key

### 2. Install
```bash
npm install
```

### 3. Environment variables
Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string from Neon/Supabase |
| `NEXTAUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` locally |
| `ANTHROPIC_API_KEY` | Your Claude API key (server-side only, never exposed to the browser) |

### 4. Database
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed
```

`npm run seed` creates one demo workspace ("Acme Corp (Demo)"), three
users — one per role — and 130+ realistic feedback items across 6
themes and 5 channels.

**Demo login credentials** (seeded workspace):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@loop.demo` | `Demo1234!` |
| Analyst | `analyst@loop.demo` | `Demo1234!` |
| Viewer | `viewer@loop.demo` | `Demo1234!` |

> Change `DEMO_PASSWORD` in `prisma/seed.ts` before this ever touches a
> public deployment with real users.

### 5. Run
```bash
npm run dev
# http://localhost:3000
```

## Architecture

Three-tier: browser → Next.js Route Handlers (API layer) → PostgreSQL,
with Claude called server-side only. See `/lib/guard.ts` for the central
RBAC + tenant-isolation guard every API route uses.

```
Client (React Server/Client Components)
        │
        ▼
API layer — app/api/**  (auth guard → role guard → workspaceId scoping → Zod validation)
        │
        ├──▶ Prisma ──▶ PostgreSQL   (every tenant table has workspaceId)
        └──▶ Claude API (server-side only, never called from the browser)
```

**Non-negotiable rule:** every query in `/lib` and `/app/api` that touches
`feedback`, `themes`, `reports`, or `users` is filtered by
`session.workspaceId` from the authenticated session — never from a
client-supplied value. See `lib/guard.ts` for why.

## Project structure

```
loop/
  app/
    (auth)/login, signup
    (app)/dashboard, inbox, trends, ask, reports, settings   [Week 2-4]
    api/
      auth/[...nextauth]     # NextAuth handlers
      auth/signup            # Workspace + ADMIN user creation
      feedback/               # CRUD + ingestion (list/create/status)
      themes/                 # clustering + trends                     [Week 3]
      insights/                # Ask LOOP Q&A                            [Week 3]
      reports/                 # VoC generation                          [Week 4]
  components/
  lib/
    ai.ts          # Claude calls: classify, answer, report             [Week 3]
    search.ts      # embeddings + retrieval                             [Week 3]
    auth.ts        # NextAuth config
    guard.ts        # session + role guards, tenant scoping
    db.ts          # Prisma client singleton
    validation/     # Zod schemas
  prisma/
    schema.prisma
    seed.ts
```

## Roles

| Role | Can do |
|---|---|
| Admin | Everything Analyst can, plus manage members & roles |
| Analyst | Ingest feedback, manage status, view everything |
| Viewer | Read-only |

Role checks are enforced **server-side** in every API route (`lib/guard.ts`
→ `requireRole`) — not just hidden in the UI. Forbidden actions return
`403`.

## Screenshots

_Add screenshots here once the dashboard/inbox UI is built (Week 2+)._

## Roadmap

See the project brief (Section 10) for the full 4-week sprint plan and
Section 08 for feature acceptance criteria.
