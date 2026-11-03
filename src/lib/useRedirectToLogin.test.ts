/**
 * useRedirectToLogin Hook Tests
 *
 * Tests cover: a signed-out visitor is sent to /login, a signed-in one is
 * left alone, and a sign-out while the hook is mounted redirects.
 */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useRedirectToLogin } from "./useRedirectToLogin";

const START = "http://localhost:4321";

describe("useRedirectToLogin", () => {
  beforeEach(() => {
    window.location.href = START;
  });

  it("redirects a signed-out visitor to the login page", () => {
    renderHook(() => useRedirectToLogin(false));

    expect(window.location.href).toBe("/login");
  });

  it("leaves a signed-in user where they are", () => {
    renderHook(() => useRedirectToLogin(true));

    expect(window.location.href).toBe(START);
  });

  it("redirects when the user signs out while it is mounted", () => {
    const { rerender } = renderHook(
      ({ isLoggedIn }) => useRedirectToLogin(isLoggedIn),
      { initialProps: { isLoggedIn: true } },
    );
    expect(window.location.href).toBe(START);

    rerender({ isLoggedIn: false });

    expect(window.location.href).toBe("/login");
  });

  it("does not redirect again for a user who stays signed in", () => {
    const { rerender } = renderHook(
      ({ isLoggedIn }) => useRedirectToLogin(isLoggedIn),
      { initialProps: { isLoggedIn: true } },
    );

    rerender({ isLoggedIn: true });

    expect(window.location.href).toBe(START);
  });
});
