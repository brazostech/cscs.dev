import { useState } from 'react';
import { register, login } from '../lib/pocketbase';
import { Button } from './catalyst/button';
import { Field, Label } from './catalyst/fieldset';
import { Input } from './catalyst/input';
import { Text } from './catalyst/text';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Register the user
      await register({
        email,
        password,
        passwordConfirm,
        name: name || undefined,
      });

      // Automatically log them in after registration
      await login({ email, password });

      // Redirect to account page on success
      window.location.href = '/account';
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      setError(errorMessage);
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
        <Label>Name (optional)</Label>
        <Input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </Field>

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
          autoComplete="new-password"
          minLength={8}
        />
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Must be at least 8 characters
        </Text>
      </Field>

      <Field>
        <Label>Confirm Password</Label>
        <Input
          type="password"
          name="passwordConfirm"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          autoComplete="new-password"
          minLength={8}
        />
      </Field>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
