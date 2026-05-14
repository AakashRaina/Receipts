import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadDropzone } from '@/components/upload-dropzone';
import { supabase } from '@/lib/supabase';
import { formatReceiptDate } from '@/lib/utils';
import type { Receipt } from '@/lib/schemas/receipt';

type Stage = 'idle' | 'uploading' | 'reading' | 'almost' | 'done' | 'error';

const STAGE_COPY: Record<'uploading' | 'reading' | 'almost', string> = {
  uploading: 'Uploading…',
  reading: 'AI reading receipt…',
  almost: 'Almost done…',
};

export function UploadReceiptDialog({
  children,
  onUploaded,
}: {
  children: React.ReactNode;
  onUploaded?: (receiptId: string) => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  // Rotate status copy while extracting.
  useEffect(() => {
    if (stage !== 'uploading') return;
    const t1 = setTimeout(() => setStage('reading'), 2000);
    const t2 = setTimeout(() => setStage('almost'), 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [stage]);

  // Free the object URL when it's replaced or the dialog closes.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function reset() {
    setStage('idle');
    setError(null);
    setPreviewUrl(null);
    setReceipt(null);
    setReceiptId(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleFile(file: File) {
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setStage('uploading');

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session) throw new Error('Not logged in');
      const userId = sessionData.session.user.id;
      const jwt = sessionData.session.access_token;

      const ext = file.type === 'image/png' ? 'png' : 'jpg';

      const { data: row, error: insertErr } = await supabase
        .from('receipts')
        .insert({ user_id: userId, image_path: 'pending', status: 'pending' })
        .select('id')
        .single();
      if (insertErr || !row) throw new Error(insertErr?.message ?? 'Could not create receipt row');

      const imagePath = `${userId}/${row.id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(imagePath, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      const { error: pathErr } = await supabase
        .from('receipts')
        .update({ image_path: imagePath })
        .eq('id', row.id);
      if (pathErr) throw new Error(`Could not record image path: ${pathErr.message}`);

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ receiptId: row.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Extraction failed (${res.status})`);
      }
      const data = (await res.json()) as { receipt: Receipt };

      setReceipt(data.receipt);
      setReceiptId(row.id);
      setStage('done');
      onUploaded?.(row.id);
    } catch (err) {
      setStage('error');
      setError((err as Error).message);
    }
  }

  function openDetail() {
    if (!receiptId) return;
    setOpen(false);
    navigate(`/receipts/${receiptId}`);
  }

  const busy = stage === 'uploading' || stage === 'reading' || stage === 'almost';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {stage === 'done' ? 'Receipt added' : 'Upload receipt'}
          </DialogTitle>
          <DialogDescription>
            {stage === 'done'
              ? 'Here’s what we extracted. Edit any field on the detail page.'
              : 'PNG or JPG, up to 8 MB. Extraction takes a few seconds.'}
          </DialogDescription>
        </DialogHeader>

        {stage === 'idle' && <UploadDropzone onFile={handleFile} />}

        {busy && (
          <div className="space-y-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-h-48 mx-auto rounded border"
              />
            )}
            <div className="text-center text-sm font-medium">{STAGE_COPY[stage]}</div>
            <p className="text-xs text-muted-foreground text-center">
              Hang tight — don’t close this.
            </p>
          </div>
        )}

        {stage === 'done' && receipt && (
          <div className="space-y-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Receipt"
                className="max-h-48 mx-auto rounded border"
              />
            )}
            <div className="space-y-1">
              <p className="font-medium">{receipt.vendor}</p>
              <p className="text-xs text-muted-foreground">
                {formatReceiptDate(receipt.date)} · {receipt.category}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Total" value={`${receipt.currency} ${receipt.total}`} />
              {receipt.gst != null && (
                <Row label="GST" value={`${receipt.currency} ${receipt.gst}`} />
              )}
              {receipt.payment_method && (
                <Row label="Payment" value={receipt.payment_method} />
              )}
              <Row label="Items" value={String(receipt.line_items.length)} />
            </dl>
          </div>
        )}

        {stage === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={reset}>
              Try again
            </Button>
          </div>
        )}

        <DialogFooter>
          {stage === 'done' ? (
            <>
              <DialogClose asChild>
                <Button variant="outline">Done</Button>
              </DialogClose>
              <Button onClick={openDetail}>Edit details</Button>
            </>
          ) : (
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                {busy ? 'Working…' : 'Cancel'}
              </Button>
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
