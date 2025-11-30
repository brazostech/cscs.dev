import { useState } from 'react';
import { login } from '../lib/pocketbase';
import { Button } from './catalyst/button';
import { Field, Label } from './catalyst/fieldset';
import { Input } from './catalyst/input';
import { Text } from './catalyst/text';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      // Redirect to account page on success
      window.location.href = '/account';
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to login. Please check your credentials.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
        </div>
      )}

      <Field>
        <Label>Email</Label>
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </Field>

      <Field>
        <Label>Password</Label>
        <Input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </Field>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
