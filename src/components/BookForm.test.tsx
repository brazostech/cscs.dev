/**
 * BookForm Component Tests
 *
 * Tests cover:
 * - Form rendering (all fields present)
 * - Input handling
 * - Create submission
 * - Edit mode (loading existing book)
 * - Error handling
 * - Callbacks (onSuccess, onCancel)
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookForm from "./BookForm";
import { createMockBook } from "../test/mocks";

const { mockCreate, mockUpdate, mockGetOne, mockGetURL } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockGetOne: vi.fn(),
  mockGetURL: vi.fn(),
}));

vi.mock("../lib/pocketbase", () => ({
  pb: {
    collection: vi.fn(() => ({
      create: mockCreate,
      update: mockUpdate,
      getOne: mockGetOne,
    })),
    files: {
      getURL: mockGetURL,
    },
  },
}));

describe("BookForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockImplementation((data) =>
      Promise.resolve({ id: "new_book", ...data }),
    );
    mockUpdate.mockImplementation((id, data) =>
      Promise.resolve({ id, ...data }),
    );
    mockGetOne.mockRejectedValue(new Error("Not found"));
    mockGetURL.mockReturnValue("http://localhost:8080/cover.jpg");
  });

  describe("Form Rendering", () => {
    it("renders all form fields", () => {
      render(<BookForm />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/author/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/purchase link/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort order/i)).toBeInTheDocument();
    });

    it("shows Create Book button for new books", () => {
      render(<BookForm />);
      expect(
        screen.getByRole("button", { name: /create book/i }),
      ).toBeInTheDocument();
    });

    it("shows cancel button when onCancel provided", () => {
      render(<BookForm onCancel={() => {}} />);
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Input Handling", () => {
    it("updates title field on input", async () => {
      const user = userEvent.setup();
      render(<BookForm />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, "Test Book Title");

      expect(titleInput).toHaveValue("Test Book Title");
    });

    it("updates author field on input", async () => {
      const user = userEvent.setup();
      render(<BookForm />);

      const authorInput = screen.getByLabelText(/author/i);
      await user.clear(authorInput);
      await user.type(authorInput, "Test Author");

      expect(authorInput).toHaveValue("Test Author");
    });
  });

  describe("Create Mode", () => {
    it("submits form data for new book", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<BookForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/title/i), "New Book");
      await user.type(screen.getByLabelText(/author/i), "New Author");

      const submitBtn = screen.getByRole("button", { name: /create book/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      // Verify FormData was passed
      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(FormData);
      expect(callArg.get("title")).toBe("New Book");
      expect(callArg.get("author")).toBe("New Author");
    });
  });

  describe("Edit Mode", () => {
    it("loads existing book data", async () => {
      const book = createMockBook({
        title: "Existing Book",
        author: "Existing Author",
        description: "A description",
        status: "completed",
      });
      mockGetOne.mockResolvedValue(book);

      render(<BookForm bookId={book.id} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue("Existing Book");
      });
      expect(screen.getByLabelText(/author/i)).toHaveValue("Existing Author");
      expect(
        screen.getByRole("button", { name: /update book/i }),
      ).toBeInTheDocument();
    });

    it("submits update for existing book", async () => {
      const user = userEvent.setup();
      const book = createMockBook({
        title: "Existing Book",
        author: "Existing Author",
      });
      mockGetOne.mockResolvedValue(book);

      render(<BookForm bookId={book.id} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue("Existing Book");
      });

      const submitBtn = screen.getByRole("button", { name: /update book/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith(book.id, expect.any(FormData));
      });
    });
  });

  describe("Error Handling", () => {
    it("displays API errors", async () => {
      const user = userEvent.setup();
      mockCreate.mockRejectedValue(new Error("Validation failed"));

      render(<BookForm />);

      await user.type(screen.getByLabelText(/title/i), "Book");
      await user.type(screen.getByLabelText(/author/i), "Author");
      await user.click(screen.getByRole("button", { name: /create book/i }));

      await waitFor(() => {
        expect(screen.getByText("Validation failed")).toBeInTheDocument();
      });
    });

    it("displays error when loading book fails", async () => {
      mockGetOne.mockRejectedValue(new Error("Book not found"));

      render(<BookForm bookId="nonexistent" />);

      await waitFor(() => {
        expect(screen.getByText("Book not found")).toBeInTheDocument();
      });
    });
  });

  describe("Callbacks", () => {
    it("calls onSuccess after successful creation", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<BookForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/title/i), "Book");
      await user.type(screen.getByLabelText(/author/i), "Author");
      await user.click(screen.getByRole("button", { name: /create book/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it("calls onCancel when cancel button clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<BookForm onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
