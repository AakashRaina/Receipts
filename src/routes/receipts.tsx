import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
          <p className="text-sm text-muted-foreground">Upload UI lands in Phase 1.</p>
        </CardContent>
      </Card>
    </div>
  );
}
