# receipts

Turn messy receipts into structured, queryable data. Upload a receipt image; a vision LLM extracts vendor, date, total, line items, and more; browse, filter, search, and edit the results.

Single-page React app + one serverless function for the Gemini call. Auth, DB, and storage via Supabase.

## Stack

- **Vite + React + TypeScript** — SPA
- **React Router** — routing
- **TanStack Query** — data fetching and cache
- **Supabase** — Postgres + Storage + Auth (RLS-enforced)
- **Gemini 2.0 Flash** — vision extraction (called from one Vercel function)
- **Zod** — write-path validation
- **shadcn/ui + Tailwind v3** — UI

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
# Put GEMINI_API_KEY in .env (not .env.local — it's only used by the serverless function)
```

In the Supabase dashboard:
- Auth → Providers → Email → toggle "Confirm email" **OFF**
- Storage → create a **private** bucket named `receipts`
- Run migrations: `npx supabase db push` (after `npx supabase link`)

## Develop

```bash
npm run dev       # Vite dev server (frontend only)
npx vercel dev    # Vite + the /api function together (needed to test extraction end-to-end)
```

## Build

```bash
npm run build
```

## Deploy

Push to a GitHub repo, import to Vercel, and set the four env vars from `.env.example` in the Vercel dashboard.

## Plan

See [`/Users/aakash/.claude/plans/let-s-first-create-an-steady-cray.md`](/Users/aakash/.claude/plans/let-s-first-create-an-steady-cray.md) (local) for the phased build plan.
