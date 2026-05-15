import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDistinctCategories,
  useDistinctPaymentMethods,
  useDistinctVendors,
  type ReceiptFilters,
} from '@/lib/queries';
import { defaultFilters, isDefaultFilters } from '@/lib/filters';
import { cn } from '@/lib/utils';

const ANY = '__any__';

type Preset = { id: string; label: string; range: () => { from: string; to: string } };

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

const PRESETS: Preset[] = [
  {
    id: 'this-month',
    label: 'This month',
    range: () => {
      const now = new Date();
      return { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)) };
    },
  },
  {
    id: 'last-month',
    label: 'Last month',
    range: () => {
      const prev = subMonths(new Date(), 1);
      return { from: iso(startOfMonth(prev)), to: iso(endOfMonth(prev)) };
    },
  },
  {
    id: 'last-30',
    label: 'Last 30 days',
    range: () => {
      const now = new Date();
      return { from: iso(subDays(now, 30)), to: iso(now) };
    },
  },
  {
    id: 'this-year',
    label: 'This year',
    range: () => {
      const now = new Date();
      return { from: iso(startOfYear(now)), to: iso(endOfYear(now)) };
    },
  },
];

function activePresetId(filters: ReceiptFilters): string | null {
  if (!filters.from || !filters.to) return null;
  for (const p of PRESETS) {
    const r = p.range();
    if (r.from === filters.from && r.to === filters.to) return p.id;
  }
  return null;
}

// Counts active filter facets beyond the default "This month" range.
// Used by the mobile filter trigger to show a badge.
export function activeFilterCount(filters: ReceiptFilters): number {
  let n = 0;
  if (filters.vendor) n++;
  if (filters.category) n++;
  if (filters.paymentMethod) n++;
  if (filters.q) n++;
  // Date range that isn't the "This month" default counts as one.
  const def = defaultFilters();
  if (filters.from !== def.from || filters.to !== def.to) n++;
  return n;
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: ReceiptFilters;
  onChange: (next: ReceiptFilters) => void;
}) {
  const { data: vendors } = useDistinctVendors();
  const { data: categories } = useDistinctCategories();
  const { data: paymentMethods } = useDistinctPaymentMethods();
  const activePreset = activePresetId(filters);

  function patch(partial: Partial<ReceiptFilters>) {
    const next: ReceiptFilters = { ...filters, ...partial };
    for (const key of Object.keys(next) as (keyof ReceiptFilters)[]) {
      const value = next[key];
      if (value === undefined || value === '') delete next[key];
    }
    onChange(next);
  }

  function applyPreset(p: Preset) {
    if (activePreset === p.id) {
      patch({ from: undefined, to: undefined });
    } else {
      patch(p.range());
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = activePreset === p.id;
          return (
            <Button
              key={p.id}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => applyPreset(p)}
              className={cn('h-7 px-2.5 text-xs')}
            >
              {p.label}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Vendor</Label>
          <Select
            value={filters.vendor ?? ANY}
            onValueChange={(v) => patch({ vendor: v === ANY ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any vendor</SelectItem>
              {vendors?.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select
            value={filters.category ?? ANY}
            onValueChange={(v) => patch({ category: v === ANY ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any category</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Payment method</Label>
          <Select
            value={filters.paymentMethod ?? ANY}
            onValueChange={(v) => patch({ paymentMethod: v === ANY ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any payment</SelectItem>
              {paymentMethods?.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="from-date" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="from-date"
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => patch({ from: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to-date" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="to-date"
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => patch({ to: e.target.value || undefined })}
          />
        </div>
        <div>
          {!isDefaultFilters(filters) && (
            <Button variant="outline" size="sm" onClick={() => onChange(defaultFilters())}>
              <X className="h-4 w-4 mr-1" />
              Reset to this month
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
