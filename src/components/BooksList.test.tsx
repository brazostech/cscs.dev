/**
 * BooksList Component Tests
 *
 * Tests cover:
 * - Loading, empty and error states
 * - Ordering, the collection queried and the fields each book shows
 * - Moderator-only Add, Edit and Delete controls, with the confirmation
 * - Book fields and error messages render as text, never as markup
 * - Logged-out redirect to the login page, with nothing fetched
 */

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BooksList from "./BooksList";
import type { BookRecord } from "../lib/types";
import {
  createMockBook,
  createMockModerator,
  createMockUser,
} from "../test/mocks";

const mockCollection = vi.fn();
const mockGetFullList = vi.fn();
const mockDelete = vi.fn();

vi.mock("../lib/pocketbase", () => ({
  pb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

const mockUseAuth = vi.fn();

vi.mock("../stores/authStore", () => ({
  useAuth: () => mockUseAuth(),
}));

/** The list item (a card) that holds a book's title. */
function cardFor(title: string): HTMLElement {
  const card = screen.getByText(title).closest("li");
  if (!card) throw new Error(`No card for ${title}`);
  return card;
}

describe("BooksList", () => {
  const member = createMockUser({ id: "user_member", role: "user" });
  const moderator = createMockModerator({ id: "user_mod" });

  beforeEach(() => {
    vi.resetAllMocks();
    window.location.href = "http://localhost:4321";
    mockCollection.mockReturnValue({
      getFullList: (...args: unknown[]) => mockGetFullList(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    });
    mockUseAuth.mockReturnValue({ user: member });
    mockGetFullList.mockResolvedValue([]);
    mockDelete.mockResolvedValue(true);
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.mocked(window.alert).mockReturnValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("states", () => {
    it("shows a loading message while books load", () => {
      mockGetFullList.mockReturnValue(new Promise(() => {}));

      render(<BooksList />);

      expect(screen.getByText("Loading books...")).toBeInTheDocument();
      expect(screen.queryByText("No books")).toBeNull();
    });

    it("shows the empty state when there are no books", async () => {
      render(<BooksList />);

      expect(await screen.findByText("No books")).toBeInTheDocument();
      expect(
        screen.getByText("No books have been added yet."),
      ).toBeInTheDocument();
      expect(screen.queryByText("Loading books...")).toBeNull();
    });

    it("shows the error message when loading books fails", async () => {
      mockGetFullList.mockRejectedValue(new Error("Network down"));

      render(<BooksList />);

      expect(
        await screen.findByText("Error loading books"),
      ).toBeInTheDocument();
      expect(screen.getByText("Network down")).toBeInTheDocument();
      expect(screen.queryByText("Loading books...")).toBeNull();
    });

    it("falls back to a generic message for a non-Error rejection", async () => {
      mockGetFullList.mockRejectedValue("boom");

      render(<BooksList />);

      expect(
        await screen.findByText("Failed to load books"),
      ).toBeInTheDocument();
    });
  });

  describe("book list", () => {
    it("queries the books collection sorted by status, newest first, and keeps that order", async () => {
      const first = createMockBook({ title: "First Book" });
      const second = createMockBook({ title: "Second Book" });
      mockGetFullList.mockResolvedValue([first, second]);

      render(<BooksList />);

      await screen.findByText("First Book");
      expect(mockCollection).toHaveBeenCalledTimes(1);
      expect(mockCollection).toHaveBeenCalledWith("books");
      expect(mockGetFullList).toHaveBeenCalledWith({
        sort: "status,-created",
      });
      const titles = screen
        .getAllByRole("listitem")
        .map((item) => within(item).getByRole("heading").textContent);
      expect(titles).toEqual(["First Book", "Second Book"]);
    });

    it("renders each book's details once", async () => {
      const book = createMockBook({
        title: "Designing Data-Intensive Applications",
        author: "Martin Kleppmann",
        description: "Reliable, scalable systems.",
        status: "reading",
        sort_order: 7,
      });
      mockGetFullList.mockResolvedValue([book]);

      render(<BooksList />);

      await screen.findByText("Designing Data-Intensive Applications");
      const card = within(cardFor("Designing Data-Intensive Applications"));
      expect(card.getByRole("heading")).toHaveTextContent(
        "Designing Data-Intensive Applications",
      );
      expect(card.getByText("by Martin Kleppmann")).toBeInTheDocument();
      expect(card.getByText("Reliable, scalable systems.")).toBeInTheDocument();
      expect(card.getByText("Order: 7")).toBeInTheDocument();
      expect(screen.getAllByText(book.title)).toHaveLength(1);
    });

    it("labels a reading book Reading and anything else Completed", async () => {
      mockGetFullList.mockResolvedValue([
        createMockBook({ title: "Now", status: "reading" }),
        createMockBook({ title: "Done", status: "completed" }),
      ]);

      render(<BooksList />);

      await screen.findByText("Now");
      const now = within(cardFor("Now"));
      expect(now.getByText("Reading")).toBeInTheDocument();
      expect(now.queryByText("Completed")).toBeNull();
      const done = within(cardFor("Done"));
      expect(done.getByText("Completed")).toBeInTheDocument();
      expect(done.queryByText("Reading")).toBeNull();
    });

    it("labels a book with an unknown or empty status Completed", async () => {
      mockGetFullList.mockResolvedValue([
        createMockBook({
          title: "Paused",
          status: "paused" as BookRecord["status"],
        }),
        createMockBook({
          title: "Unset",
          status: "" as BookRecord["status"],
        }),
      ]);

      render(<BooksList />);

      await screen.findByText("Paused");
      for (const title of ["Paused", "Unset"]) {
        const card = within(cardFor(title));
        expect(card.getByText("Completed")).toBeInTheDocument();
        expect(card.queryByText("Reading")).toBeNull();
      }
    });

    it("shows an order of 0 as 0", async () => {
      mockGetFullList.mockResolvedValue([
        createMockBook({ title: "First", sort_order: 0 }),
      ]);

      render(<BooksList />);

      await screen.findByText("First");
      expect(
        within(cardFor("First")).getByText("Order: 0"),
      ).toBeInTheDocument();
    });

    it("omits the description when the book has none", async () => {
      mockGetFullList.mockResolvedValue([
        createMockBook({
          title: "Bare",
          author: "Someone",
          description: "",
          sort_order: 5,
        }),
        createMockBook({
          title: "Described",
          author: "Another",
          description: "Has words.",
        }),
      ]);

      render(<BooksList />);

      await screen.findByText("Bare");
      // Nothing but the title, author, status and order: no stray text and no
      // "undefined" where the description would be.
      expect(cardFor("Bare")).toHaveTextContent(
        /^Bareby SomeoneCompletedOrder: 5$/,
      );
      expect(screen.getAllByText("Has words.")).toHaveLength(1);
      expect(
        within(cardFor("Described")).getByText("Has words."),
      ).toBeVisible();
    });

    it("renders long text unabridged", async () => {
      const long = "Supercalifragilistic".repeat(12);
      mockGetFullList.mockResolvedValue([
        createMockBook({ title: long, author: long, description: long }),
      ]);

      render(<BooksList />);

      await screen.findByRole("heading", { name: long });
      expect(screen.getByText(`by ${long}`)).toBeInTheDocument();
      expect(screen.getAllByText(long)).toHaveLength(2);
    });
  });

  describe("book fields are escaped", () => {
    it("renders markup in a title, author or description as text", async () => {
      const payload = "<img src=x onerror=alert(1)>";
      mockGetFullList.mockResolvedValue([
        createMockBook({
          title: payload,
          author: payload,
          description: payload,
        }),
      ]);

      const { container } = render(<BooksList />);

      await screen.findByRole("heading", { name: payload });
      expect(container.querySelector("img")).toBeNull();
      expect(screen.getByText(`by ${payload}`)).toBeInTheDocument();
      expect(screen.getAllByText(payload)).toHaveLength(2);
    });

    it("renders markup in a load error message as text", async () => {
      const payload = "<img src=x onerror=alert(1)>";
      mockGetFullList.mockRejectedValue(new Error(payload));

      const { container } = render(<BooksList />);

      expect(await screen.findByText(payload)).toBeInTheDocument();
      expect(container.querySelector("img")).toBeNull();
    });

    it("keeps markup in a book id out of the edit link's markup", async () => {
      mockUseAuth.mockReturnValue({ user: moderator });
      mockGetFullList.mockResolvedValue([
        createMockBook({ id: 'x"><script>', title: "Odd Id" }),
      ]);

      const { container } = render(<BooksList />);

      await screen.findByText("Odd Id");
      expect(container.querySelector("script")).toBeNull();
      expect(
        within(cardFor("Odd Id")).getByRole("link", { name: /^Edit:/ }),
      ).toHaveAttribute(
        "href",
        `/app/create-book?edit=${encodeURIComponent('x"><script>')}`,
      );
    });
  });

  describe("moderator controls", () => {
    it("hides Add, Edit and Delete from regular members", async () => {
      mockGetFullList.mockResolvedValue([createMockBook({ title: "Plain" })]);

      render(<BooksList />);
      await screen.findByText("Plain");

      expect(screen.queryByRole("link", { name: /add book/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /^Edit:/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Delete:/ })).toBeNull();
    });

    it("hides Add from members while the list is empty", async () => {
      render(<BooksList />);
      await screen.findByText("No books");

      expect(screen.queryByRole("link", { name: /add book/i })).toBeNull();
    });

    it("shows Add, Edit and Delete to moderators with the right links", async () => {
      mockUseAuth.mockReturnValue({ user: moderator });
      const book = createMockBook({ title: "Managed" });
      mockGetFullList.mockResolvedValue([book]);

      render(<BooksList />);
      await screen.findByText("Managed");

      expect(screen.getByRole("link", { name: /add book/i })).toHaveAttribute(
        "href",
        "/app/create-book",
      );
      const card = within(cardFor("Managed"));
      expect(card.getByRole("link", { name: "Edit: Managed" })).toHaveAttribute(
        "href",
        `/app/create-book?edit=${book.id}`,
      );
      expect(
        card.getByRole("button", { name: "Delete: Managed" }),
      ).toBeInTheDocument();
    });

    it("shows Add to moderators when there are no books", async () => {
      mockUseAuth.mockReturnValue({ user: moderator });

      render(<BooksList />);
      await screen.findByText("No books");

      expect(screen.getByRole("link", { name: /add book/i })).toHaveAttribute(
        "href",
        "/app/create-book",
      );
    });

    it("labels each control with its book's title", async () => {
      mockUseAuth.mockReturnValue({ user: moderator });
      mockGetFullList.mockResolvedValue([
        createMockBook({ title: "Alpha" }),
        createMockBook({ title: "Beta" }),
      ]);

      render(<BooksList />);
      await screen.findByText("Alpha");

      for (const title of ["Alpha", "Beta"]) {
        expect(
          screen.getByRole("link", { name: `Edit: ${title}` }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: `Delete: ${title}` }),
        ).toBeInTheDocument();
      }
    });

    it("deletes after confirmation and reloads the list", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      const keep = createMockBook({ title: "Keep" });
      const remove = createMockBook({ title: "Remove" });
      mockGetFullList
        .mockResolvedValueOnce([keep, remove])
        .mockResolvedValueOnce([keep]);

      render(<BooksList />);
      await screen.findByText("Remove");
      // Forget the initial load's collection calls so the assertions below pin
      // the collection the delete and the reload target.
      mockCollection.mockClear();

      await user.click(
        within(cardFor("Remove")).getByRole("button", { name: /^Delete:/ }),
      );

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete this book?",
      );
      expect(mockDelete).toHaveBeenCalledWith(remove.id);
      await waitFor(() => expect(screen.queryByText("Remove")).toBeNull());
      expect(screen.getByText("Keep")).toBeInTheDocument();
      expect(mockGetFullList).toHaveBeenCalledTimes(2);
      expect(mockGetFullList).toHaveBeenLastCalledWith({
        sort: "status,-created",
      });
      expect(mockCollection.mock.calls).toEqual([["books"], ["books"]]);
    });

    it("shows the empty state after deleting the last book", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      mockGetFullList
        .mockResolvedValueOnce([createMockBook({ title: "Last" })])
        .mockResolvedValueOnce([]);

      render(<BooksList />);
      await screen.findByText("Last");

      await user.click(screen.getByRole("button", { name: /^Delete:/ }));

      expect(await screen.findByText("No books")).toBeInTheDocument();
    });

    it("ignores a slow earlier reload that resolves after a newer one", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      const a = createMockBook({ title: "Book A" });
      const b = createMockBook({ title: "Book B" });
      const c = createMockBook({ title: "Book C" });
      let releaseA: (books: BookRecord[]) => void = () => {};
      mockGetFullList
        .mockResolvedValueOnce([a, b, c])
        // Reload after deleting A: held, and it still lists B.
        .mockReturnValueOnce(
          new Promise<BookRecord[]>((resolve) => {
            releaseA = resolve;
          }),
        )
        // Reload after deleting B: arrives first.
        .mockResolvedValueOnce([c]);

      render(<BooksList />);
      await screen.findByText("Book A");

      await user.click(
        within(cardFor("Book A")).getByRole("button", { name: /^Delete:/ }),
      );
      await waitFor(() => expect(mockGetFullList).toHaveBeenCalledTimes(2));
      await user.click(
        within(cardFor("Book B")).getByRole("button", { name: /^Delete:/ }),
      );
      await waitFor(() => expect(screen.queryByText("Book B")).toBeNull());

      // Resolve A's stale reload and let React flush it.
      await act(async () => {
        releaseA([b, c]);
      });

      expect(screen.queryByText("Book B")).toBeNull();
      expect(screen.queryByText("Book A")).toBeNull();
      expect(screen.getByText("Book C")).toBeInTheDocument();
    });

    it("does not delete when the confirmation is declined", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      vi.mocked(window.confirm).mockReturnValue(false);
      mockGetFullList.mockResolvedValue([createMockBook({ title: "Safe" })]);

      render(<BooksList />);
      await screen.findByText("Safe");

      await user.click(
        within(cardFor("Safe")).getByRole("button", { name: /^Delete:/ }),
      );

      expect(window.confirm).toHaveBeenCalledTimes(1);
      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockGetFullList).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Safe")).toBeInTheDocument();
    });

    it("disables only the clicked Delete while the request is in flight", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      let resolve: (value: unknown) => void = () => {};
      mockGetFullList.mockResolvedValue([
        createMockBook({ title: "Once" }),
        createMockBook({ title: "Other" }),
      ]);
      mockDelete.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );

      render(<BooksList />);
      await screen.findByText("Once");
      const card = within(cardFor("Once"));

      await user.click(card.getByRole("button", { name: /^Delete:/ }));
      expect(card.getByRole("button", { name: /^Delete:/ })).toBeDisabled();
      expect(
        within(cardFor("Other")).getByRole("button", { name: /^Delete:/ }),
      ).toBeEnabled();

      resolve(true);
      await waitFor(() =>
        expect(card.getByRole("button", { name: /^Delete:/ })).toBeEnabled(),
      );
    });

    it("alerts and keeps the book when the delete fails", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      mockGetFullList.mockResolvedValue([createMockBook({ title: "Stuck" })]);
      mockDelete.mockRejectedValue(new Error("Forbidden"));

      render(<BooksList />);
      await screen.findByText("Stuck");

      await user.click(
        within(cardFor("Stuck")).getByRole("button", { name: /^Delete:/ }),
      );

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          "Failed to delete book: Forbidden",
        ),
      );
      expect(screen.getByText("Stuck")).toBeInTheDocument();
      expect(mockGetFullList).toHaveBeenCalledTimes(1);
      expect(
        within(cardFor("Stuck")).getByRole("button", { name: /^Delete:/ }),
      ).toBeEnabled();
    });

    it("shows the error panel, not an alert, when the reload after a delete fails", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      mockGetFullList
        .mockResolvedValueOnce([
          createMockBook({ title: "Gone" }),
          createMockBook({ title: "Other" }),
        ])
        .mockRejectedValueOnce(new Error("Reload failed"));

      render(<BooksList />);
      await screen.findByText("Gone");

      await user.click(
        within(cardFor("Gone")).getByRole("button", { name: /^Delete:/ }),
      );

      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByText("Error loading books"),
      ).toBeInTheDocument();
      expect(screen.getByText("Reload failed")).toBeInTheDocument();
      expect(screen.queryByRole("list")).toBeNull();
      expect(window.alert).not.toHaveBeenCalled();
    });

    it("keeps the first Delete disabled when a second delete finishes", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      const resolvers: Record<string, (value: unknown) => void> = {};
      const a = createMockBook({ title: "Book A" });
      const b = createMockBook({ title: "Book B" });
      mockGetFullList.mockResolvedValue([a, b]);
      mockDelete.mockImplementation(
        (id: string) =>
          new Promise((resolve) => {
            resolvers[id] = resolve;
          }),
      );

      render(<BooksList />);
      await screen.findByText("Book A");

      await user.click(
        within(cardFor("Book A")).getByRole("button", { name: /^Delete:/ }),
      );
      await user.click(
        within(cardFor("Book B")).getByRole("button", { name: /^Delete:/ }),
      );
      expect(
        within(cardFor("Book A")).getByRole("button", { name: /^Delete:/ }),
      ).toBeDisabled();
      expect(
        within(cardFor("Book B")).getByRole("button", { name: /^Delete:/ }),
      ).toBeDisabled();

      resolvers[b.id](true);

      await waitFor(() =>
        expect(
          within(cardFor("Book B")).getByRole("button", { name: /^Delete:/ }),
        ).toBeEnabled(),
      );
      expect(
        within(cardFor("Book A")).getByRole("button", { name: /^Delete:/ }),
      ).toBeDisabled();
    });

    it("alerts with a generic message when the delete rejects a non-Error", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      mockGetFullList.mockResolvedValue([createMockBook({ title: "Odd" })]);
      mockDelete.mockRejectedValue("nope");

      render(<BooksList />);
      await screen.findByText("Odd");

      await user.click(screen.getByRole("button", { name: /^Delete:/ }));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          "Failed to delete book: Unknown error",
        ),
      );
    });
  });

  describe("auth gating", () => {
    it("sends a logged-out visitor to the login page and fetches nothing", async () => {
      mockUseAuth.mockReturnValue({ user: null });

      render(<BooksList />);

      await waitFor(() => expect(window.location.href).toBe("/login"));
      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockGetFullList).not.toHaveBeenCalled();
      expect(screen.queryByRole("list")).toBeNull();
    });

    it("stays on the page for a signed-in member", async () => {
      render(<BooksList />);

      await screen.findByText("No books");
      expect(window.location.href).toBe("http://localhost:4321");
    });
  });
});
