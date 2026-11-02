/**
 * RequireRole Component Tests
 *
 * Tests cover:
 * - The guard's three states: signed out, wrong role, right role
 * - Children never mount, so never fetch, unless the role matches
 * - A role change or sign-out in the open tab switches the view
 * - The create-event and create-book form wrappers behind the guard
 */

import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookFormWrapper from "./BookFormWrapper";
import EventFormWrapper from "./EventFormWrapper";
import RequireRole from "./RequireRole";
import { createMockModerator, createMockUser } from "../test/mocks";

const { mockCollection, mockGetOne, mockUseAuth, mockMounted, mockUnmounted } =
  vi.hoisted(() => ({
    mockCollection: vi.fn(),
    mockGetOne: vi.fn(),
    mockUseAuth: vi.fn(),
    mockMounted: vi.fn(),
    mockUnmounted: vi.fn(),
  }));

vi.mock("../lib/pocketbase", () => ({
  pb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

vi.mock("../stores/authStore", () => ({
  useAuth: () => mockUseAuth(),
}));

/** Stands in for a protected page: records that it mounted and unmounted. */
function Secret() {
  useEffect(() => {
    mockMounted();
    return () => mockUnmounted();
  }, []);
  return <p>Secret page</p>;
}

function guarded() {
  return (
    <RequireRole requiredRole="moderator">
      <Secret />
    </RequireRole>
  );
}

const SIGNED_OUT = { user: null };

describe("RequireRole", () => {
  const moderator = createMockModerator();
  const member = createMockUser({ role: "user" });

  beforeEach(() => {
    vi.resetAllMocks();
    window.location.href = "http://localhost:4321";
    window.location.search = "";
    mockUseAuth.mockReturnValue({ user: moderator });
    mockCollection.mockReturnValue({ getOne: mockGetOne });
    mockGetOne.mockResolvedValue({});
  });

  describe("signed out", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(SIGNED_OUT);
    });

    it("redirects to the login page", () => {
      render(guarded());

      expect(window.location.href).toBe("/login");
    });

    it("renders only the loading message, mounts nothing and requests nothing", () => {
      render(guarded());

      expect(screen.getByRole("status")).toHaveTextContent("Loading...");
      expect(screen.queryByText("Secret page")).toBeNull();
      expect(screen.queryByText(/permission/i)).toBeNull();
      expect(mockMounted).not.toHaveBeenCalled();
      expect(mockCollection).not.toHaveBeenCalled();
    });
  });

  describe("signed in without the role", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: member });
    });

    it("tells the user they lack permission, as the page heading", () => {
      render(guarded());

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "You don't have permission",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Your account doesn't have access to this page."),
      ).toBeInTheDocument();
    });

    it("links back to the events page", () => {
      render(guarded());

      expect(
        screen.getByRole("link", { name: "Back to Events →" }),
      ).toHaveAttribute("href", "/app/events");
    });

    it("does not redirect, and mounts no children", () => {
      render(guarded());

      expect(window.location.href).toBe("http://localhost:4321");
      expect(screen.queryByText("Secret page")).toBeNull();
      expect(mockMounted).not.toHaveBeenCalled();
    });

    it("matches the role exactly, so a moderator is refused a user-only page", () => {
      mockUseAuth.mockReturnValue({ user: moderator });

      render(
        <RequireRole requiredRole="user">
          <Secret />
        </RequireRole>,
      );

      expect(screen.getByText("You don't have permission")).toBeInTheDocument();
      expect(screen.queryByText("Secret page")).toBeNull();
    });
  });

  describe("signed in with the role", () => {
    it("renders the children, with no notice and no redirect", () => {
      render(guarded());

      expect(screen.getByText("Secret page")).toBeInTheDocument();
      expect(screen.queryByText(/permission/i)).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
      expect(window.location.href).toBe("http://localhost:4321");
    });
  });

  describe("auth changes while the page is open", () => {
    it("redirects and unmounts the children when the user signs out", () => {
      const { rerender } = render(guarded());
      expect(screen.getByText("Secret page")).toBeInTheDocument();
      expect(window.location.href).toBe("http://localhost:4321");

      mockUseAuth.mockReturnValue(SIGNED_OUT);
      rerender(guarded());

      expect(window.location.href).toBe("/login");
      expect(screen.queryByText("Secret page")).toBeNull();
      expect(mockUnmounted).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("status")).toHaveTextContent("Loading...");
    });

    it("swaps the children for the notice when the role is lost", () => {
      const { rerender } = render(guarded());
      expect(screen.getByText("Secret page")).toBeInTheDocument();

      mockUseAuth.mockReturnValue({ user: { ...moderator, role: "user" } });
      rerender(guarded());

      expect(screen.queryByText("Secret page")).toBeNull();
      expect(mockUnmounted).toHaveBeenCalledTimes(1);
      expect(screen.getByText("You don't have permission")).toBeInTheDocument();
      expect(window.location.href).toBe("http://localhost:4321");
    });

    it("shows the children when the role is gained", () => {
      mockUseAuth.mockReturnValue({ user: member });
      const { rerender } = render(guarded());
      expect(screen.queryByText("Secret page")).toBeNull();
      expect(mockMounted).not.toHaveBeenCalled();

      mockUseAuth.mockReturnValue({ user: { ...member, role: "moderator" } });
      rerender(guarded());

      expect(screen.getByText("Secret page")).toBeInTheDocument();
      expect(screen.queryByText("You don't have permission")).toBeNull();
      expect(mockMounted).toHaveBeenCalledTimes(1);
    });

    it("keeps the children mounted when the same moderator's record updates", () => {
      const { rerender } = render(guarded());

      mockUseAuth.mockReturnValue({
        user: { ...moderator, name: "Renamed", updated: "later" },
      });
      rerender(guarded());

      expect(screen.getByText("Secret page")).toBeInTheDocument();
      expect(mockMounted).toHaveBeenCalledTimes(1);
      expect(mockUnmounted).not.toHaveBeenCalled();
    });
  });

  describe("the create pages (the form wrappers carry the guard)", () => {
    const pages = [
      {
        name: "create-event",
        collection: "events",
        heading: "Create Event",
        editHeading: "Edit Event",
        wrapper: <EventFormWrapper />,
      },
      {
        name: "create-book",
        collection: "books",
        heading: "Add Book",
        editHeading: "Edit Book",
        wrapper: <BookFormWrapper />,
      },
    ];

    describe.each(pages)("$name", (page) => {
      it("shows a moderator the empty form", () => {
        render(page.wrapper);

        expect(
          screen.getByRole("heading", { level: 1, name: page.heading }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
        expect(mockGetOne).not.toHaveBeenCalled();
      });

      it("loads the record to edit for a moderator", () => {
        window.location.search = "?edit=rec123";

        render(page.wrapper);

        expect(
          screen.getByRole("heading", { level: 1, name: page.editHeading }),
        ).toBeInTheDocument();
        expect(mockCollection).toHaveBeenCalledWith(page.collection);
        expect(mockGetOne).toHaveBeenCalledWith("rec123");
      });

      it("logs nothing to the console", () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});
        window.location.search = "?edit=rec123";

        render(page.wrapper);

        expect(log).not.toHaveBeenCalled();
        log.mockRestore();
      });

      it("shows a normal user the notice, no form and no data request", () => {
        mockUseAuth.mockReturnValue({ user: member });
        window.location.search = "?edit=rec123";

        render(page.wrapper);

        expect(
          screen.getByRole("heading", {
            level: 1,
            name: "You don't have permission",
          }),
        ).toBeInTheDocument();
        expect(screen.queryByLabelText(/title/i)).toBeNull();
        expect(
          screen.queryByRole("heading", { name: page.heading }),
        ).toBeNull();
        expect(mockCollection).not.toHaveBeenCalled();
        expect(mockGetOne).not.toHaveBeenCalled();
      });

      it("sends a signed-out visitor to the login page with no form and no data request", () => {
        mockUseAuth.mockReturnValue(SIGNED_OUT);
        window.location.search = "?edit=rec123";

        render(page.wrapper);

        expect(window.location.href).toBe("/login");
        expect(screen.queryByLabelText(/title/i)).toBeNull();
        expect(mockCollection).not.toHaveBeenCalled();
        expect(mockGetOne).not.toHaveBeenCalled();
      });
    });
  });
});
