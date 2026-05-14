import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Database } from './database.types';

export type ReceiptRow = Database['public']['Tables']['receipts']['Row'];

export type ReceiptFilters = {
  vendor?: string;
  category?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  minAmount?: number;
  maxAmount?: number;
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
      if (filters.from) q = q.gte('date', filters.from);
      if (filters.to) q = q.lte('date', filters.to);
      if (filters.minAmount != null) q = q.gte('total', filters.minAmount);
      if (filters.maxAmount != null) q = q.lte('total', filters.maxAmount);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    ...options,
  });
}

// Distinct values for filter dropdowns. Cached longer since they change slowly.
export function useDistinctCategories() {
  return useQuery({
    queryKey: ['distinct-categories'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('category')
        .not('category', 'is', null);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) if (r.category) set.add(r.category);
      return Array.from(set).sort();
    },
  });
}

export function useDistinctVendors() {
  return useQuery({
    queryKey: ['distinct-vendors'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('vendor_normalized')
        .not('vendor_normalized', 'is', null);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) if (r.vendor_normalized) set.add(r.vendor_normalized);
      return Array.from(set).sort();
    },
  });
}
