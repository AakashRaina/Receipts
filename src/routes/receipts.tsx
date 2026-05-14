import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadReceiptDialog } from '@/components/upload-receipt-dialog';

export default function ReceiptsRoute() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Receipts</h1>
        <p className="text-muted-foreground text-sm">Your uploaded receipts will appear here.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No receipts yet</CardTitle>
          <CardDescription>Upload your first receipt to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadReceiptDialog>
            <Button>Upload a receipt</Button>
          </UploadReceiptDialog>
        </CardContent>
      </Card>
    </div>
  );
}
