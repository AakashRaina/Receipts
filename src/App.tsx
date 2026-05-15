import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';

const LoginRoute = lazy(() => import('@/routes/login'));
const SignupRoute = lazy(() => import('@/routes/signup'));
const ReceiptsRoute = lazy(() => import('@/routes/receipts'));
const ReceiptDetailRoute = lazy(() => import('@/routes/receipt-detail'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      Loading…
    </div>
  );
}

function Authed({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route path="/receipts" element={<Authed><ReceiptsRoute /></Authed>} />
        <Route path="/receipts/:id" element={<Authed><ReceiptDetailRoute /></Authed>} />
        <Route path="*" element={<Navigate to="/receipts" replace />} />
      </Routes>
    </Suspense>
  );
}
