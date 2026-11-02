/**
 * AppDashboard Component Tests
 *
 * Tests cover:
 * - A verified user's confirmation and Browse Events link
 * - An unverified user's warning, their email and the placeholder text
 * - Resend verification: success, failure, retry and a double click
 * - User fields render as text, never as markup
 * - Logged-out redirect to the login page, with nothing requested
 * - No console logging
 */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AppDashboard from "./AppDashboard";
import { createMockModerator, createMockUser } from "../test/mocks";

const mockCollection = vi.fn();
const mockRequestVerification = vi.fn();

vi.mock("../lib/pocketbase", () => ({
  pb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

const mockUseAuth = vi.fn();

vi.mock("../stores/authStore", () => ({
  useAuth: () => mockUseAuth(),
}));

const RESEND_LABEL = "Resend verification email";

describe("AppDashboard", () => {
  const verified = createMockUser({ verified: true });
  const unverified = createMockUser({
    verified: false,
    email: "new.member@example.com",
  });

  beforeEach(() => {
    vi.resetAllMocks();
    window.location.href = "http://localhost:4321";
    mockCollection.mockReturnValue({
      requestVerification: (...args: unknown[]) =>
        mockRequestVerification(...args),
    });
    mockUseAuth.mockReturnValue({ user: verified });
    mockRequestVerification.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("a verified user", () => {
    it("sees that their email is verified, and no warning or resend action", () => {
      render(<AppDashboard />);

      expect(screen.getByText("Your email is verified")).toBeInTheDocument();
      expect(screen.queryByText("Email Verification Required")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("sees the events placeholder with a link to browse events", () => {
      render(<AppDashboard />);

      expect(
        screen.getByRole("heading", { name: "My Upcoming Events" }),
      ).toBeInTheDocument();
      expect(screen.getByText("No upcoming events")).toBeInTheDocument();
      expect(
        screen.getByText("Visit the Events page to RSVP to events."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Browse Events →" }),
      ).toHaveAttribute("href", "/app/events");
      expect(screen.queryByText(/Verify your email to RSVP/)).toBeNull();
    });

    it("sees the same dashboard as a moderator", () => {
      mockUseAuth.mockReturnValue({ user: createMockModerator() });

      render(<AppDashboard />);

      expect(screen.getByText("Your email is verified")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Browse Events →" }),
      ).toBeInTheDocument();
    });
  });

  describe("an unverified user", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: unverified });
    });

    it("sees the warning with their email and a resend button", () => {
      render(<AppDashboard />);

      expect(
        screen.getByRole("heading", { name: "Email Verification Required" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Please verify your email address (new.member@example.com) to access full app features. Check your inbox for the verification email.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: RESEND_LABEL })).toBeEnabled();
      expect(screen.queryByText("Your email is verified")).toBeNull();
    });

    it("sees the events placeholder without a link", () => {
      render(<AppDashboard />);

      expect(screen.getByText("No upcoming events")).toBeInTheDocument();
      expect(
        screen.getByText("Verify your email to RSVP to events."),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Visit the Events page/)).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();
    });
  });
  describe("resend verification", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: unverified });
    });

    it("requests verification for the user's email on the users collection", async () => {
      // Mixed case and padded, so a normalised copy would not match.
      const rawEmail = " New.Member@Example.com ";
      mockUseAuth.mockReturnValue({
        user: createMockUser({ verified: false, email: rawEmail }),
      });
      const user = userEvent.setup();
      render(<AppDashboard />);

      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      expect(mockCollection).toHaveBeenCalledTimes(1);
      expect(mockCollection).toHaveBeenCalledWith("users");
      expect(mockRequestVerification).toHaveBeenCalledTimes(1);
      expect(mockRequestVerification).toHaveBeenCalledWith(rawEmail);
    });

    it("disables the button and shows Sending... while the request is out", async () => {
      mockRequestVerification.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      render(<AppDashboard />);

      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      const button = screen.getByRole("button", { name: "Sending..." });
      expect(button).toBeDisabled();
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows the success message and leaves the button disabled, labelled Email sent", async () => {
      const user = userEvent.setup();
      render(<AppDashboard />);

      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      expect(await screen.findByRole("status")).toHaveTextContent(
        "✓ Verification email sent! Check your inbox.",
      );
      expect(screen.getByRole("button", { name: "Email sent" })).toBeDisabled();
      expect(screen.queryByText("Sending...")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(
        screen.queryByText(
          "Failed to send verification email. Please try again later.",
        ),
      ).toBeNull();
    });

    it("shows a fixed error message when sending fails, whatever the error says", async () => {
      mockRequestVerification.mockRejectedValue(new Error("SMTP exploded"));
      const user = userEvent.setup();
      render(<AppDashboard />);

      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Failed to send verification email. Please try again later.",
      );
      expect(screen.queryByText(/SMTP exploded/)).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("re-enables the button after a failure, relabelled, and a retry can succeed", async () => {
      mockRequestVerification
        .mockRejectedValueOnce("offline")
        .mockResolvedValueOnce(true);
      const user = userEvent.setup();
      render(<AppDashboard />);

      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));
      const retry = await screen.findByRole("button", {
        name: "Resend Verification Email",
      });
      expect(retry).toBeEnabled();

      await user.click(retry);

      expect(await screen.findByRole("status")).toHaveTextContent(
        "Verification email sent!",
      );
      expect(screen.queryByRole("alert")).toBeNull();
      expect(mockRequestVerification).toHaveBeenCalledTimes(2);
    });

    it("sends one request for a double click while the first is in flight", async () => {
      let resolve: (value: boolean) => void = () => {};
      mockRequestVerification.mockReturnValue(
        new Promise<boolean>((r) => {
          resolve = r;
        }),
      );
      const user = userEvent.setup();
      render(<AppDashboard />);

      await user.dblClick(screen.getByRole("button", { name: RESEND_LABEL }));
      expect(mockRequestVerification).toHaveBeenCalledTimes(1);

      await act(async () => resolve(true));
      expect(await screen.findByRole("status")).toBeInTheDocument();
      expect(mockRequestVerification).toHaveBeenCalledTimes(1);
    });

    it("starts afresh for a different account instead of keeping the last one's sent state", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AppDashboard />);
      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));
      await screen.findByRole("status");

      mockUseAuth.mockReturnValue({
        user: createMockUser({ verified: false, email: "other@example.com" }),
      });
      rerender(<AppDashboard />);

      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.getByRole("button", { name: RESEND_LABEL })).toBeEnabled();
    });

    it("keeps the sent state when auth re-emits the same account", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AppDashboard />);
      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));
      await screen.findByRole("status");

      // The same account in a new object, as an auth refresh would emit.
      mockUseAuth.mockReturnValue({
        user: { ...unverified, updated: "2030-01-01T00:00:00.000Z" },
      });
      rerender(<AppDashboard />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Verification email sent!",
      );
      expect(screen.getByRole("button", { name: "Email sent" })).toBeDisabled();
      expect(mockRequestVerification).toHaveBeenCalledTimes(1);
    });

    it("switches to the verified banner when the user becomes verified", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AppDashboard />);
      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));
      await screen.findByRole("status");

      mockUseAuth.mockReturnValue({ user: { ...unverified, verified: true } });
      rerender(<AppDashboard />);

      expect(screen.getByText("Your email is verified")).toBeInTheDocument();
      expect(screen.queryByText("Email Verification Required")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByText(/Verification email sent/)).toBeNull();
      expect(
        screen.getByRole("link", { name: "Browse Events →" }),
      ).toBeInTheDocument();
    });

    it("ignores a second click that lands before React re-renders", async () => {
      mockRequestVerification.mockReturnValue(new Promise(() => {}));
      render(<AppDashboard />);
      const button = screen.getByRole("button", { name: RESEND_LABEL });

      // Two clicks in one batch: the disabled attribute is not yet on the DOM.
      act(() => {
        button.click();
        button.click();
      });

      expect(mockRequestVerification).toHaveBeenCalledTimes(1);
    });
  });

  describe("user fields are escaped", () => {
    const payload = "<img src=x onerror=alert(1)>";

    it("renders markup in an unverified user's email as text", () => {
      mockUseAuth.mockReturnValue({
        user: createMockUser({ verified: false, email: payload }),
      });

      const { container } = render(<AppDashboard />);

      expect(container.querySelector("img")).toBeNull();
      expect(
        screen.getByText(
          `Please verify your email address (${payload}) to access full app features. Check your inbox for the verification email.`,
        ),
      ).toBeInTheDocument();
    });

    it("never renders a verified user's name or email as markup", () => {
      mockUseAuth.mockReturnValue({
        user: createMockUser({
          verified: true,
          name: payload,
          email: payload,
        }),
      });

      const { container } = render(<AppDashboard />);

      expect(container.querySelector("img")).toBeNull();
      expect(container.innerHTML).not.toContain("<img");
    });

    it("sends the raw email to PocketBase, not an escaped copy", async () => {
      mockUseAuth.mockReturnValue({
        user: createMockUser({ verified: false, email: payload }),
      });
      const user = userEvent.setup();
      render(<AppDashboard />);

      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      expect(mockRequestVerification).toHaveBeenCalledWith(payload);
    });
  });

  describe("logged out", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null });
    });

    it("redirects to the login page", () => {
      render(<AppDashboard />);

      expect(window.location.href).toBe("/login");
    });

    it("shows only the loading message and requests nothing", () => {
      render(<AppDashboard />);

      expect(screen.getByRole("status")).toHaveTextContent("Loading...");
      expect(screen.queryByText("No upcoming events")).toBeNull();
      expect(screen.queryByText("Your email is verified")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockRequestVerification).not.toHaveBeenCalled();
    });

    it("redirects when the user signs out while the dashboard is open", () => {
      mockUseAuth.mockReturnValue({ user: verified });
      const { rerender } = render(<AppDashboard />);
      expect(window.location.href).toBe("http://localhost:4321");
      expect(screen.getByText("Your email is verified")).toBeInTheDocument();

      mockUseAuth.mockReturnValue({ user: null });
      rerender(<AppDashboard />);

      expect(window.location.href).toBe("/login");
      expect(screen.queryByText("Your email is verified")).toBeNull();
      expect(screen.queryByText("No upcoming events")).toBeNull();
      expect(screen.getByRole("status")).toHaveTextContent("Loading...");
    });

    it("does not redirect a signed-in user", () => {
      mockUseAuth.mockReturnValue({ user: verified });

      render(<AppDashboard />);

      expect(window.location.href).toBe("http://localhost:4321");
    });
  });

  describe("logging", () => {
    it("never calls console.log, for any user or resend outcome", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      for (const outcome of ["verified", "sent", "failed", "logged-out"]) {
        mockRequestVerification.mockReset();
        if (outcome === "failed") {
          mockRequestVerification.mockRejectedValue(new Error("no"));
        } else {
          mockRequestVerification.mockResolvedValue(true);
        }
        mockUseAuth.mockReturnValue({
          user:
            outcome === "logged-out"
              ? null
              : outcome === "verified"
                ? verified
                : unverified,
        });
        const { unmount } = render(<AppDashboard />);
        if (outcome === "sent" || outcome === "failed") {
          // Two clicks in one batch, so the in-flight guard branch runs too.
          const button = screen.getByRole("button", { name: RESEND_LABEL });
          act(() => {
            button.click();
            button.click();
          });
          await screen.findByText(/Verification email sent|Failed to send/);
        }
        unmount();
      }

      expect(log).not.toHaveBeenCalled();
    });
  });
});
