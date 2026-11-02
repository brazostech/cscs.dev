import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { pb } from "../lib/pocketbase";
import { Button } from "./catalyst/button";
import { Notice, Spinner, errorMessage } from "./ListStates";

/** Shown when the request fails with something that is not an `Error`. */
const FAILED_FALLBACK =
  "The verification link may have expired or is invalid. Please try requesting a new verification email.";

type Outcome = { status: "verified" } | { status: "failed"; message: string };

/** The `token` query parameter, URL-decoded; null when absent, "" when empty. */
function readToken(): string | null {
  return new URLSearchParams(window.location.search).get("token");
}

function StatusIcon({
  tone,
  children,
}: {
  tone: "green" | "red";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === "green"
          ? "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          : "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      }
    >
      {children}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      {children}
    </div>
  );
}

/**
 * The `/verify-email` page body: confirms the `?token=` from the email link
 * once, then shows the verified, failed or missing-token state. Reads
 * `window.location` while rendering, so render it with `client:only="react"`.
 */
export default function VerifyEmail() {
  // Read once: the page never navigates, and the token is single-use.
  const [token] = useState(readToken);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Confirming consumes the token, so a second call would fail a link that
  // worked. Astro does not wrap islands in StrictMode, but anything that
  // double-runs effects (StrictMode in a wrapper, Storybook) must not resend.
  // Refs survive StrictMode's simulated remount; do not cancel on cleanup, or
  // the first call's result would be dropped and the second never made.
  const hasConfirmed = useRef(false);

  useEffect(() => {
    if (!token || hasConfirmed.current) return;
    hasConfirmed.current = true;
    pb.collection("users")
      .confirmVerification(token)
      .then(() => setOutcome({ status: "verified" }))
      .catch((err: unknown) => {
        console.error("Error verifying email:", err);
        setOutcome({
          status: "failed",
          message: errorMessage(err, FAILED_FALLBACK),
        });
      });
  }, [token]);

  if (!token) {
    return (
      <Notice
        icon={
          <StatusIcon tone="red">
            <XMarkIcon aria-hidden="true" className="h-8 w-8" />
          </StatusIcon>
        }
        title="Invalid Verification Link"
        message="The verification link is missing or invalid."
      >
        <div className="mt-8">
          <Button href="/login" color="indigo">
            Go to Login
          </Button>
        </div>
      </Notice>
    );
  }

  if (!outcome) {
    return <Spinner label="Verifying your email..." />;
  }

  if (outcome.status === "verified") {
    return (
      <Notice
        icon={
          <StatusIcon tone="green">
            <CheckIcon aria-hidden="true" className="h-8 w-8" />
          </StatusIcon>
        }
        title="Email Verified!"
        message="Your email address has been successfully verified. You can now sign in to access all features."
      >
        <Actions>
          <Button href="/login" color="indigo">
            Sign In
          </Button>
          <Button href="/" outline>
            Go to Home
          </Button>
        </Actions>
      </Notice>
    );
  }

  return (
    <Notice
      icon={
        <StatusIcon tone="red">
          <ExclamationTriangleIcon aria-hidden="true" className="h-8 w-8" />
        </StatusIcon>
      }
      title="Verification Failed"
      message={outcome.message}
    >
      <Actions>
        <Button href="/login" color="indigo">
          Sign In
        </Button>
        <Button href="/register" outline>
          Register Again
        </Button>
      </Actions>
    </Notice>
  );
}
