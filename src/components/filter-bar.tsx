import { useEffect, useRef, useState } from 'react';
import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import { Search, X } from 'lucide-react';
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
const MIN_SEARCH_CHARS = 4;

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

  // Debounced search input — local state is the source of truth while typing,
  // pushed into the URL filters 250ms after the user stops.
  const [localQ, setLocalQ] = useState(filters.q ?? '');
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    // Sync external -> local when URL changes (e.g., browser back button).
    setLocalQ((current) => (current === (filters.q ?? '') ? current : filters.q ?? ''));
  }, [filters.q]);

  function handleSearchChange(value: string) {
    setLocalQ(value);
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const trimmed = value.trim();
      // Trigger search only on 4+ chars; empty input clears any existing search.
      if (trimmed === '') patch({ q: undefined });
      else if (trimmed.length >= MIN_SEARCH_CHARS) patch({ q: trimmed });
    }, 250);
  }

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
      // Toggle off
      patch({ from: undefined, to: undefined });
    } else {
      patch(p.range());
    }
  }

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendor, items, anything on the receipt…"
            value={localQ}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        {localQ.trim().length > 0 && localQ.trim().length < MIN_SEARCH_CHARS && (
          <p className="mt-1 text-xs text-muted-foreground">
            Type at least {MIN_SEARCH_CHARS} characters to search.
          </p>
        )}
      </div>

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
