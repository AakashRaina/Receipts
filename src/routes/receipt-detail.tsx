// Minimal read-only stub for Phase 1 verification.
// Phase 3 replaces this with editable fields, signed-image preview, review banner, etc.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { formatReceiptDate } from '@/lib/utils';
import type { Database } from '@/lib/database.types';

type ReceiptRow = Database['public']['Tables']['receipts']['Row'];

export default function ReceiptDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<ReceiptRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setError(error?.message ?? 'Not found');
        return;
      }
      setReceipt(data);
      if (data.image_path && data.image_path !== 'pending') {
        const { data: signed } = await supabase.storage
          .from('receipts')
          .createSignedUrl(data.image_path, 120);
        if (!cancelled && signed) setImageUrl(signed.signedUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <Link
        to="/receipts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Couldn't load receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!error && !receipt && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!error && receipt && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            {imageUrl ? (
              <img src={imageUrl} alt="Receipt" className="rounded border w-full" />
            ) : (
              <div className="text-sm text-muted-foreground">No image</div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">{receipt.vendor ?? 'Unknown vendor'}</h1>
              <p className="text-sm text-muted-foreground">Status: {receipt.status}</p>
            </div>
            {receipt.error_message && (
              <p className="text-sm text-destructive">{receipt.error_message}</p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Date" value={formatReceiptDate(receipt.date)} />
              <Field label="Total" value={receipt.total != null ? `${receipt.currency ?? ''} ${receipt.total}` : null} />
              <Field label="GST" value={receipt.gst} />
              <Field label="Category" value={receipt.category} />
              <Field label="Payment" value={receipt.payment_method} />
            </dl>
            {Array.isArray(receipt.line_items) && receipt.line_items.length > 0 && (
              <div>
                <h2 className="text-sm font-medium mb-2">Line items</h2>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                  {JSON.stringify(receipt.line_items, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value == null || value === '' ? '—' : String(value)}</dd>
    </>
  );
}
