/**
 * VerifyEmail Component Tests
 *
 * Tests cover:
 * - A missing or empty token: the invalid-link state, and nothing requested
 * - A valid token: the loading state, then the verified state and its links
 * - A failing token: the failed state with the server message and its links
 * - Token and server text are rendered as text, never as markup, and the
 *   token is sent exactly as the URL decodes it
 * - One confirm call per mount, including under StrictMode
 * - The auth store is left alone, and nothing is logged with console.log
 */

import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import VerifyEmail from "./VerifyEmail";

const mockCollection = vi.fn();
const mockConfirmVerification = vi.fn();
const mockAuthStore = { save: vi.fn(), clear: vi.fn() };

vi.mock("../lib/pocketbase", () => ({
  pb: {
    collection: (...args: unknown[]) => mockCollection(...args),
    authStore: {
      save: (...args: unknown[]) => mockAuthStore.save(...args),
      clear: (...args: unknown[]) => mockAuthStore.clear(...args),
    },
  },
}));

function setSearch(search: string) {
  window.location.search = search;
}

/** A promise the test settles by hand, to observe the loading state. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function linkTargets(): Record<string, string | null> {
  return Object.fromEntries(
    screen
      .getAllByRole("link")
      .map((a) => [a.textContent, a.getAttribute("href")]),
  );
}

describe("VerifyEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setSearch("");
    mockCollection.mockReturnValue({
      confirmVerification: (...args: unknown[]) =>
        mockConfirmVerification(...args),
    });
    mockConfirmVerification.mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("without a token", () => {
    it("shows the invalid link state with a link to log in", () => {
      render(<VerifyEmail />);

      expect(screen.getByText("Invalid Verification Link")).toBeInTheDocument();
      expect(
        screen.getByText("The verification link is missing or invalid."),
      ).toBeInTheDocument();
      expect(linkTargets()).toEqual({ "Go to Login": "/login" });
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("requests nothing", () => {
      render(<VerifyEmail />);

      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockConfirmVerification).not.toHaveBeenCalled();
    });

    it("treats an empty token like a missing one", () => {
      setSearch("?token=");

      render(<VerifyEmail />);

      expect(screen.getByText("Invalid Verification Link")).toBeInTheDocument();
      expect(mockConfirmVerification).not.toHaveBeenCalled();
    });

    it("ignores other query parameters", () => {
      setSearch("?foo=bar&Token=abc");

      render(<VerifyEmail />);

      expect(screen.getByText("Invalid Verification Link")).toBeInTheDocument();
      expect(mockConfirmVerification).not.toHaveBeenCalled();
    });
  });

  describe("with a valid token", () => {
    it("shows the verifying state until the confirm call settles", async () => {
      setSearch("?token=abc.def");
      const pending = deferred<boolean>();
      mockConfirmVerification.mockReturnValue(pending.promise);

      render(<VerifyEmail />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Verifying your email...",
      );
      expect(screen.queryByText("Email Verified!")).toBeNull();
      expect(screen.queryByText("Verification Failed")).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();

      pending.resolve(true);
      expect(await screen.findByText("Email Verified!")).toBeInTheDocument();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("confirms the token against the users collection, once", async () => {
      setSearch("?token=abc.def-123_xyz");

      render(<VerifyEmail />);
      await screen.findByText("Email Verified!");

      expect(mockCollection).toHaveBeenCalledTimes(1);
      expect(mockCollection).toHaveBeenCalledWith("users");
      expect(mockConfirmVerification).toHaveBeenCalledTimes(1);
      expect(mockConfirmVerification).toHaveBeenCalledWith("abc.def-123_xyz");
    });

    it("shows the verified state with links to sign in and go home", async () => {
      setSearch("?token=abc");

      render(<VerifyEmail />);

      expect(await screen.findByText("Email Verified!")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Your email address has been successfully verified. You can now sign in to access all features.",
        ),
      ).toBeInTheDocument();
      expect(linkTargets()).toEqual({ "Sign In": "/login", "Go to Home": "/" });
      expect(screen.queryByText("Verification Failed")).toBeNull();
      expect(console.error).not.toHaveBeenCalled();
    });

    it("leaves the auth store alone, as the old page did", async () => {
      setSearch("?token=abc");

      render(<VerifyEmail />);
      await screen.findByText("Email Verified!");

      expect(mockAuthStore.save).not.toHaveBeenCalled();
      expect(mockAuthStore.clear).not.toHaveBeenCalled();
    });
  });

  describe("with a failing token", () => {
    it("shows the failed state with the server message and its links", async () => {
      setSearch("?token=expired");
      mockConfirmVerification.mockRejectedValue(
        new Error("Failed to authenticate."),
      );

      render(<VerifyEmail />);

      expect(
        await screen.findByText("Verification Failed"),
      ).toBeInTheDocument();
      expect(screen.getByText("Failed to authenticate.")).toBeInTheDocument();
      expect(linkTargets()).toEqual({
        "Sign In": "/login",
        "Register Again": "/register",
      });
      expect(screen.queryByText("Email Verified!")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("shows the fallback text when the failure is not an Error", async () => {
      setSearch("?token=expired");
      mockConfirmVerification.mockRejectedValue("boom");

      render(<VerifyEmail />);

      expect(
        await screen.findByText("Verification Failed"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "The verification link may have expired or is invalid. Please try requesting a new verification email.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText("boom")).toBeNull();
    });

    it("logs the failure with console.error, and leaves the auth store alone", async () => {
      setSearch("?token=expired");
      const failure = new Error("nope");
      mockConfirmVerification.mockRejectedValue(failure);

      render(<VerifyEmail />);
      await screen.findByText("Verification Failed");

      expect(console.error).toHaveBeenCalledWith(
        "Error verifying email:",
        failure,
      );
      expect(mockAuthStore.save).not.toHaveBeenCalled();
      expect(mockAuthStore.clear).not.toHaveBeenCalled();
    });

    it("renders a server message as text, never as markup", async () => {
      setSearch("?token=expired");
      mockConfirmVerification.mockRejectedValue(
        new Error('<img src=x onerror="window.pwned=1"> & <b>bold</b>'),
      );

      const { container } = render(<VerifyEmail />);
      await screen.findByText("Verification Failed");

      expect(
        screen.getByText('<img src=x onerror="window.pwned=1"> & <b>bold</b>'),
      ).toBeInTheDocument();
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("b")).toBeNull();
    });
  });

  describe("a token with special characters", () => {
    const rawToken = ` a b+c/d=e&f<script>alert(1)</script>"'%`;

    it("sends the URL-decoded token unchanged and renders no markup from it", async () => {
      setSearch(`?token=${encodeURIComponent(rawToken)}`);

      const { container } = render(<VerifyEmail />);
      await screen.findByText("Email Verified!");

      expect(mockConfirmVerification).toHaveBeenCalledWith(rawToken);
      expect(container.querySelector("script")).toBeNull();
      expect(container.innerHTML).not.toContain("alert(1)");
      expect(container.textContent).not.toContain(rawToken);
    });

    it("renders the failed state the same way for such a token", async () => {
      setSearch(`?token=${encodeURIComponent(rawToken)}`);
      mockConfirmVerification.mockRejectedValue(new Error("Failed."));

      const { container } = render(<VerifyEmail />);
      await screen.findByText("Verification Failed");

      expect(mockConfirmVerification).toHaveBeenCalledWith(rawToken);
      expect(container.querySelector("script")).toBeNull();
      expect(container.innerHTML).not.toContain("alert(1)");
    });
  });

  describe("single-use token", () => {
    it("confirms once when effects run twice, as under StrictMode", async () => {
      setSearch("?token=abc");

      render(
        <StrictMode>
          <VerifyEmail />
        </StrictMode>,
      );

      expect(await screen.findByText("Email Verified!")).toBeInTheDocument();
      expect(mockConfirmVerification).toHaveBeenCalledTimes(1);
    });

    it("shows the failure once, under StrictMode, when the one call fails", async () => {
      setSearch("?token=abc");
      mockConfirmVerification.mockRejectedValue(new Error("Failed."));

      render(
        <StrictMode>
          <VerifyEmail />
        </StrictMode>,
      );

      expect(
        await screen.findByText("Verification Failed"),
      ).toBeInTheDocument();
      expect(mockConfirmVerification).toHaveBeenCalledTimes(1);
    });

    it("does not confirm again when the component re-renders", async () => {
      setSearch("?token=abc");

      const { rerender } = render(<VerifyEmail />);
      await screen.findByText("Email Verified!");
      rerender(<VerifyEmail />);

      expect(mockConfirmVerification).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Email Verified!")).toBeInTheDocument();
    });

    it("confirms once per mount: a fresh mount is a new page load", async () => {
      setSearch("?token=abc");

      const first = render(<VerifyEmail />);
      await screen.findByText("Email Verified!");
      first.unmount();
      render(<VerifyEmail />);
      await screen.findByText("Email Verified!");

      expect(mockConfirmVerification).toHaveBeenCalledTimes(2);
    });
  });

  describe("logging", () => {
    it("never calls console.log, for any outcome", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      for (const [search, fail] of [
        ["", false],
        ["?token=ok", false],
        ["?token=bad", true],
      ] as const) {
        setSearch(search);
        mockConfirmVerification.mockReset();
        if (fail) {
          mockConfirmVerification.mockRejectedValue(new Error("no"));
        } else {
          mockConfirmVerification.mockResolvedValue(true);
        }
        const { unmount } = render(<VerifyEmail />);
        if (search) {
          await screen.findByText(/Email Verified!|Verification Failed/);
        }
        unmount();
      }

      expect(log).not.toHaveBeenCalled();
    });
  });
});
