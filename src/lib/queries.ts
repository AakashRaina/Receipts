import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Database } from './database.types';

export type ReceiptRow = Database['public']['Tables']['receipts']['Row'];

export type ReceiptFilters = {
  vendor?: string;
  category?: string;
  paymentMethod?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  q?: string;
};

const EMPTY_FILTERS: ReceiptFilters = {};

export function useReceipts(
  filters: ReceiptFilters = EMPTY_FILTERS,
  options?: Omit<UseQueryOptions<ReceiptRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ['receipts', filters],
    queryFn: async () => {
      let q = supabase
        .from('receipts')
        .select('*')
        .order('date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (filters.vendor) q = q.eq('vendor_normalized', filters.vendor);
      if (filters.category) q = q.eq('category', filters.category);
      if (filters.paymentMethod) q = q.eq('payment_method', filters.paymentMethod);
      if (filters.from) q = q.gte('date', filters.from);
      if (filters.to) q = q.lte('date', filters.to);
      if (filters.q) q = q.textSearch('search_vector', filters.q, { type: 'websearch' });

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    ...options,
  });
}

export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ['receipt', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

// Distinct values for filter dropdowns. Cached longer since they change slowly.
function useDistinctColumnValues(
  queryKey: string,
  column: 'category' | 'vendor_normalized' | 'payment_method',
) {
  return useQuery({
    queryKey: [queryKey],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select(column)
        .not(column, 'is', null);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of (data ?? []) as Array<Record<string, string | null>>) {
        const v = row[column];
        if (v) set.add(v);
      }
      return Array.from(set).sort();
    },
  });
}

export function useDistinctCategories() {
  return useDistinctColumnValues('distinct-categories', 'category');
}
export function useDistinctVendors() {
  return useDistinctColumnValues('distinct-vendors', 'vendor_normalized');
}

// Aggregate RPC inputs share the same shape; null fields = "no constraint".
function aggregateArgs(filters: ReceiptFilters) {
  return {
    from_date: filters.from ?? undefined,
    to_date: filters.to ?? undefined,
    category_filter: filters.category ?? undefined,
    vendor_filter: filters.vendor ?? undefined,
    payment_filter: filters.paymentMethod ?? undefined,
  };
}

export function useDistinctPaymentMethods() {
  return useDistinctColumnValues('distinct-payment-methods', 'payment_method');
}

export function useSpendSummary(filters: ReceiptFilters = EMPTY_FILTERS) {
  return useQuery({
    queryKey: ['spend-summary', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('spend_summary', aggregateArgs(filters));
      if (error) throw error;
      return data?.[0] ?? { total: 0, count: 0 };
    },
  });
}

export function useCategoryBreakdown(filters: ReceiptFilters = EMPTY_FILTERS) {
  return useQuery({
    queryKey: ['category-breakdown', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('category_breakdown', aggregateArgs(filters));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTopVendors(filters: ReceiptFilters = EMPTY_FILTERS, limit = 5) {
  return useQuery({
    queryKey: ['top-vendors', filters, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('top_vendors', {
        ...aggregateArgs(filters),
        result_limit: limit,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}
