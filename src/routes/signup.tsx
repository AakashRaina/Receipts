import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AuthForm } from '@/components/auth-form';

export default function SignupRoute() {
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Sign up"
      description="Create an account to start uploading receipts."
      submitLabel="Sign up"
      loadingLabel="Creating account…"
      passwordAutoComplete="new-password"
      passwordMinLength={6}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-foreground underline">
            Log in
          </Link>
        </>
      }
      onSubmit={async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return error.message;
        if (!data.session) {
          return 'Account created but no session returned — confirm email verification is disabled in Supabase.';
        }
        navigate('/receipts', { replace: true });
        return null;
      }}
    />
  );
}
