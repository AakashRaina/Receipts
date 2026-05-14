import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import type { ReceiptRow } from '@/lib/queries';
import { useBulkDeleteReceipts } from '@/lib/mutations';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const navigate = useNavigate();
  const bulkDelete = useBulkDeleteReceipts();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Drop selections that aren't in the current row set (e.g. after filter change).
  const visibleIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) if (visibleIds.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  async function handleDelete() {
    const toDelete = rows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({ id: r.id, image_path: r.image_path }));
    try {
      await bulkDelete.mutateAsync(toDelete);
      setSelectedIds(new Set());
      setConfirmOpen(false);
    } catch (err) {
      alert(`Could not delete: ${(err as Error).message}`);
    }
  }

  function navigateRow(id: string) {
    navigate(`/receipts/${id}`);
  }

  return (
    <div className="space-y-2">
      <ActionBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setConfirmOpen(true)}
        deleting={bulkDelete.isPending}
      />

      {/* Desktop table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
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
              const checked = selectedIds.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    'border-t hover:bg-accent/40 cursor-pointer',
                    checked && 'bg-accent/30',
                  )}
                  onClick={(e) => {
                    // Don't navigate when clicking inside the checkbox cell.
                    if ((e.target as HTMLElement).closest('[data-no-row-nav]')) return;
                    navigateRow(r.id);
                  }}
                >
                  <td className="px-3 py-2" data-no-row-nav onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRow(r.id)}
                      aria-label={`Select ${r.vendor ?? r.id}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.vendor ?? '—'}</span>
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
          const checked = selectedIds.has(r.id);
          return (
            <li
              key={r.id}
              className={cn(
                'border rounded-lg p-3 flex gap-3',
                checked && 'bg-accent/30',
              )}
            >
              <div
                className="pt-0.5"
                data-no-row-nav
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleRow(r.id)}
                  aria-label={`Select ${r.vendor ?? r.id}`}
                />
              </div>
              <Link to={`/receipts/${r.id}`} className="flex-1 min-w-0">
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} receipt{selectedIds.size === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The selected receipts and their images will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={bulkDelete.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionBar({
  count,
  onClear,
  onDelete,
  deleting,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <span>
        <strong>{count}</strong> selected
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClear} disabled={deleting}>
          Clear
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4 mr-1.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

