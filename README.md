# Hisaab

The documents that describe your spending — receipts, invoices, and bank
statements — turned into structured, queryable data, all in one place.

The end goal: at the end of every month, your bank statement should reconcile
against the receipts and invoices you've uploaded. Anything unmatched is either
a missing receipt or a transaction worth a second look.

Today's build covers **receipts**. Invoices and bank statements are next.

## How it fits together

| Document | What it gives you | Status |
|---|---|---|
| **Receipt** | Per-purchase detail: vendor, items, GST, payment method | ✅ today |
| **Invoice** | Billings from vendors with invoice number, due date, billed-to | 🚧 next |
| **Bank statement** | The ground truth of what actually moved, transaction by transaction | 🚧 after that |

Once all three exist, the dashboard becomes a monthly reconciliation view: the
statement total broken down by which transactions have matching receipts or
invoices, and which don't.

## Features (MVP — receipts only)

- Email/password auth (no verification step)
- Drag-and-drop upload with live extraction status
- Inline editing for every scalar field; per-field confidence flags low-quality
  AI extractions in amber until the user verifies
- Spend dashboard: total, by-category breakdown, top vendors — all reflect the
  active filters
- Faceted filters: vendor, category, payment method, date range, plus quick
  presets (This month, Last month, Last 30 days, This year)
- Full-text search across vendor, OCR'd raw text, and category
- Bulk select + delete from the list; single delete + retry from the detail page
- Mobile-tailored UI: collapsible summary, filters in a bottom sheet

## Roadmap

**Major — what completes the picture**

- **Invoices** — same flow as receipts (single-page image → structured fields),
  plus invoice-specific fields (`invoice_number`, `billed_to`, `due_date`,
  `po_number`, `terms`). PDF rendering happens in-browser before upload.
- **Bank statements** — periodic ingestion (monthly upload, or email-forwarded
  statement), parsed into individual transactions stored in their own table.
  Each transaction is cross-referenced against existing receipts/invoices to
  flag what's matched and what isn't.
- **Monthly reconciliation view** — the spend dashboard, but anchored on the
  statement: total spend, line-by-line attribution, and a "missing receipt"
  list to chase down.

**Smaller — additive, not blocking**

- **Export to CSV / JSON** — client-side download of filtered receipts
- **Natural-language Q&A** — "how much did I spend on coffee in April?" via
  schema-aware SQL generation
- **Bulk upload** — multi-file picker + async queue
- **HEIC images** — iPhone shooters currently must convert or switch camera to JPEG
- **Multi-currency** — single currency (INR), no FX. `currency` is captured
  but not used for conversion
- **Soft delete** — deletes are immediate and irreversible
- **Semantic search** — full-text only; no embeddings, no pgvector
- **Category deduplication** — the LLM picks a free-form category per receipt;
  near-duplicates ("Coffee" vs "Cafe") aren't merged

## Stack

| Concern        | Choice                                     |
|----------------|--------------------------------------------|
| Framework      | Vite + React 19 + TypeScript (SPA)         |
| Routing        | React Router v6                            |
| Data / cache   | TanStack Query                             |
| Backend        | Supabase (Postgres + Storage + Auth, RLS)  |
| Extraction LLM | Gemini 2.5 Flash (one Vercel function)     |
| Validation     | Zod (write paths only)                     |
| UI             | shadcn/ui + Tailwind v3                    |

See [AGENTS.md](./AGENTS.md) for architectural details and conventions.

## Setup

Requirements: Node 20+, a Supabase project, a Google AI Studio API key.

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Create `.env` (used by `api/extract.ts` at runtime — keep the same values as
`.env.local` for the Supabase keys plus the Gemini key):

```
GEMINI_API_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

In the Supabase dashboard:

- Auth → Providers → Email → toggle **Confirm email** off
- Storage → create a **private** bucket named `receipts`

Apply the migrations:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## Develop

```bash
npm run dev       # Vite only — UI/auth work that doesn't hit /api
npx vercel dev    # Vite + /api/extract together — required for upload
```

## Build

```bash
npm run build
```

## Deploy

Push to a GitHub repo, import into Vercel, and set these env vars in the
Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
