import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Shared scaffolding for login + signup. The caller owns the actual auth call
// via `onSubmit`, which returns an error message string or null on success.
export function AuthForm({
  title,
  description,
  submitLabel,
  loadingLabel,
  passwordAutoComplete,
  passwordMinLength,
  footer,
  onSubmit,
}: {
  title: string;
  description: string;
  submitLabel: string;
  loadingLabel: string;
  passwordAutoComplete: 'current-password' | 'new-password';
  passwordMinLength?: number;
  footer: ReactNode;
  onSubmit: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const message = await onSubmit(email, password);
    setSubmitting(false);
    if (message) setError(message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={passwordAutoComplete}
                required
                minLength={passwordMinLength}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? loadingLabel : submitLabel}
            </Button>
            <p className="text-sm text-muted-foreground text-center">{footer}</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
