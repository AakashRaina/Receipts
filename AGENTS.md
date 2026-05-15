# AGENTS.md

Context for AI coding agents working on this repo.

## What this is

**Hisaab** — a single-page React app that turns receipt images into
structured, queryable data via a vision LLM. Today's MVP covers receipts;
the broader product vision (invoices, bank statements, monthly
reconciliation) lives in [README.md](./README.md).

## Stack

Each line is something not obvious from `package.json` alone.

- **Vite + React 19 + TypeScript** — SPA, no SSR.
- **React Router v6** — page components in `src/routes/*.tsx`.
- **TanStack Query** — server-state cache. Reads live in
  `src/lib/queries.ts`, writes in `src/lib/mutations.ts`.
- **Supabase** (Postgres + Storage + Auth) — accessed directly from the
  browser with the anon (publishable) key. **RLS is the trust boundary**, not
  app code.
- **Gemini 2.5 Flash** — vision extraction, called from one Vercel Node
  function at `api/extract.ts`. The only server-side code in the project.
- **Zod** — write-path validation only (Gemini response + edit mutations).
  Read-path types come from generated `src/lib/database.types.ts`.
- **shadcn/ui + Tailwind v3** — primitives under `src/components/ui/`.

## The one architectural rule

**Tenant isolation is enforced by Postgres RLS using `auth.uid()` from the
caller's JWT. Never use the service role key. Never bypass RLS.**

- The browser holds a Supabase JWT and talks to Supabase directly. RLS
  limits every query to that user's rows
  (`supabase/migrations/20260514043731_rls_policies.sql`).
- `api/extract.ts` reads the JWT from the `Authorization` header and creates
  a Supabase client with the anon key + that JWT. Every DB call from the
  function flows through RLS as that user.
- Storage objects live under `{user_id}/{receipt_id}.{ext}`; a storage RLS
  policy checks that the first path segment matches `auth.uid()`.

## Where things live

```
api/extract.ts                Vercel Node function — only server code.
src/main.tsx                  BrowserRouter + QueryClient.
src/routes/                   Page-level components.
src/components/               UI. ui/ holds shadcn primitives.
src/lib/supabase.ts           Single Supabase client.
src/lib/queries.ts            TanStack Query read hooks.
src/lib/mutations.ts          TanStack Query write hooks.
src/lib/filters.ts            URL <-> ReceiptFilters object.
src/lib/schemas/receipt.ts    Zod ReceiptSchema — source of truth for the
                              extraction shape + edit mutation coercion.
src/lib/database.types.ts     GENERATED — never hand-edit.
supabase/migrations/          Forward-only SQL migrations.
```

## How to develop, build, migrate

```bash
npm run dev          # Vite only, port 5173. UI work that doesn't hit /api.
npx vercel dev       # Vite + /api/extract, port 3000. Required for upload.
npm run build        # tsc + vite build. Run before commits.
npm run test:run     # Vitest one-shot. `npm test` for watch mode.
```

Schema changes:

```bash
npx supabase migration new <name>
# edit supabase/migrations/<ts>_<name>.sql
npx supabase db push
npx supabase gen types typescript --linked 2>/dev/null > src/lib/database.types.ts
```

The `2>/dev/null` is required — the CLI's "Initialising login role..."
status line otherwise leaks into the types file and breaks TypeScript.

## Conventions

- **URL is the source of truth for filter state.** Filter components patch
  via `setSearchParams`; `useReceipts(filters)` reads from URL. Don't keep
  long-lived filter state in component-local state.
- **Dates** are `YYYY-MM-DD` strings throughout. Use `formatReceiptDate()`
  from `src/lib/utils.ts` for display — it uses `parseISO`.
  `new Date('YYYY-MM-DD')` parses as UTC midnight and shifts in non-UTC
  zones; don't use it.
- **Editable fields** bump `confidence[field] = 1` in `useUpdateField` so
  the "low confidence" amber treatment clears on user-confirmed edits.
- **Money** is INR-only for now. `currency` is captured but not used for FX.
- **Comments** only when the WHY isn't obvious. Type names carry the WHAT.

## Tests

Vitest + React Testing Library + happy-dom. Test files live next to the
file under test (`*.test.ts` / `*.test.tsx`). Coverage today is roughly:

- **Pure functions** — `lib/filters`, `lib/utils`, `lib/schemas/receipt`
- **Components** — `editable-field`, `search-input`
- **Hooks with mocked Supabase** — `lib/queries`, `lib/mutations`

For the data layer, each test file inlines its own Supabase mock inside a
`vi.hoisted(() => { … })` block (vi.mock factories are hoisted above
regular imports, so the mock must be hoisted too). The mock is a Proxy
that records every chain method call and resolves on await — assertions
look at the recorded calls. See `src/lib/queries.test.tsx` for the
pattern.

## Don't

- **Don't edit a migration that's already been pushed.** Add a new one.
- **Don't introduce a service role key path.** The function uses the
  caller's JWT.
- **Don't put server-only secrets in `.env.local`** and expect `vercel dev`
  to read them. It reliably reads `.env` only; `VITE_*` keys are duplicated
  there for the function's runtime access.

## Extending to invoices / bank statements

Two roadmap items in the README change the data model:

- **Invoices**: schema is close — add invoice-specific columns
  (`invoice_number`, `due_date`, `billed_to`, …) plus matching Zod fields,
  reuse the existing upload + extraction flow. PDF rendering happens
  client-side before upload.
- **Bank statements**: not additive. One statement → many transactions;
  needs a new `transactions` table foreign-keyed to the statement, a
  separate parsing flow, and a reconciliation layer that cross-references
  transactions against existing receipts/invoices.

Neither has scaffolding yet. Don't anticipate them in current schema
design — wait for the actual feature work.
