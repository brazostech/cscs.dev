import { useEffect, useRef, useState } from "react";
import {
  CalendarIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { pb } from "../lib/pocketbase";
import type { UserRecord } from "../lib/types";
import { useAuth } from "../stores/authStore";
import { Subheading } from "./catalyst/heading";
import { Notice, Spinner } from "./ListStates";

type ResendResult = "sent" | "failed" | null;

function VerifiedBanner() {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      <div className="flex items-center">
        <CheckIcon
          aria-hidden="true"
          className="h-5 w-5 text-green-600 dark:text-green-400"
        />
        <p className="ml-3 text-sm text-green-800 dark:text-green-200">
          Your email is verified
        </p>
      </div>
    </div>
  );
}

/** The warning for an unverified user, with the resend-verification action. */
function UnverifiedBanner({ user }: { user: UserRecord }) {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<ResendResult>(null);
  // State alone cannot stop two clicks that land before React re-renders.
  const isSendingRef = useRef(false);

  async function handleResend() {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    try {
      await pb.collection("users").requestVerification(user.email);
      // A sent email leaves the button disabled, as the old page did. Only a
      // failure (below) lets the user try again.
      setResult("sent");
    } catch {
      setResult("failed");
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-start">
          <div className="shrink-0">
            <ExclamationTriangleIcon
              aria-hidden="true"
              className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
            />
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Email Verification Required
            </h3>
            <div className="mt-2 text-sm wrap-anywhere text-yellow-700 dark:text-yellow-300">
              <p>
                Please verify your email address ({user.email}) to access full
                app features. Check your inbox for the verification email.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={isSending}
                className="text-sm font-medium text-yellow-800 underline hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-yellow-100"
              >
                {isSending
                  ? "Sending..."
                  : result === "failed"
                    ? "Resend Verification Email"
                    : "Resend verification email"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {result === "sent" && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          ✓ Verification email sent! Check your inbox.
        </p>
      )}
      {result === "failed" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Failed to send verification email. Please try again later.
        </p>
      )}
    </>
  );
}

/** The signed-in user's dashboard: email verification status and events. */
export default function AppDashboard() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // Same gate as before the port: no signed-in user means the login page.
  useEffect(() => {
    if (!isLoggedIn) {
      window.location.href = "/login";
    }
  }, [isLoggedIn]);

  if (!user) {
    return <Spinner label="Loading..." />;
  }

  return (
    <div className="space-y-8">
      {user.verified ? <VerifiedBanner /> : <UnverifiedBanner user={user} />}
      <div>
        <Subheading className="mb-4">My Upcoming Events</Subheading>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
          <Notice
            icon={
              <CalendarIcon
                aria-hidden="true"
                className="mx-auto h-12 w-12 text-zinc-400"
              />
            }
            title="No upcoming events"
            message={
              user.verified
                ? "Visit the Events page to RSVP to events."
                : "Verify your email to RSVP to events."
            }
          >
            {user.verified && (
              <a
                href="/app/events"
                className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Browse Events →
              </a>
            )}
          </Notice>
        </div>
      </div>
    </div>
  );
}
