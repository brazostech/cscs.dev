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

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EventsList from "./EventsList";
import type { EventRecord } from "../lib/types";
import {
  createMockEvent,
  createMockModerator,
  createMockRsvp,
  createMockUser,
} from "../test/mocks";

const mockCollection = vi.fn();
const mockGetFullList = vi.fn();
const mockDelete = vi.fn();
const mockGetEventRsvpCounts = vi.fn();
const mockGetUserEventRsvps = vi.fn();
const mockRsvpToEvent = vi.fn();
const mockCancelRsvp = vi.fn();

vi.mock("../lib/pocketbase", () => ({
  pb: {
    collection: (...args: unknown[]) => mockCollection(...args),
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

/** The text of a row's Attending cell. */
function attendingIn(row: ReturnType<typeof within>): string {
  return row.getAllByRole("cell")[3].textContent ?? "";
}

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
    vi.resetAllMocks();
    window.location.href = "http://localhost:4321";
    mockCollection.mockReturnValue({
      getFullList: (...args: unknown[]) => mockGetFullList(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    });
    mockRsvpToEvent.mockResolvedValue(createMockRsvp());
    mockCancelRsvp.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: member });
    mockGetFullList.mockResolvedValue([]);
    mockDelete.mockResolvedValue(true);
    mockGetEventRsvpCounts.mockResolvedValue({});
    mockGetUserEventRsvps.mockResolvedValue({});
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.mocked(window.alert).mockReturnValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("states", () => {
    it("shows a loading message while events load", () => {
      mockGetFullList.mockReturnValue(new Promise(() => {}));

      render(<EventsList />);

      expect(screen.getByRole("status")).toHaveTextContent("Loading events...");
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
      expect(mockCollection).toHaveBeenCalledWith("events");
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
      expect(attendingIn(row)).toBe("3 attending");
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
      const locationCell = within(rowFor("No Details")).getAllByRole("cell")[2];
      expect(locationCell).toHaveTextContent(/^Somewhere$/);
      expect(locationCell.querySelectorAll("div > div")).toHaveLength(1);
    });

    it("shows the location details line under the location", async () => {
      const event = createMockEvent({
        title: "With Details",
        location: "Somewhere",
        location_details: "Room 4",
      });
      mockGetFullList.mockResolvedValue([event]);

      render(<EventsList />);

      await screen.findByText("With Details");
      const locationCell = within(rowFor("With Details")).getAllByRole(
        "cell",
      )[2];
      expect(locationCell).toHaveTextContent(/^SomewhereRoom 4$/);
    });

    it("shows zero attending when the counts have no entry", async () => {
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Quiet" })]);

      render(<EventsList />);

      await screen.findByText("Quiet");
      expect(attendingIn(within(rowFor("Quiet")))).toBe("0 attending");
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
        row.getByRole("button", { name: /^Attending:/ }),
      ).toBeInTheDocument();
      expect(row.queryByRole("button", { name: /^RSVP:/ })).toBeNull();
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
      expect(attendingIn(row)).toBe("2 attending");

      await user.click(row.getByRole("button", { name: /^RSVP:/ }));

      expect(mockRsvpToEvent).toHaveBeenCalledWith(event.id);
      expect(
        await row.findByRole("button", { name: /^Attending:/ }),
      ).toBeInTheDocument();
      expect(attendingIn(row)).toBe("3 attending");
      expect(mockCancelRsvp).not.toHaveBeenCalled();

      await user.click(row.getByRole("button", { name: /^Attending:/ }));

      expect(mockCancelRsvp).toHaveBeenCalledWith("rsvp_new");
      expect(
        await row.findByRole("button", { name: /^RSVP:/ }),
      ).toBeInTheDocument();
      expect(attendingIn(row)).toBe("2 attending");
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

      await user.click(row.getByRole("button", { name: /^Attending:/ }));

      expect(mockCancelRsvp).toHaveBeenCalledWith("rsvp_loaded");
      await waitFor(() => expect(attendingIn(row)).toBe("0 attending"));
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
        within(rowFor("Event A")).getByRole("button", { name: /^RSVP:/ }),
      );

      await waitFor(() =>
        expect(attendingIn(within(rowFor("Event A")))).toBe("1 attending"),
      );
      expect(attendingIn(within(rowFor("Event B")))).toBe("5 attending");
      expect(
        within(rowFor("Event B")).getByRole("button", { name: /^RSVP:/ }),
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

      await user.click(row.getByRole("button", { name: /^RSVP:/ }));
      expect(row.getByRole("button", { name: /^RSVP:/ })).toBeDisabled();

      resolve(createMockRsvp({ event: event.id }));
      expect(
        await row.findByRole("button", { name: /^Attending:/ }),
      ).toBeEnabled();
    });

    it("alerts and leaves the state alone when cancelling the RSVP fails", async () => {
      const user = userEvent.setup();
      const event = createMockEvent({ title: "Cancel Fails" });
      const rsvp = createMockRsvp({ id: "rsvp_keep", event: event.id });
      mockGetFullList.mockResolvedValue([event]);
      mockGetEventRsvpCounts.mockResolvedValue({ [event.id]: 2 });
      mockGetUserEventRsvps.mockResolvedValue({ [event.id]: rsvp });
      mockCancelRsvp.mockRejectedValue(new Error("Cancel refused"));

      render(<EventsList />);
      await screen.findByText("Cancel Fails");
      const row = within(rowFor("Cancel Fails"));

      await user.click(row.getByRole("button", { name: /^Attending:/ }));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          "Failed to update RSVP: Cancel refused",
        ),
      );
      expect(mockCancelRsvp).toHaveBeenCalledWith("rsvp_keep");
      expect(row.getByRole("button", { name: /^Attending:/ })).toBeEnabled();
      expect(attendingIn(row)).toBe("2 attending");
    });

    it("labels the controls with the event title and exposes the RSVP state", async () => {
      mockUseAuth.mockReturnValue({ user: moderator });
      const going = createMockEvent({ title: "Going" });
      const notGoing = createMockEvent({ title: "Not Going" });
      mockGetFullList.mockResolvedValue([going, notGoing]);
      mockGetUserEventRsvps.mockResolvedValue({
        [going.id]: createMockRsvp({ event: going.id }),
      });

      render(<EventsList />);
      await screen.findByText("Going");

      expect(
        screen.getByRole("button", { name: "Attending: Going", pressed: true }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "RSVP: Not Going",
          pressed: false,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Delete: Going" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Edit: Going" }),
      ).toBeInTheDocument();
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

      await user.click(row.getByRole("button", { name: /^RSVP:/ }));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          "Failed to update RSVP: Server said no",
        ),
      );
      expect(row.getByRole("button", { name: /^RSVP:/ })).toBeEnabled();
      expect(attendingIn(row)).toBe("1 attending");
    });
  });

  describe("moderator controls", () => {
    it("hides Create, Edit and Delete from regular members", async () => {
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Plain" })]);

      render(<EventsList />);
      await screen.findByText("Plain");

      expect(screen.queryByRole("link", { name: /create event/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /^Edit:/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Delete:/ })).toBeNull();
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
      expect(row.getByRole("link", { name: /^Edit:/ })).toHaveAttribute(
        "href",
        `/app/create-event?edit=${event.id}`,
      );
      expect(row.getByRole("button", { name: /^Delete:/ })).toBeInTheDocument();
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
      // Forget the initial load's collection calls so the next assertion pins
      // the collection the delete itself targets.
      mockCollection.mockClear();

      await user.click(
        within(rowFor("Remove")).getByRole("button", { name: /^Delete:/ }),
      );

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete this event?",
      );
      expect(mockCollection).toHaveBeenNthCalledWith(1, "events");
      expect(mockDelete).toHaveBeenCalledWith(remove.id);
      await waitFor(() => expect(screen.queryByText("Remove")).toBeNull());
      expect(screen.getByText("Keep")).toBeInTheDocument();
      expect(mockGetFullList).toHaveBeenCalledTimes(2);
    });

    it("ignores a slow earlier reload that resolves after a newer one", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      const a = createMockEvent({ title: "Event A" });
      const b = createMockEvent({ title: "Event B" });
      const c = createMockEvent({ title: "Event C" });
      let releaseA: (events: EventRecord[]) => void = () => {};
      mockGetFullList
        .mockResolvedValueOnce([a, b, c])
        // Reload after deleting A: held, and it still lists B.
        .mockReturnValueOnce(
          new Promise<EventRecord[]>((resolve) => {
            releaseA = resolve;
          }),
        )
        // Reload after deleting B: arrives first.
        .mockResolvedValueOnce([c]);

      render(<EventsList />);
      await screen.findByText("Event A");

      await user.click(
        within(rowFor("Event A")).getByRole("button", { name: /^Delete:/ }),
      );
      await waitFor(() => expect(mockGetFullList).toHaveBeenCalledTimes(2));
      await user.click(
        within(rowFor("Event B")).getByRole("button", { name: /^Delete:/ }),
      );
      await waitFor(() => expect(screen.queryByText("Event B")).toBeNull());

      // Resolve A's stale reload and let React flush it.
      await act(async () => {
        releaseA([b, c]);
      });

      expect(screen.queryByText("Event B")).toBeNull();
      expect(screen.queryByText("Event A")).toBeNull();
      expect(screen.getByText("Event C")).toBeInTheDocument();
    });

    it("ignores a slow earlier reload that fails after a newer one applied", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      const a = createMockEvent({ title: "Event A" });
      const b = createMockEvent({ title: "Event B" });
      const c = createMockEvent({ title: "Event C" });
      let rejectA: (err: Error) => void = () => {};
      mockGetFullList
        .mockResolvedValueOnce([a, b, c])
        // Reload after deleting A: held, then it fails.
        .mockReturnValueOnce(
          new Promise<EventRecord[]>((_, reject) => {
            rejectA = reject;
          }),
        )
        // Reload after deleting B: arrives first.
        .mockResolvedValueOnce([c]);

      render(<EventsList />);
      await screen.findByText("Event A");

      await user.click(
        within(rowFor("Event A")).getByRole("button", { name: /^Delete:/ }),
      );
      await waitFor(() => expect(mockGetFullList).toHaveBeenCalledTimes(2));
      await user.click(
        within(rowFor("Event B")).getByRole("button", { name: /^Delete:/ }),
      );
      await waitFor(() => expect(mockGetFullList).toHaveBeenCalledTimes(3));

      await act(async () => {
        rejectA(new Error("stale boom"));
      });

      expect(screen.queryByText("Error loading events")).toBeNull();
      expect(screen.queryByText("stale boom")).toBeNull();
      expect(screen.getByText("Event C")).toBeInTheDocument();
    });

    it("ignores a slow earlier reload held in its RSVP fetch", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      const a = createMockEvent({ title: "Event A" });
      const b = createMockEvent({ title: "Event B" });
      const c = createMockEvent({ title: "Event C" });
      let releaseCounts: (counts: Record<string, number>) => void = () => {};
      mockGetFullList
        .mockResolvedValueOnce([a, b, c])
        .mockResolvedValueOnce([b, c])
        .mockResolvedValueOnce([c]);
      mockGetEventRsvpCounts
        .mockResolvedValueOnce({})
        // A's reload gets its events at once, then stalls on the counts.
        .mockReturnValueOnce(
          new Promise<Record<string, number>>((resolve) => {
            releaseCounts = resolve;
          }),
        )
        .mockResolvedValue({});

      render(<EventsList />);
      await screen.findByText("Event A");

      await user.click(
        within(rowFor("Event A")).getByRole("button", { name: /^Delete:/ }),
      );
      await waitFor(() =>
        expect(mockGetEventRsvpCounts).toHaveBeenCalledTimes(2),
      );
      await user.click(
        within(rowFor("Event B")).getByRole("button", { name: /^Delete:/ }),
      );
      await waitFor(() => expect(mockGetFullList).toHaveBeenCalledTimes(3));

      await act(async () => {
        releaseCounts({});
      });

      expect(screen.queryByText("Event B")).toBeNull();
      expect(screen.queryByText("Event A")).toBeNull();
      expect(screen.getByText("Event C")).toBeInTheDocument();
    });

    it("removes a deleted event before its reload resolves", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      const keep = createMockEvent({ title: "Keep" });
      const remove = createMockEvent({ title: "Remove" });
      mockGetFullList.mockResolvedValueOnce([keep, remove]).mockReturnValueOnce(
        // The reload never resolves in this test.
        new Promise(() => {}),
      );

      render(<EventsList />);
      await screen.findByText("Remove");

      await user.click(
        within(rowFor("Remove")).getByRole("button", { name: /^Delete:/ }),
      );

      await waitFor(() => expect(mockGetFullList).toHaveBeenCalledTimes(2));
      expect(screen.queryByText("Remove")).toBeNull();
      expect(screen.getByText("Keep")).toBeInTheDocument();
    });

    it("does not delete when the confirmation is declined", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      vi.mocked(window.confirm).mockReturnValue(false);
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Safe" })]);

      render(<EventsList />);
      await screen.findByText("Safe");

      await user.click(
        within(rowFor("Safe")).getByRole("button", { name: /^Delete:/ }),
      );

      expect(mockDelete).not.toHaveBeenCalled();
      expect(screen.getByText("Safe")).toBeInTheDocument();
    });

    it("disables Delete while the request is in flight", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      let resolve: (value: unknown) => void = () => {};
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Once" })]);
      mockDelete.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );

      render(<EventsList />);
      await screen.findByText("Once");
      const row = within(rowFor("Once"));

      await user.click(row.getByRole("button", { name: /^Delete:/ }));
      expect(row.getByRole("button", { name: /^Delete:/ })).toBeDisabled();

      resolve(true);
      await waitFor(() =>
        expect(row.getByRole("button", { name: /^Delete:/ })).toBeEnabled(),
      );
    });

    it("alerts and keeps the event when the delete fails", async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: moderator });
      mockGetFullList.mockResolvedValue([createMockEvent({ title: "Stuck" })]);
      mockDelete.mockRejectedValue(new Error("Forbidden"));

      render(<EventsList />);
      await screen.findByText("Stuck");

      await user.click(
        within(rowFor("Stuck")).getByRole("button", { name: /^Delete:/ }),
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
      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockGetFullList).not.toHaveBeenCalled();
      expect(mockGetEventRsvpCounts).not.toHaveBeenCalled();
      expect(mockGetUserEventRsvps).not.toHaveBeenCalled();
      expect(screen.queryByRole("table")).toBeNull();
    });
  });
});
