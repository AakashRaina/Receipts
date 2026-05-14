import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadReceiptDialog } from '@/components/upload-receipt-dialog';
import { ReceiptList } from '@/components/receipt-list';
import { useReceipts } from '@/lib/queries';

export default function ReceiptsRoute() {
  const queryClient = useQueryClient();
  const { data: rows, isPending, error } = useReceipts();

  function handleUploaded() {
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['distinct-categories'] });
    queryClient.invalidateQueries({ queryKey: ['distinct-vendors'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Receipts</h1>
          <p className="text-muted-foreground text-sm">
            {rows && rows.length > 0
              ? `${rows.length} receipt${rows.length === 1 ? '' : 's'}`
              : 'Your uploaded receipts will appear here.'}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">Couldn’t load receipts: {error.message}</p>
      )}

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isPending && rows && rows.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No receipts yet</CardTitle>
            <CardDescription>Upload your first receipt to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadReceiptDialog onUploaded={handleUploaded}>
              <Button>Upload a receipt</Button>
            </UploadReceiptDialog>
          </CardContent>
        </Card>
      )}

      {!isPending && rows && rows.length > 0 && <ReceiptList rows={rows} />}
    </div>
  );
}
