import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Database } from './database.types';
import type { Confidence } from './schemas/receipt';

type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
type ReceiptUpdate = Database['public']['Tables']['receipts']['Update'];

// Fields the user can edit inline. Mirrors Receipt schema scalars
// (line_items has its own editor; raw_text isn't user-editable).
export type EditableFieldKey =
  | 'vendor'
  | 'vendor_normalized'
  | 'date'
  | 'total'
  | 'currency'
  | 'gst'
  | 'category'
  | 'payment_method';

// Confidence is also keyed for fields the AI rated. We map editable scalars
// onto the closest confidence key. vendor_normalized rides on `vendor`.
const CONFIDENCE_KEY: Partial<Record<EditableFieldKey, keyof Confidence>> = {
  vendor: 'vendor',
  vendor_normalized: 'vendor',
  date: 'date',
  total: 'total',
  gst: 'gst',
  category: 'category',
  payment_method: 'payment_method',
};

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['receipts'] });
  queryClient.invalidateQueries({ queryKey: ['receipt'] });
  queryClient.invalidateQueries({ queryKey: ['spend-summary'] });
  queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
  queryClient.invalidateQueries({ queryKey: ['top-vendors'] });
  queryClient.invalidateQueries({ queryKey: ['distinct-categories'] });
  queryClient.invalidateQueries({ queryKey: ['distinct-vendors'] });
  queryClient.invalidateQueries({ queryKey: ['distinct-payment-methods'] });
}

export function useUpdateField(receiptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      field,
      value,
      currentConfidence,
    }: {
      field: EditableFieldKey;
      value: ReceiptRow[EditableFieldKey];
      currentConfidence: Confidence | null;
    }) => {
      const update: ReceiptUpdate = { [field]: value } as ReceiptUpdate;

      // Bump confidence to 1.0 on user-confirmed edit so the amber treatment clears.
      const confKey = CONFIDENCE_KEY[field];
      if (confKey && currentConfidence) {
        update.confidence = { ...currentConfidence, [confKey]: 1 };
      }

      const { error } = await supabase.from('receipts').update(update).eq('id', receiptId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: Pick<ReceiptRow, 'id' | 'image_path'>) => {
      // Delete the storage object first; if it fails the row stays so we can retry.
      if (row.image_path && row.image_path !== 'pending') {
        const { error: storageErr } = await supabase.storage
          .from('receipts')
          .remove([row.image_path]);
        // 404-style errors are fine — the file may already be gone.
        if (storageErr && !storageErr.message.toLowerCase().includes('not found')) {
          throw storageErr;
        }
      }
      const { error } = await supabase.from('receipts').delete().eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useBulkDeleteReceipts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<Pick<ReceiptRow, 'id' | 'image_path'>>) => {
      if (rows.length === 0) return;

      const paths = rows
        .map((r) => r.image_path)
        .filter((p): p is string => !!p && p !== 'pending');
      if (paths.length > 0) {
        const { error: storageErr } = await supabase.storage.from('receipts').remove(paths);
        if (storageErr && !storageErr.message.toLowerCase().includes('not found')) {
          throw storageErr;
        }
      }

      const { error } = await supabase
        .from('receipts')
        .delete()
        .in('id', rows.map((r) => r.id));
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRetryExtract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receiptId: string) => {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session) throw new Error('Not logged in');
      const jwt = sessionData.session.access_token;

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ receiptId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Extraction failed (${res.status})`);
      }
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
