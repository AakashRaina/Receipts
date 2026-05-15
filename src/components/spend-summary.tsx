import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useCategoryBreakdown,
  useSpendSummary,
  useTopVendors,
  type ReceiptFilters,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

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
  const [mobileOpen, setMobileOpen] = useState(false);

  const total = Number(summary.data?.total ?? 0);
  const count = summary.data?.count ?? 0;

  const topCategoryTotal = categories.data?.[0]?.total
    ? Number(categories.data[0].total)
    : 0;

  const categoriesPanel = (
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
                  <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">No data yet.</p>
      )}
    </div>
  );

  const vendorsPanel = (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">Top vendors</div>
      {vendors.data && vendors.data.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm">
          {vendors.data.map((row) => (
            <li
              key={row.vendor_normalized ?? '_'}
              className="flex items-center justify-between gap-2"
            >
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
  );

  return (
    <>
      {/* Mobile: compact peek header + collapsible breakdown */}
      <div className="md:hidden">
        <Collapsible open={mobileOpen} onOpenChange={setMobileOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="rounded-lg border p-3 flex items-center justify-between gap-3 text-left">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total spend
                </div>
                <div className="text-xl font-semibold tabular-nums">{formatINR(total)}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <span>
                  {count} receipt{count === 1 ? '' : 's'}
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', mobileOpen && 'rotate-180')}
                />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {categoriesPanel}
            {vendorsPanel}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop: full 3-column panel */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total spend</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatINR(total)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            across {count} receipt{count === 1 ? '' : 's'}
          </div>
        </div>
        {categoriesPanel}
        {vendorsPanel}
      </div>
    </>
  );
}
