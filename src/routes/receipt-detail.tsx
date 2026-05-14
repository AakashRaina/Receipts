import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, RotateCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditableField } from '@/components/editable-field';
import { supabase } from '@/lib/supabase';
import { useReceipt } from '@/lib/queries';
import {
  useDeleteReceipt,
  useRetryExtract,
  useUpdateField,
  type EditableFieldKey,
} from '@/lib/mutations';
import { cn } from '@/lib/utils';
import type { Confidence } from '@/lib/schemas/receipt';

const LOW_CONFIDENCE = 0.7;

// EditableField keys -> confidence keys.
const CONF_KEY: Partial<Record<EditableFieldKey, keyof Confidence>> = {
  vendor: 'vendor',
  date: 'date',
  total: 'total',
  gst: 'gst',
  category: 'category',
  payment_method: 'payment_method',
};

export default function ReceiptDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: receipt, error: loadError, isPending } = useReceipt(id);
  const updateField = useUpdateField(id ?? '');
  const deleteReceipt = useDeleteReceipt();
  const retry = useRetryExtract();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!receipt?.image_path || receipt.image_path === 'pending') return;
      const { data } = await supabase.storage
        .from('receipts')
        .createSignedUrl(receipt.image_path, 600);
      if (!cancelled && data) setImageUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [receipt?.image_path]);

  const confidence = (receipt?.confidence as Confidence | null) ?? null;
  const lowConfidenceFields = receipt
    ? (Object.entries(CONF_KEY) as Array<[EditableFieldKey, keyof Confidence]>)
        .filter(([, confKey]) => (confidence?.[confKey] ?? 1) < LOW_CONFIDENCE)
        .map(([fieldKey]) => fieldKey)
    : [];

  async function saveField<K extends EditableFieldKey>(field: K, value: unknown) {
    await updateField.mutateAsync({
      field,
      value: value as never,
      currentConfidence: confidence,
    });
  }

  async function handleDelete() {
    if (!receipt) return;
    try {
      await deleteReceipt.mutateAsync({ id: receipt.id, image_path: receipt.image_path });
      navigate('/receipts');
    } catch (err) {
      alert(`Could not delete: ${(err as Error).message}`);
    }
  }

  async function handleRetry() {
    if (!receipt) return;
    try {
      await retry.mutateAsync(receipt.id);
    } catch (err) {
      alert(`Retry failed: ${(err as Error).message}`);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        to="/receipts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      {loadError && (
        <Card>
          <CardHeader>
            <CardTitle>Couldn't load receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{loadError.message}</p>
          </CardContent>
        </Card>
      )}

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {receipt && (
        <>
          {receipt.status === 'failed' && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Extraction failed</p>
                  {receipt.error_message && (
                    <p className="text-xs text-destructive/80 mt-0.5">{receipt.error_message}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={retry.isPending}
                >
                  <RotateCw className={cn('h-4 w-4 mr-1.5', retry.isPending && 'animate-spin')} />
                  {retry.isPending ? 'Retrying…' : 'Retry'}
                </Button>
              </div>
            </div>
          )}

          {receipt.status === 'pending' && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              This receipt was uploaded but never processed. You can retry extraction or delete it.
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={handleRetry} disabled={retry.isPending}>
                  <RotateCw className={cn('h-4 w-4 mr-1.5', retry.isPending && 'animate-spin')} />
                  {retry.isPending ? 'Retrying…' : 'Retry extraction'}
                </Button>
              </div>
            </div>
          )}

          {receipt.status === 'ready' && lowConfidenceFields.length > 0 && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>
                <strong>{lowConfidenceFields.length}</strong> field
                {lowConfidenceFields.length === 1 ? '' : 's'} might need a quick check.
              </span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              {imageUrl ? (
                <img src={imageUrl} alt="Receipt" className="rounded border w-full" />
              ) : (
                <div className="rounded border border-dashed p-8 text-sm text-muted-foreground text-center">
                  No image
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-3">
                <EditableField
                  label="Vendor"
                  value={receipt.vendor}
                  confidence={confidence?.vendor}
                  onSave={(v) => saveField('vendor', v)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <EditableField
                    label="Date"
                    type="date"
                    value={receipt.date}
                    confidence={confidence?.date}
                    onSave={(v) => saveField('date', v)}
                  />
                  <EditableField
                    label="Category"
                    value={receipt.category}
                    confidence={confidence?.category}
                    onSave={(v) => saveField('category', v)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <EditableField
                    label="Total"
                    type="number"
                    value={receipt.total}
                    confidence={confidence?.total}
                    onSave={(v) => saveField('total', v)}
                  />
                  <EditableField
                    label="GST"
                    type="number"
                    value={receipt.gst}
                    confidence={confidence?.gst}
                    onSave={(v) => saveField('gst', v)}
                  />
                  <EditableField
                    label="Currency"
                    value={receipt.currency}
                    placeholder="INR"
                    onSave={(v) => saveField('currency', v)}
                  />
                </div>
                <EditableField
                  label="Payment method"
                  value={receipt.payment_method}
                  confidence={confidence?.payment_method}
                  onSave={(v) => saveField('payment_method', v)}
                />
              </div>

              {Array.isArray(receipt.line_items) && receipt.line_items.length > 0 && (
                <div>
                  <h2 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                    Line items
                  </h2>
                  <ul className="space-y-1 text-sm">
                    {(receipt.line_items as Array<{
                      description: string;
                      quantity: number | null;
                      unit_price: number | null;
                      total: number | null;
                    }>).map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 border-b last:border-b-0 py-1"
                      >
                        <span className="truncate">
                          {item.description}
                          {item.quantity != null && item.quantity !== 1 && (
                            <span className="text-muted-foreground"> × {item.quantity}</span>
                          )}
                        </span>
                        {item.total != null && (
                          <span className="tabular-nums text-muted-foreground">
                            {item.total.toFixed(2)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete receipt
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The receipt and its image will be permanently removed. This can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
