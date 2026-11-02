/**
 * EventsList Component Tests
 *
 * Tests cover:
 * - Loading, empty and error states
 * - Ordering and the fields each event shows
 * - RSVP toggle (create, then cancel) with counts and the user's own state
 * - Moderator-only Create, Edit and Delete controls, with the confirmation
 * - Event fields render as text, never as markup
 * - Logged-out redirect to the login page
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EventsList from "./EventsList";
import {
  createMockEvent,
  createMockModerator,
  createMockRsvp,
  createMockUser,
} from "../test/mocks";

const mockGetFullList = vi.fn();
const mockDelete = vi.fn();
const mockGetEventRsvpCounts = vi.fn();
const mockGetUserEventRsvps = vi.fn();
const mockRsvpToEvent = vi.fn();
const mockCancelRsvp = vi.fn();

vi.mock("../lib/pocketbase", () => ({
  pb: {
    collection: vi.fn(() => ({
      getFullList: (...args: unknown[]) => mockGetFullList(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    })),
  },
  getEventRsvpCounts: (...args: unknown[]) => mockGetEventRsvpCounts(...args),
  getUserEventRsvps: (...args: unknown[]) => mockGetUserEventRsvps(...args),
  rsvpToEvent: (...args: unknown[]) => mockRsvpToEvent(...args),
  cancelRsvp: (...args: unknown[]) => mockCancelRsvp(...args),
}));

const mockUseAuth = vi.fn();

vi.mock("../stores/authStore", () => ({
  useAuth: () => mockUseAuth(),
}));

/** The table row (a card on small screens) that holds an event's title. */
function rowFor(title: string): HTMLElement {
  const row = screen.getByText(title).closest("tr");
  if (!row) throw new Error(`No row for ${title}`);
  return row;
}

describe("EventsList", () => {
  const member = createMockUser({ id: "user_member", role: "user" });
  const moderator = createMockModerator({ id: "user_mod" });

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "http://localhost:4321";
    mockUseAuth.mockReturnValue({ user: member });
    mockGetFullList.mockResolvedValue([]);
    mockDelete.mockResolvedValue(true);
    mockGetEventRsvpCounts.mockResolvedValue({});
    mockGetUserEventRsvps.mockResolvedValue({});
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("states", () => {
    it("shows a loading message while events load", () => {
      mockGetFullList.mockReturnValue(new Promise(() => {}));

      render(<EventsList />);

      expect(screen.getByText("Loading events...")).toBeInTheDocument();
    });

    it("shows the empty state when there are no events", async () => {
      render(<EventsList />);

      expect(await screen.findByText("No events")).toBeInTheDocument();
      expect(
        screen.getByText("No events have been scheduled yet."),
      ).toBeInTheDocument();
      expect(mockGetEventRsvpCounts).not.toHaveBeenCalled();
    });

    it("shows the error message when loading events fails", async () => {
      mockGetFullList.mockRejectedValue(new Error("Network down"));

      render(<EventsList />);

      expect(
        await screen.findByText("Error loading events"),
      ).toBeInTheDocument();
      expect(screen.getByText("Network down")).toBeInTheDocument();
    });

    it("shows the error state when loading RSVPs fails", async () => {
      mockGetFullList.mockResolvedValue([createMockEvent()]);
      mockGetEventRsvpCounts.mockRejectedValue(new Error("RSVPs unavailable"));

      render(<EventsList />);

      expect(
        await screen.findByText("Error loading events"),
      ).toBeInTheDocument();
      expect(screen.getByText("RSVPs unavailable")).toBeInTheDocument();
    });

    it("falls back to a generic message for a non-Error rejection", async () => {
      mockGetFullList.mockRejectedValue("boom");

      render(<EventsList />);

      expect(
        await screen.findByText("Failed to load events"),
      ).toBeInTheDocument();
    });
  });

  describe("event list", () => {
    it("fetches events sorted by date and renders them in that order", async () => {
      const first = createMockEvent({
        title: "First Event",
        date: "2026-03-01",
      });
      const second = createMockEvent({
        title: "Second Event",
        date: "2026-04-01",
      });
      mockGetFullList.mockResolvedValue([first, second]);
      mockGetEventRsvpCounts.mockResolvedValue({
        [first.id]: 0,
        [second.id]: 0,
      });

      render(<EventsList />);

      await screen.findByText("First Event");
      expect(mockGetFullList).toHaveBeenCalledWith({ sort: "date" });
      expect(mockGetEventRsvpCounts).toHaveBeenCalledWith([
        first.id,
        second.id,
      ]);
      expect(mockGetUserEventRsvps).toHaveBeenCalledWith([first.id, second.id]);
      const titles = screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getByText(/Event$/).textContent);
      expect(titles).toEqual(["First Event", "Second Event"]);
    });

    it("renders each event's details once", async () => {
      const event = createMockEvent({
        title: "Rust Meetup",
        type: "meetup",
        date: "2026-02-15",
        time: "18:00",
        time_zone: "CST",
        location: "Cowork Space",
        location_details: "Room 4",
      });
      mockGetFullList.mockResolvedValue([event]);
      mockGetEventRsvpCounts.mockResolvedValue({ [event.id]: 3 });

      render(<EventsList />);

      const row = within(
        await screen
          .findByText("Rust Meetup")
          .then(() => rowFor("Rust Meetup")),
      );
      expect(row.getByText("meetup")).toBeInTheDocument();
      expect(row.getByText("Sun, Feb 15, 2026")).toBeInTheDocument();
      expect(row.getByText("18:00 CST")).toBeInTheDocument();
      expect(row.getByText("Cowork Space")).toBeInTheDocument();
      expect(row.getByText("Room 4")).toBeInTheDocument();
      expect(row.getByText("3 attending")).toBeInTheDocument();
      expect(screen.getAllByText("Rust Meetup")).toHaveLength(1);
    });

    it("omits the location details line when there are none", async () => {
      const event = createMockEvent({
        title: "No Details",
        location: "Somewhere",
        location_details: "",
      });
      mockGetFullList.mockResolvedValue([event]);

      render(<EventsList />);

      await screen.findByText("No Details");
      expect(
        within(rowFor("No Details")).queryByText("123 Test Street"),
      ).toBeNull();
      expect(
        within(rowFor("No Details")).getByText("Somewhere"),
      ).toBeInTheDocument();
    });

    it("shows zero attending when the counts have no entry", async () => {
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Quiet" })]);

      render(<EventsList />);

      await screen.findByText("Quiet");
      expect(
        within(rowFor("Quiet")).getByText("0 attending"),
      ).toBeInTheDocument();
    });
  });

  describe("event fields are escaped", () => {
    it("renders markup in a title or location as text", async () => {
      const payload = "<img src=x onerror=alert(1)>";
      const event = createMockEvent({
        title: payload,
        location: payload,
        location_details: payload,
        type: payload,
      });
      mockGetFullList.mockResolvedValue([event]);

      const { container } = render(<EventsList />);

      await screen.findAllByText(payload);
      expect(container.querySelector("img")).toBeNull();
      expect(screen.getAllByText(payload)).toHaveLength(4);
    });
  });

  describe("RSVP toggle", () => {
    it("shows the user's existing RSVP as Attending", async () => {
      const event = createMockEvent({ title: "Booked" });
      const rsvp = createMockRsvp({ event: event.id, user: member.id });
      mockGetFullList.mockResolvedValue([event]);
      mockGetEventRsvpCounts.mockResolvedValue({ [event.id]: 1 });
      mockGetUserEventRsvps.mockResolvedValue({ [event.id]: rsvp });

      render(<EventsList />);

      await screen.findByText("Booked");
      const row = within(rowFor("Booked"));
      expect(
        row.getByRole("button", { name: "Attending" }),
      ).toBeInTheDocument();
      expect(row.queryByRole("button", { name: "RSVP" })).toBeNull();
    });

    it("creates an RSVP, then cancels it, updating the button and count", async () => {
      const user = userEvent.setup();
      const event = createMockEvent({ title: "Toggle Me" });
      const created = createMockRsvp({ id: "rsvp_new", event: event.id });
      mockGetFullList.mockResolvedValue([event]);
      mockGetEventRsvpCounts.mockResolvedValue({ [event.id]: 2 });
      mockRsvpToEvent.mockResolvedValue(created);
      mockCancelRsvp.mockResolvedValue(undefined);

      render(<EventsList />);
      await screen.findByText("Toggle Me");
      const row = within(rowFor("Toggle Me"));
      expect(row.getByText("2 attending")).toBeInTheDocument();

      await user.click(row.getByRole("button", { name: "RSVP" }));

      expect(mockRsvpToEvent).toHaveBeenCalledWith(event.id);
      expect(
        await row.findByRole("button", { name: "Attending" }),
      ).toBeInTheDocument();
      expect(row.getByText("3 attending")).toBeInTheDocument();
      expect(mockCancelRsvp).not.toHaveBeenCalled();

      await user.click(row.getByRole("button", { name: "Attending" }));

      expect(mockCancelRsvp).toHaveBeenCalledWith("rsvp_new");
      expect(
        await row.findByRole("button", { name: "RSVP" }),
      ).toBeInTheDocument();
      expect(row.getByText("2 attending")).toBeInTheDocument();
    });

    it("cancels a loaded RSVP using its record id", async () => {
      const user = userEvent.setup();
      const event = createMockEvent({ title: "Loaded RSVP" });
      const rsvp = createMockRsvp({ id: "rsvp_loaded", event: event.id });
      mockGetFullList.mockResolvedValue([event]);
      mockGetEventRsvpCounts.mockResolvedValue({ [event.id]: 1 });
      mockGetUserEventRsvps.mockResolvedValue({ [event.id]: rsvp });
      mockCancelRsvp.mockResolvedValue(undefined);

      render(<EventsList />);
      await screen.findByText("Loaded RSVP");
      const row = within(rowFor("Loaded RSVP"));

      await user.click(row.getByRole("button", { name: "Attending" }));

      expect(mockCancelRsvp).toHaveBeenCalledWith("rsvp_loaded");
      expect(await row.findByText("0 attending")).toBeInTheDocument();
    });

    it("only changes the event that was toggled", async () => {
      const user = userEvent.setup();
      const a = createMockEvent({ title: "Event A" });
      const b = createMockEvent({ title: "Event B" });
      mockGetFullList.mockResolvedValue([a, b]);
      mockGetEventRsvpCounts.mockResolvedValue({ [a.id]: 0, [b.id]: 5 });
      mockRsvpToEvent.mockResolvedValue(createMockRsvp({ event: a.id }));

      render(<EventsList />);
      await screen.findByText("Event A");

      await user.click(
        within(rowFor("Event A")).getByRole("button", { name: "RSVP" }),
      );

      expect(
        await within(rowFor("Event A")).findByText("1 attending"),
      ).toBeInTheDocument();
      expect(
        within(rowFor("Event B")).getByText("5 attending"),
      ).toBeInTheDocument();
      expect(
        within(rowFor("Event B")).getByRole("button", { name: "RSVP" }),
      ).toBeInTheDocument();
    });

    it("disables the button while the request is in flight", async () => {
      const user = userEvent.setup();
      const event = createMockEvent({ title: "Slow" });
      let resolve: (value: unknown) => void = () => {};
      mockGetFullList.mockResolvedValue([event]);
      mockRsvpToEvent.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );

      render(<EventsList />);
      await screen.findByText("Slow");
      const row = within(rowFor("Slow"));

      await user.click(row.getByRole("button", { name: "RSVP" }));
      expect(row.getByRole("button", { name: "RSVP" })).toBeDisabled();

      resolve(createMockRsvp({ event: event.id }));
      expect(
        await row.findByRole("button", { name: "Attending" }),
      ).toBeEnabled();
    });

    it("alerts and leaves the state alone when the RSVP fails", async () => {
      const user = userEvent.setup();
      const event = createMockEvent({ title: "Fails" });
      mockGetFullList.mockResolvedValue([event]);
      mockGetEventRsvpCounts.mockResolvedValue({ [event.id]: 1 });
      mockRsvpToEvent.mockRejectedValue(new Error("Server said no"));

      render(<EventsList />);
      await screen.findByText("Fails");
      const row = within(rowFor("Fails"));

      await user.click(row.getByRole("button", { name: "RSVP" }));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          "Failed to update RSVP: Server said no",
        ),
      );
      expect(row.getByRole("button", { name: "RSVP" })).toBeEnabled();
      expect(row.getByText("1 attending")).toBeInTheDocument();
    });
  });

  describe("moderator controls", () => {
    it("hides Create, Edit and Delete from regular members", async () => {
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Plain" })]);

      render(<EventsList />);
      await screen.findByText("Plain");

      expect(screen.queryByRole("link", { name: /create event/i })).toBeNull();
      expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    });

    it("shows Create, Edit and Delete to moderators with the right links", async () => {
      mockUseAuth.mockReturnValue({ user: moderator });
      const event = createMockEvent({ title: "Managed" });
      mockGetFullList.mockResolvedValue([event]);

      render(<EventsList />);
      await screen.findByText("Managed");

      expect(
        screen.getByRole("link", { name: /create event/i }),
      ).toHaveAttribute("href", "/app/create-event");
      const row = within(rowFor("Managed"));
      expect(row.getByRole("link", { name: "Edit" })).toHaveAttribute(
        "href",
        `/app/create-event?edit=${event.id}`,
      );
      expect(row.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    it("deletes after confirmation and reloads the list", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      const keep = createMockEvent({ title: "Keep" });
      const remove = createMockEvent({ title: "Remove" });
      mockGetFullList
        .mockResolvedValueOnce([keep, remove])
        .mockResolvedValueOnce([keep]);

      render(<EventsList />);
      await screen.findByText("Remove");

      await user.click(
        within(rowFor("Remove")).getByRole("button", { name: "Delete" }),
      );

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete this event?",
      );
      expect(mockDelete).toHaveBeenCalledWith(remove.id);
      await waitFor(() => expect(screen.queryByText("Remove")).toBeNull());
      expect(screen.getByText("Keep")).toBeInTheDocument();
      expect(mockGetFullList).toHaveBeenCalledTimes(2);
    });

    it("does not delete when the confirmation is declined", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      vi.mocked(window.confirm).mockReturnValue(false);
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Safe" })]);

      render(<EventsList />);
      await screen.findByText("Safe");

      await user.click(
        within(rowFor("Safe")).getByRole("button", { name: "Delete" }),
      );

      expect(mockDelete).not.toHaveBeenCalled();
      expect(screen.getByText("Safe")).toBeInTheDocument();
    });

    it("alerts and keeps the event when the delete fails", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Stuck" })]);
      mockDelete.mockRejectedValue(new Error("Forbidden"));

      render(<EventsList />);
      await screen.findByText("Stuck");

      await user.click(
        within(rowFor("Stuck")).getByRole("button", { name: "Delete" }),
      );

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          "Failed to delete event: Forbidden",
        ),
      );
      expect(screen.getByText("Stuck")).toBeInTheDocument();
    });
  });

  describe("auth gating", () => {
    it("sends a logged-out visitor to the login page", async () => {
      mockUseAuth.mockReturnValue({ user: null });

      render(<EventsList />);

      await waitFor(() => expect(window.location.href).toBe("/login"));
    });
  });
});
