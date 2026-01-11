/**
 * EventForm Component Tests
 *
 * Tests cover the following use cases:
 * - Core form behavior (rendering, input handling, validation)
 * - Recurrence feature (enable/disable, pattern selection, date preview)
 * - Edit mode (loading existing event, updating)
 * - Error handling (API failures, validation errors)
 * - Callbacks (onSuccess, onCancel)
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EventForm, {
  generateRecurringDates,
  generateSeriesId,
} from "./EventForm";
import { createMockEvent } from "../test/mocks";

// Mock the pocketbase module
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockGetOne = vi.fn();

vi.mock("../lib/pocketbase", () => ({
  pb: {
    collection: vi.fn(() => ({
      create: mockCreate,
      update: mockUpdate,
      getOne: mockGetOne,
    })),
  },
}));

describe("EventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementations
    mockCreate.mockImplementation((data) =>
      Promise.resolve({ id: "new_event", ...data }),
    );
    mockUpdate.mockImplementation((id, data) =>
      Promise.resolve({ id, ...data }),
    );
    mockGetOne.mockRejectedValue(new Error("Not found"));
  });

  // ============================================
  // Helper Functions Tests
  // ============================================

  describe("generateSeriesId", () => {
    it("generates unique IDs with series_ prefix", () => {
      const id1 = generateSeriesId();
      const id2 = generateSeriesId();

      expect(id1).toMatch(/^series_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^series_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("generateRecurringDates", () => {
    it("generates weekly dates with 7-day intervals", () => {
      const dates = generateRecurringDates("2026-01-01", "weekly", 4);

      expect(dates).toHaveLength(4);
      expect(dates).toEqual([
        "2026-01-01",
        "2026-01-08",
        "2026-01-15",
        "2026-01-22",
      ]);
    });

    it("generates biweekly dates with 14-day intervals", () => {
      const dates = generateRecurringDates("2026-01-01", "biweekly", 4);

      expect(dates).toHaveLength(4);
      expect(dates).toEqual([
        "2026-01-01",
        "2026-01-15",
        "2026-01-29",
        "2026-02-12",
      ]);
    });

    it("generates monthly dates correctly", () => {
      const dates = generateRecurringDates("2026-01-15", "monthly", 4);

      expect(dates).toHaveLength(4);
      expect(dates).toEqual([
        "2026-01-15",
        "2026-02-15",
        "2026-03-15",
        "2026-04-15",
      ]);
    });

    it("handles month boundary crossings for weekly pattern", () => {
      const dates = generateRecurringDates("2026-01-29", "weekly", 3);

      expect(dates).toEqual(["2026-01-29", "2026-02-05", "2026-02-12"]);
    });

    it("handles year boundary crossings", () => {
      const dates = generateRecurringDates("2026-12-15", "monthly", 3);

      expect(dates).toEqual(["2026-12-15", "2027-01-15", "2027-02-15"]);
    });

    it("generates single date when count is 1", () => {
      const dates = generateRecurringDates("2026-01-01", "weekly", 1);

      expect(dates).toHaveLength(1);
      expect(dates).toEqual(["2026-01-01"]);
    });
  });

  // ============================================
  // Core Form Rendering Tests
  // ============================================

  describe("Form Rendering", () => {
    it("renders all required form fields", () => {
      render(<EventForm />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^time \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/time zone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^location \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location details/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^type \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    });

    it("renders Create Event button for new event", () => {
      render(<EventForm />);

      expect(
        screen.getByRole("button", { name: /create event/i }),
      ).toBeInTheDocument();
    });

    it("shows recurrence checkbox for new events", () => {
      render(<EventForm />);

      expect(
        screen.getByLabelText(/create recurring event/i),
      ).toBeInTheDocument();
    });

    it("renders Cancel button when onCancel is provided", () => {
      const onCancel = vi.fn();
      render(<EventForm onCancel={onCancel} />);

      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it("does not render Cancel button when onCancel is not provided", () => {
      render(<EventForm />);

      expect(
        screen.queryByRole("button", { name: /cancel/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Form Input Tests
  // ============================================

  describe("Form Input Handling", () => {
    it("updates title field on input", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, "My Test Event");

      expect(titleInput).toHaveValue("My Test Event");
    });

    it("updates description field on input", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, "Event description");

      expect(descInput).toHaveValue("Event description");
    });

    it("updates date field on input", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      const dateInput = screen.getByLabelText(/date/i);
      await user.type(dateInput, "2026-03-15");

      expect(dateInput).toHaveValue("2026-03-15");
    });

    it("updates time zone select on change", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      const tzSelect = screen.getByLabelText(/time zone/i);
      await user.selectOptions(tzSelect, "EST");

      expect(tzSelect).toHaveValue("EST");
    });

    it("updates event type select on change", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      const typeSelect = screen.getByLabelText(/^type \*/i);
      await user.selectOptions(typeSelect, "book-club");

      expect(typeSelect).toHaveValue("book-club");
    });
  });

  // ============================================
  // Recurrence Feature Tests
  // ============================================

  describe("Recurrence Feature", () => {
    it("hides recurrence options by default", () => {
      render(<EventForm />);

      expect(screen.queryByLabelText(/repeat/i)).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/number of occurrences/i),
      ).not.toBeInTheDocument();
    });

    it("shows recurrence options when checkbox is checked", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      const checkbox = screen.getByLabelText(/create recurring event/i);
      await user.click(checkbox);

      expect(screen.getByLabelText(/repeat/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/number of occurrences/i),
      ).toBeInTheDocument();
    });

    it("changes date label to Start Date when recurrence enabled", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      // Initially shows "Date *"
      expect(screen.getByLabelText(/^date \*/i)).toBeInTheDocument();

      const checkbox = screen.getByLabelText(/create recurring event/i);
      await user.click(checkbox);

      // Now shows "Start Date *"
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    it("allows selecting recurrence pattern", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      await user.click(screen.getByLabelText(/create recurring event/i));

      const patternSelect = screen.getByLabelText(/repeat/i);
      await user.selectOptions(patternSelect, "biweekly");

      expect(patternSelect).toHaveValue("biweekly");
    });

    it("allows selecting number of occurrences", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      await user.click(screen.getByLabelText(/create recurring event/i));

      const occurrencesSelect = screen.getByLabelText(/number of occurrences/i);
      await user.selectOptions(occurrencesSelect, "8");

      expect(occurrencesSelect).toHaveValue("8");
    });

    it("shows date preview when date is entered and recurrence enabled", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      // Enable recurrence
      await user.click(screen.getByLabelText(/create recurring event/i));

      // Enter a start date
      const dateInput = screen.getByLabelText(/start date/i);
      await user.type(dateInput, "2026-01-15");

      // Should show preview text with date range
      expect(
        screen.getByText(/this will create 4 events/i),
      ).toBeInTheDocument();
      expect(screen.getByText("2026-01-15")).toBeInTheDocument();
    });

    it("updates button text to show number of events when recurrence enabled", async () => {
      const user = userEvent.setup();
      render(<EventForm />);

      await user.click(screen.getByLabelText(/create recurring event/i));

      expect(
        screen.getByRole("button", { name: /create 4 events/i }),
      ).toBeInTheDocument();
    });
  });

  // ============================================
  // Edit Mode Tests
  // ============================================

  describe("Edit Mode", () => {
    it("shows loading state when loading existing event", () => {
      mockGetOne.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      render(<EventForm eventId="existing_123" />);

      expect(screen.getByText(/loading event/i)).toBeInTheDocument();
    });

    it("loads existing event data into form", async () => {
      const mockEvent = createMockEvent({
        id: "existing_123",
        title: "Existing Event",
        description: "Existing description",
        date: "2026-05-20",
        time: "19:00",
        time_zone: "EST",
        location: "Conference Room",
        type: "book-club",
      });
      mockGetOne.mockResolvedValue(mockEvent);

      render(<EventForm eventId="existing_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue("Existing Event");
      });

      expect(screen.getByLabelText(/description/i)).toHaveValue(
        "Existing description",
      );
      expect(screen.getByLabelText(/date/i)).toHaveValue("2026-05-20");
      expect(screen.getByLabelText(/^time \*/i)).toHaveValue("19:00");
      expect(screen.getByLabelText(/time zone/i)).toHaveValue("EST");
      expect(screen.getByLabelText(/^location \*/i)).toHaveValue(
        "Conference Room",
      );
      expect(screen.getByLabelText(/^type \*/i)).toHaveValue("book-club");
    });

    it("hides recurrence options when editing existing event", async () => {
      const mockEvent = createMockEvent({ id: "existing_123" });
      mockGetOne.mockResolvedValue(mockEvent);

      render(<EventForm eventId="existing_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue(mockEvent.title);
      });

      expect(
        screen.queryByLabelText(/create recurring event/i),
      ).not.toBeInTheDocument();
    });

    it("shows Update Event button when editing", async () => {
      const mockEvent = createMockEvent({ id: "existing_123" });
      mockGetOne.mockResolvedValue(mockEvent);

      render(<EventForm eventId="existing_123" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /update event/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows error when event fails to load", async () => {
      mockGetOne.mockRejectedValue(new Error("Event not found"));

      render(<EventForm eventId="nonexistent_123" />);

      await waitFor(() => {
        expect(screen.getByText(/event not found/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Form Submission Tests
  // ============================================

  describe("Form Submission", () => {
    it("creates a single event when recurrence is disabled", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<EventForm onSuccess={onSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Single Event");
      await user.type(screen.getByLabelText(/date/i), "2026-03-15");
      await user.type(screen.getByLabelText(/^time \*/i), "18:00");
      await user.type(screen.getByLabelText(/^location \*/i), "Test Location");

      // Submit
      await user.click(screen.getByRole("button", { name: /create event/i }));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Single Event",
            date: "2026-03-15",
            time: "18:00",
            location: "Test Location",
          }),
        );
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it("creates multiple events with shared series_id when recurrence is enabled", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<EventForm onSuccess={onSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Recurring Event");
      await user.click(screen.getByLabelText(/create recurring event/i));
      await user.type(screen.getByLabelText(/start date/i), "2026-01-01");
      await user.type(screen.getByLabelText(/^time \*/i), "18:00");
      await user.type(screen.getByLabelText(/^location \*/i), "Test Location");

      // Select 4 occurrences (default)
      await user.click(
        screen.getByRole("button", { name: /create 4 events/i }),
      );

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(4);
      });

      // Verify all events have the same series_id
      const calls = mockCreate.mock.calls;
      const seriesIds = calls.map((call) => call[0].series_id);
      expect(new Set(seriesIds).size).toBe(1); // All same series_id
      expect(seriesIds[0]).toMatch(/^series_/);

      // Verify dates are correct (weekly by default)
      const dates = calls.map((call) => call[0].date);
      expect(dates).toEqual([
        "2026-01-01",
        "2026-01-08",
        "2026-01-15",
        "2026-01-22",
      ]);

      expect(onSuccess).toHaveBeenCalled();
    });

    it("updates existing event without creating new ones", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const mockEvent = createMockEvent({
        id: "existing_123",
        title: "Original Title",
      });
      mockGetOne.mockResolvedValue(mockEvent);

      render(<EventForm eventId="existing_123" onSuccess={onSuccess} />);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue("Original Title");
      });

      // Update title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");

      // Submit
      await user.click(screen.getByRole("button", { name: /update event/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith(
          "existing_123",
          expect.objectContaining({ title: "Updated Title" }),
        );
      });

      expect(mockCreate).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });

    it("disables submit button while loading", async () => {
      const user = userEvent.setup();
      // Make create hang indefinitely
      mockCreate.mockImplementation(() => new Promise(() => {}));

      render(<EventForm />);

      await user.type(screen.getByLabelText(/title/i), "Test Event");
      await user.type(screen.getByLabelText(/date/i), "2026-03-15");
      await user.type(screen.getByLabelText(/^time \*/i), "18:00");
      await user.type(screen.getByLabelText(/^location \*/i), "Test Location");

      const submitButton = screen.getByRole("button", {
        name: /create event/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent(/saving/i);
      });
    });

    it("shows progress indicator during batch creation", async () => {
      const user = userEvent.setup();
      let resolveCreate: (value: unknown) => void;

      // Make create resolve slowly to observe progress
      mockCreate.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );

      render(<EventForm />);

      await user.type(screen.getByLabelText(/title/i), "Recurring Event");
      await user.click(screen.getByLabelText(/create recurring event/i));
      await user.type(screen.getByLabelText(/start date/i), "2026-01-01");
      await user.type(screen.getByLabelText(/^time \*/i), "18:00");
      await user.type(screen.getByLabelText(/^location \*/i), "Test Location");

      await user.click(
        screen.getByRole("button", { name: /create 4 events/i }),
      );

      // Should show progress
      await waitFor(() => {
        expect(screen.getByText(/creating 0\/4/i)).toBeInTheDocument();
      });

      // Resolve first create
      resolveCreate!({ id: "1" });

      await waitFor(() => {
        expect(screen.getByText(/creating 1\/4/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe("Error Handling", () => {
    it("shows error message when create fails", async () => {
      const user = userEvent.setup();
      mockCreate.mockRejectedValue(new Error("Failed to create event"));

      render(<EventForm />);

      await user.type(screen.getByLabelText(/title/i), "Test Event");
      await user.type(screen.getByLabelText(/date/i), "2026-03-15");
      await user.type(screen.getByLabelText(/^time \*/i), "18:00");
      await user.type(screen.getByLabelText(/^location \*/i), "Test Location");

      await user.click(screen.getByRole("button", { name: /create event/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to create event/i)).toBeInTheDocument();
      });
    });

    it("shows error message when update fails", async () => {
      const user = userEvent.setup();
      const mockEvent = createMockEvent({ id: "existing_123" });
      mockGetOne.mockResolvedValue(mockEvent);
      mockUpdate.mockRejectedValue(new Error("Failed to update event"));

      render(<EventForm eventId="existing_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue(mockEvent.title);
      });

      await user.click(screen.getByRole("button", { name: /update event/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to update event/i)).toBeInTheDocument();
      });
    });

    it("re-enables submit button after error", async () => {
      const user = userEvent.setup();
      mockCreate.mockRejectedValue(new Error("API Error"));

      render(<EventForm />);

      await user.type(screen.getByLabelText(/title/i), "Test Event");
      await user.type(screen.getByLabelText(/date/i), "2026-03-15");
      await user.type(screen.getByLabelText(/^time \*/i), "18:00");
      await user.type(screen.getByLabelText(/^location \*/i), "Test Location");

      const submitButton = screen.getByRole("button", {
        name: /create event/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent(/create event/i);
      });
    });
  });

  // ============================================
  // Callback Tests
  // ============================================

  describe("Callbacks", () => {
    it("calls onSuccess after successful create", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      render(<EventForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/title/i), "Test Event");
      await user.type(screen.getByLabelText(/date/i), "2026-03-15");
      await user.type(screen.getByLabelText(/^time \*/i), "18:00");
      await user.type(screen.getByLabelText(/^location \*/i), "Test Location");

      await user.click(screen.getByRole("button", { name: /create event/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<EventForm onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("redirects to /app/events when no onSuccess provided", async () => {
      const user = userEvent.setup();

      render(<EventForm />);

      await user.type(screen.getByLabelText(/title/i), "Test Event");
      await user.type(screen.getByLabelText(/date/i), "2026-03-15");
      await user.type(screen.getByLabelText(/^time \*/i), "18:00");
      await user.type(screen.getByLabelText(/^location \*/i), "Test Location");

      await user.click(screen.getByRole("button", { name: /create event/i }));

      await waitFor(() => {
        expect(window.location.href).toBe("/app/events");
      });
    });
  });
});
