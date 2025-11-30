import { useAuth } from '../stores/authStore';
import { logout } from '../lib/pocketbase';
import { Button } from './catalyst/button';
import { Heading, Subheading } from './catalyst/heading';
import { Text } from './catalyst/text';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from './catalyst/description-list';
import { Divider } from './catalyst/divider';
import { Badge } from './catalyst/badge';

export default function AccountDashboard() {
  const { user, isLoading } = useAuth();

  async function handleLogout() {
    await logout();
    window.location.href = '/';
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Text>Loading...</Text>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <Heading>Account Dashboard</Heading>
          {user.role && (
            <Badge color={user.role === 'moderator' ? 'indigo' : 'zinc'}>
              {user.role === 'moderator' ? 'Moderator' : 'User'}
            </Badge>
          )}
        </div>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage your account information and settings
        </Text>
      </div>

      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
        <Subheading>Profile Information</Subheading>

        <Divider className="my-6" />

        <DescriptionList>
          {user.name && (
            <>
              <DescriptionTerm>Name</DescriptionTerm>
              <DescriptionDetails>{user.name}</DescriptionDetails>
            </>
          )}

          <DescriptionTerm>Email</DescriptionTerm>
          <DescriptionDetails>{user.email}</DescriptionDetails>

          <DescriptionTerm>Account Status</DescriptionTerm>
          <DescriptionDetails>
            {user.verified ? (
              <span className="text-green-600 dark:text-green-400">Verified</span>
            ) : (
              <span className="text-yellow-600 dark:text-yellow-400">Not Verified</span>
            )}
          </DescriptionDetails>

          <DescriptionTerm>Member Since</DescriptionTerm>
          <DescriptionDetails>
            {new Date(user.created).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </DescriptionDetails>
        </DescriptionList>

        <Divider className="my-8" />

        <Button onClick={handleLogout} color="red">
          Sign Out
        </Button>
      </div>
    </div>
  );
}
