/**
 * VerifyEmail Component Tests
 *
 * Tests cover:
 * - A missing or empty token: the invalid-link state, and nothing requested
 * - A valid token: the loading state, then the verified state and its links
 * - A failing token: the failed state with fixed, status-based text (never the
 *   server's message) and its links
 * - A token is sent exactly as the URL decodes it, and never rendered
 * - Each state's title is the page's h1
 * - One confirm call per mount, including under StrictMode
 * - The auth store is left alone, and nothing is logged with console.log
 */

import { StrictMode } from "react";
import { ClientResponseError } from "pocketbase";
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

/** A failure as the PocketBase SDK throws it, with the server's own message. */
function serverError(status: number, message = "Server message.") {
  return new ClientResponseError({ status, response: { message } });
}

const LINK_INVALID_TEXT =
  "This verification link has expired or is invalid. Sign in to request a new verification email.";
const TRY_AGAIN_TEXT =
  "We couldn't verify your email right now. Please try again in a moment.";

function linkTargets(): Record<string, string | null> {
  return Object.fromEntries(
    screen
      .getAllByRole("link")
      .map((a) => [a.textContent, a.getAttribute("href")]),
  );
}

describe("VerifyEmail", () => {
  beforeEach(() => {
    // Only the local mocks: resetAllMocks would also wipe the global ones
    // (matchMedia, confirm, alert) that src/test/setup.ts installs.
    mockCollection.mockReset();
    mockConfirmVerification.mockReset();
    mockAuthStore.save.mockReset();
    mockAuthStore.clear.mockReset();
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

    it("uses the first token when the parameter is repeated", async () => {
      setSearch("?token=a&token=b");

      render(<VerifyEmail />);
      await screen.findByText("Email Verified!");

      expect(mockConfirmVerification).toHaveBeenCalledTimes(1);
      expect(mockConfirmVerification).toHaveBeenCalledWith("a");
    });

    it("survives unmounting while the confirm call is pending", async () => {
      setSearch("?token=abc");
      const pending = deferred<boolean>();
      mockConfirmVerification.mockReturnValue(pending.promise);

      const { unmount } = render(<VerifyEmail />);
      unmount();
      pending.resolve(true);
      await pending.promise;

      expect(mockConfirmVerification).toHaveBeenCalledTimes(1);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("survives unmounting while a failing confirm call is pending", async () => {
      setSearch("?token=abc");
      const pending = deferred<boolean>();
      mockConfirmVerification.mockReturnValue(pending.promise);

      const { unmount } = render(<VerifyEmail />);
      unmount();
      pending.reject(serverError(400));
      await pending.promise.catch(() => {});

      expect(screen.queryByText("Verification Failed")).toBeNull();
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
    it("shows the expired or invalid text for a 400, with links to sign in and go home", async () => {
      setSearch("?token=expired");
      mockConfirmVerification.mockRejectedValue(
        serverError(
          400,
          "An error occurred while validating the submitted data.",
        ),
      );

      render(<VerifyEmail />);

      expect(
        await screen.findByText("Verification Failed"),
      ).toBeInTheDocument();
      expect(screen.getByText(LINK_INVALID_TEXT)).toBeInTheDocument();
      expect(linkTargets()).toEqual({ "Sign In": "/login", "Go to Home": "/" });
      expect(screen.queryByText("Email Verified!")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it.each([
      ["a network failure (status 0)", () => serverError(0)],
      ["a rate limit (429)", () => serverError(429)],
      ["a server error (500)", () => serverError(500)],
      ["a plain Error", () => new Error("Server message.")],
      ["something that is not an Error", () => "Server message."],
    ])("shows the try-again text for %s", async (_name, makeFailure) => {
      setSearch("?token=abc");
      mockConfirmVerification.mockRejectedValue(makeFailure());

      render(<VerifyEmail />);

      expect(
        await screen.findByText("Verification Failed"),
      ).toBeInTheDocument();
      expect(screen.getByText(TRY_AGAIN_TEXT)).toBeInTheDocument();
      expect(screen.queryByText(LINK_INVALID_TEXT)).toBeNull();
      expect(linkTargets()).toEqual({ "Sign In": "/login", "Go to Home": "/" });
    });

    it.each([400, 0, 429, 500])(
      "never shows the server's message, for a %i",
      async (status) => {
        setSearch("?token=abc");
        mockConfirmVerification.mockRejectedValue(
          serverError(status, "Internal: users_tokenKey unique constraint"),
        );

        const { container } = render(<VerifyEmail />);
        await screen.findByText("Verification Failed");

        expect(container.textContent).not.toContain("Internal");
        expect(container.textContent).not.toContain("tokenKey");
      },
    );

    it("renders no markup from a server message", async () => {
      setSearch("?token=abc");
      mockConfirmVerification.mockRejectedValue(
        serverError(400, '<img src=x onerror="window.pwned=1"> & <b>bold</b>'),
      );

      const { container } = render(<VerifyEmail />);
      await screen.findByText("Verification Failed");

      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("b")).toBeNull();
      expect(container.textContent).not.toContain("onerror");
    });

    it("logs the real error once with console.error, and leaves the auth store alone", async () => {
      setSearch("?token=expired");
      const failure = serverError(400);
      mockConfirmVerification.mockRejectedValue(failure);

      render(<VerifyEmail />);
      await screen.findByText("Verification Failed");

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "Error verifying email:",
        failure,
      );
      expect(mockAuthStore.save).not.toHaveBeenCalled();
      expect(mockAuthStore.clear).not.toHaveBeenCalled();
    });
  });

  describe("the page heading", () => {
    it("is the one h1 in the missing-token state", () => {
      render(<VerifyEmail />);

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Invalid Verification Link",
        }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("heading")).toHaveLength(1);
    });

    it("is the one h1 in the verified state", async () => {
      setSearch("?token=abc");

      render(<VerifyEmail />);

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: "Email Verified!",
        }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("heading")).toHaveLength(1);
    });

    it("is the one h1 in the failed state", async () => {
      setSearch("?token=abc");
      mockConfirmVerification.mockRejectedValue(serverError(400));

      render(<VerifyEmail />);

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: "Verification Failed",
        }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("heading")).toHaveLength(1);
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

  describe("one confirm request", () => {
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
