import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { UploadReceiptDialog } from '@/components/upload-receipt-dialog';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/use-session';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  function handleUploaded() {
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['distinct-categories'] });
    queryClient.invalidateQueries({ queryKey: ['distinct-vendors'] });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/receipts" className="font-semibold">
            Receipts
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <UploadReceiptDialog onUploaded={handleUploaded}>
              <Button size="sm">Upload</Button>
            </UploadReceiptDialog>
            <span className="text-muted-foreground hidden sm:inline">
              {session?.user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
