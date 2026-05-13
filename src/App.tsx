import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import LoginRoute from '@/routes/login';
import SignupRoute from '@/routes/signup';
import ReceiptsRoute from '@/routes/receipts';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />
      <Route
        path="/receipts"
        element={
          <RequireAuth>
            <AppShell>
              <ReceiptsRoute />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/receipts" replace />} />
    </Routes>
  );
}
