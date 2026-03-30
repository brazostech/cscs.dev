/**
 * BookClubPage Component Tests
 *
 * Tests cover:
 * - Loading state
 * - Current book display
 * - Completed books grid
 * - Empty states
 * - Error handling
 * - Moderator actions
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookClubPage from "./BookClubPage";
import { createMockBook } from "../test/mocks";

// Mock pocketbase functions
const mockGetCurrentBook = vi.fn();
const mockGetCompletedBooks = vi.fn();
const mockGetBookCoverUrl = vi.fn();

vi.mock("../lib/pocketbase", () => ({
  getCurrentBook: (...args: unknown[]) => mockGetCurrentBook(...args),
  getCompletedBooks: (...args: unknown[]) => mockGetCompletedBooks(...args),
  getBookCoverUrl: (...args: unknown[]) => mockGetBookCoverUrl(...args),
}));

// Mock auth store
const mockUseAuth = vi.fn();

vi.mock("../stores/authStore", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("BookClubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentBook.mockResolvedValue(null);
    mockGetCompletedBooks.mockResolvedValue([]);
    mockGetBookCoverUrl.mockReturnValue(null);
    mockUseAuth.mockReturnValue({ user: null });
  });

  it("shows loading spinner initially", () => {
    // Keep the promises pending
    mockGetCurrentBook.mockReturnValue(new Promise(() => {}));
    mockGetCompletedBooks.mockReturnValue(new Promise(() => {}));

    render(<BookClubPage />);
    expect(screen.getByText("Loading books...")).toBeInTheDocument();
  });

  it("renders current book when available", async () => {
    const book = createMockBook({
      title: "Designing Data-Intensive Applications",
      author: "Martin Kleppmann",
      description: "A deep dive into distributed systems.",
      status: "reading",
    });
    mockGetCurrentBook.mockResolvedValue(book);

    render(<BookClubPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Designing Data-Intensive Applications"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("by Martin Kleppmann")).toBeInTheDocument();
    expect(
      screen.getByText("A deep dive into distributed systems."),
    ).toBeInTheDocument();
    expect(screen.getByText("Currently Reading")).toBeInTheDocument();
  });

  it("renders empty state when no current book", async () => {
    mockGetCurrentBook.mockResolvedValue(null);

    render(<BookClubPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/No book is currently being read/),
      ).toBeInTheDocument();
    });
  });

  it("renders completed books grid", async () => {
    const books = [
      createMockBook({
        title: "Book One",
        author: "Author One",
        description: "First book.",
        status: "completed",
        sort_order: 1,
      }),
      createMockBook({
        title: "Book Two",
        author: "Author Two",
        description: "Second book.",
        status: "completed",
        sort_order: 2,
      }),
    ];
    mockGetCompletedBooks.mockResolvedValue(books);

    render(<BookClubPage />);

    await waitFor(() => {
      expect(screen.getByText("Book One")).toBeInTheDocument();
    });
    expect(screen.getByText("Book Two")).toBeInTheDocument();
    expect(screen.getByText("by Author One")).toBeInTheDocument();
    expect(screen.getByText("by Author Two")).toBeInTheDocument();
    expect(screen.getByText("Books We've Read")).toBeInTheDocument();
  });

  it("does not show completed section when no completed books", async () => {
    mockGetCompletedBooks.mockResolvedValue([]);

    render(<BookClubPage />);

    await waitFor(() => {
      expect(screen.getByText("What We're About")).toBeInTheDocument();
    });
    expect(screen.queryByText("Books We've Read")).not.toBeInTheDocument();
  });

  it("handles API error gracefully", async () => {
    mockGetCurrentBook.mockRejectedValue(new Error("Network error"));

    render(<BookClubPage />);

    await waitFor(() => {
      expect(screen.getByText("Error loading books")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows manage books link for moderators", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", role: "moderator" },
    });

    render(<BookClubPage />);

    await waitFor(() => {
      expect(screen.getByText("Manage Books")).toBeInTheDocument();
    });
    expect(screen.getByText("Manage Books").closest("a")).toHaveAttribute(
      "href",
      "/app/books",
    );
  });

  it("hides manage books link for regular users", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", role: "user" },
    });

    render(<BookClubPage />);

    await waitFor(() => {
      expect(screen.getByText("What We're About")).toBeInTheDocument();
    });
    expect(screen.queryByText("Manage Books")).not.toBeInTheDocument();
  });

  it("renders purchase link when available", async () => {
    const book = createMockBook({
      title: "Test Book",
      author: "Test Author",
      status: "reading",
      purchase_link: "https://example.com/buy",
    });
    mockGetCurrentBook.mockResolvedValue(book);

    render(<BookClubPage />);

    await waitFor(() => {
      expect(screen.getByText("Find this book →")).toBeInTheDocument();
    });
  });

  it("renders cover image when available", async () => {
    const book = createMockBook({
      title: "Test Book",
      author: "Test Author",
      status: "reading",
      cover_image: "cover.jpg",
    });
    mockGetCurrentBook.mockResolvedValue(book);
    mockGetBookCoverUrl.mockReturnValue(
      "http://localhost:8080/api/files/pbc_books/123/cover.jpg",
    );

    render(<BookClubPage />);

    await waitFor(() => {
      const img = screen.getByAltText("Cover of Test Book");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        "http://localhost:8080/api/files/pbc_books/123/cover.jpg",
      );
    });
  });

  it("always renders static sections", async () => {
    render(<BookClubPage />);

    await waitFor(() => {
      expect(screen.getByText("Book Club")).toBeInTheDocument();
    });
    expect(screen.getByText("What We're About")).toBeInTheDocument();
    expect(screen.getByText("Interested in Joining?")).toBeInTheDocument();
    expect(screen.getByText("Read Our Blog")).toBeInTheDocument();
    expect(screen.getByText("Join Newsletter")).toBeInTheDocument();
  });
});
