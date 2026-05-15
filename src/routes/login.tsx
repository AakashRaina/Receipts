import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AuthForm } from '@/components/auth-form';

export default function LoginRoute() {
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Log in"
      description="Welcome back."
      submitLabel="Log in"
      loadingLabel="Logging in…"
      passwordAutoComplete="current-password"
      footer={
        <>
          No account?{' '}
          <Link to="/signup" className="text-foreground underline">
            Sign up
          </Link>
        </>
      }
      onSubmit={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return error.message;
        navigate('/receipts', { replace: true });
        return null;
      }}
    />
  );
}
