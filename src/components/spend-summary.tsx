import {
  useCategoryBreakdown,
  useSpendSummary,
  useTopVendors,
  type ReceiptFilters,
} from '@/lib/queries';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function SpendSummary({ filters }: { filters: ReceiptFilters }) {
  const summary = useSpendSummary(filters);
  const categories = useCategoryBreakdown(filters);
  const vendors = useTopVendors(filters, 5);

  const total = Number(summary.data?.total ?? 0);
  const count = summary.data?.count ?? 0;

  const topCategoryTotal = categories.data?.[0]?.total
    ? Number(categories.data[0].total)
    : 0;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-lg border p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Total spend</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{formatINR(total)}</div>
        <div className="text-xs text-muted-foreground mt-1">
          across {count} receipt{count === 1 ? '' : 's'}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">By category</div>
        {categories.data && categories.data.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {categories.data.slice(0, 5).map((row) => {
              const rowTotal = Number(row.total);
              const pct = topCategoryTotal === 0 ? 0 : (rowTotal / topCategoryTotal) * 100;
              return (
                <li key={row.category ?? '_'} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{row.category}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatINR(rowTotal)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">No data yet.</p>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Top vendors</div>
        {vendors.data && vendors.data.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm">
            {vendors.data.map((row) => (
              <li key={row.vendor_normalized ?? '_'} className="flex items-center justify-between gap-2">
                <span className="truncate">{row.vendor_normalized}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatINR(Number(row.total))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">No data yet.</p>
        )}
      </div>
    </div>
  );
}
