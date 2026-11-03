import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useRedirectToLogin } from "../lib/useRedirectToLogin";
import type { UserRecord } from "../lib/types";
import { useAuth } from "../stores/authStore";
import { Notice, Spinner } from "./ListStates";

/**
 * Guards a page for users with `requiredRole`: send signed-out visitors to `/login`,
 * tell other users they lack permission, and render `children` only for a
 * matching user. The match is exact, so a moderator does not pass for
 * `requiredRole="user"`. It follows auth changes, so a sign-out or role change in the
 * open tab switches the view at once.
 *
 * This is a UX guard only. PocketBase's API rules are the real enforcement
 * (see "RBAC" in AGENTS.md); never rely on this for security. Wrap a whole
 * protected page in it so `children` never mount, and never fetch, for a user
 * who cannot use the page. Render it inside the page's React component, not
 * around a second `client:only` island in the `.astro` file: that island
 * would keep its own React root alive after the guard hides it.
 */
export default function RequireRole({
  requiredRole,
  children,
}: {
  requiredRole: UserRecord["role"];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  useRedirectToLogin(!!user);

  if (!user) {
    return <Spinner label="Loading..." />;
  }

  if (user.role !== requiredRole) {
    return (
      <Notice
        level={1}
        icon={
          <LockClosedIcon
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-zinc-400"
          />
        }
        title="You don't have permission"
        message="Your account doesn't have access to this page."
      >
        <a
          href="/app/events"
          className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Back to Events →
        </a>
      </Notice>
    );
  }

  return <>{children}</>;
}
