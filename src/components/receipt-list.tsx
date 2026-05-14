import { Link } from 'react-router-dom';
import type { ReceiptRow } from '@/lib/queries';
import { cn, formatReceiptDate } from '@/lib/utils';

function unverifiedCount(row: ReceiptRow): number {
  const c = row.confidence as Record<string, number> | null;
  if (!c) return 0;
  return Object.values(c).filter((v) => typeof v === 'number' && v < 0.7).length;
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount == null) return '—';
  return `${currency ?? ''} ${amount.toFixed(2)}`.trim();
}

function statusBadge(status: ReceiptRow['status']) {
  const map: Record<ReceiptRow['status'], string> = {
    pending: 'bg-muted text-muted-foreground',
    processing: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    ready: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    failed: 'bg-destructive/15 text-destructive',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full', map[status])}>
      {status}
    </span>
  );
}

export function ReceiptList({ rows }: { rows: ReceiptRow[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Vendor</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const unverified = unverifiedCount(r);
              return (
                <tr key={r.id} className="border-t hover:bg-accent/40">
                  <td className="px-3 py-2">
                    <Link to={`/receipts/${r.id}`} className="font-medium hover:underline">
                      {r.vendor ?? '—'}
                    </Link>
                    {unverified > 0 && (
                      <span
                        className="ml-2 text-xs text-amber-600 dark:text-amber-400"
                        title={`${unverified} field(s) need a quick check`}
                      >
                        ⚠ {unverified}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatReceiptDate(r.date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(r.total, r.currency)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.category ?? '—'}</td>
                  <td className="px-3 py-2">{statusBadge(r.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="md:hidden space-y-2">
        {rows.map((r) => {
          const unverified = unverifiedCount(r);
          return (
            <li key={r.id}>
              <Link
                to={`/receipts/${r.id}`}
                className="block border rounded-lg p-3 hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.vendor ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatReceiptDate(r.date)} · {r.category ?? '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="tabular-nums font-medium">
                      {formatMoney(r.total, r.currency)}
                    </div>
                    <div className="mt-1">{statusBadge(r.status)}</div>
                  </div>
                </div>
                {unverified > 0 && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    ⚠ {unverified} field(s) need a check
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
