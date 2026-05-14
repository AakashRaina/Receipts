import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import LoginRoute from '@/routes/login';
import SignupRoute from '@/routes/signup';
import ReceiptsRoute from '@/routes/receipts';
import ReceiptDetailRoute from '@/routes/receipt-detail';

function Authed({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />
      <Route path="/receipts" element={<Authed><ReceiptsRoute /></Authed>} />
      <Route path="/receipts/:id" element={<Authed><ReceiptDetailRoute /></Authed>} />
      <Route path="*" element={<Navigate to="/receipts" replace />} />
    </Routes>
  );
}
