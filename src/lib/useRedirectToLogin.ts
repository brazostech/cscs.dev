import { useEffect } from "react";

/**
 * Send a signed-out visitor to `/login`, and again whenever `isLoggedIn`
 * turns false (such as a sign-out from another tab). Pages that load data
 * also check `isLoggedIn` before they fetch; `RequireRole` uses this for the
 * pages that only gate on a role.
 */
export function useRedirectToLogin(isLoggedIn: boolean): void {
  useEffect(() => {
    if (!isLoggedIn) {
      window.location.href = "/login";
    }
  }, [isLoggedIn]);
}
