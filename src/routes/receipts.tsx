import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadReceiptDialog } from '@/components/upload-receipt-dialog';
import { ReceiptList } from '@/components/receipt-list';
import { FilterBar } from '@/components/filter-bar';
import { MobileFilterSheet } from '@/components/mobile-filter-sheet';
import { SearchInput } from '@/components/search-input';
import { SpendSummary } from '@/components/spend-summary';
import { useReceipts, type ReceiptFilters } from '@/lib/queries';
import { defaultFilters, isDefaultFilters, parseFilters, serializeFilters } from '@/lib/filters';

export default function ReceiptsRoute() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialized = useRef(false);

  // First visit (or fresh navigation to /receipts) with no filter params:
  // apply the "This month" default. Explicitly clearing filters is preserved
  // for the rest of this mount.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (searchParams.toString() === '') {
      setSearchParams(serializeFilters(defaultFilters()), { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const filtering = !isDefaultFilters(filters);

  const { data: rows, isPending, error } = useReceipts(filters);

  function handleFiltersChange(next: ReceiptFilters) {
    setSearchParams(serializeFilters(next), { replace: true });
  }

  function handleSearchChange(next: string | undefined) {
    handleFiltersChange({ ...filters, q: next });
  }

  function handleUploaded() {
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['distinct-categories'] });
    queryClient.invalidateQueries({ queryKey: ['distinct-vendors'] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Receipts</h1>
        <p className="text-muted-foreground text-sm">
          {rows && rows.length > 0
            ? `${rows.length} receipt${rows.length === 1 ? '' : 's'}${filtering ? ' match the filters' : ''}`
            : 'Your uploaded receipts will appear here.'}
        </p>
      </div>

      <SpendSummary filters={filters} />

      <SearchInput value={filters.q} onChange={handleSearchChange} />

      {/* Desktop: inline filter panel */}
      <div className="hidden md:block rounded-lg border p-3">
        <FilterBar filters={filters} onChange={handleFiltersChange} />
      </div>

      {/* Mobile: filters live in a bottom sheet */}
      <div className="md:hidden">
        <MobileFilterSheet filters={filters} onChange={handleFiltersChange} />
      </div>

      {error && (
        <p className="text-sm text-destructive">Couldn’t load receipts: {error.message}</p>
      )}

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isPending && rows && rows.length === 0 && !filtering && (
        <Card>
          <CardHeader>
            <CardTitle>Nothing for this month</CardTitle>
            <CardDescription>
              Upload a receipt, or pick a different date range above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadReceiptDialog onUploaded={handleUploaded}>
              <Button>Upload a receipt</Button>
            </UploadReceiptDialog>
          </CardContent>
        </Card>
      )}

      {!isPending && rows && rows.length === 0 && filtering && (
        <Card>
          <CardHeader>
            <CardTitle>No matches</CardTitle>
            <CardDescription>Try relaxing your filters or reset to this month.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isPending && rows && rows.length > 0 && <ReceiptList rows={rows} />}
    </div>
  );
}
