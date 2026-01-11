/**
 * Tests for PocketBase RSVP functions.
 *
 * These tests mock the PocketBase SDK to verify the logic in our helper functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockUser,
  createMockRsvp,
  createMockRsvps,
} from "../test/mocks/factories";

// Use vi.hoisted to create mocks that are available in the hoisted vi.mock factory
const { mockState, collectionMethods } = vi.hoisted(() => {
  // Collection methods that can be configured in tests
  const methods = {
    create: vi.fn(),
    delete: vi.fn(),
    getFirstListItem: vi.fn(),
    getFullList: vi.fn(),
    getList: vi.fn(),
    getOne: vi.fn(),
    update: vi.fn(),
  };

  // Collection function returns the methods object
  const collection = vi.fn(() => methods);

  return {
    mockState: {
      collection,
      authStore: {
        model: null as unknown,
        token: "",
        isValid: false,
        clear: vi.fn(),
        onChange: vi.fn(),
      },
    },
    collectionMethods: methods,
  };
});

// Mock PocketBase
vi.mock("pocketbase", () => {
  return {
    default: class MockPocketBase {
      collection = mockState.collection;
      authStore = mockState.authStore;
      autoCancellation() {}
    },
  };
});

// Import after mocking
import {
  rsvpToEvent,
  cancelRsvp,
  getUserEventRsvp,
  getUserRsvps,
  getEventRsvpCount,
  getEventRsvpCounts,
  getUserEventRsvps,
  getCurrentUser,
} from "./pocketbase";

describe("RSVP Functions", () => {
  let mockUser: ReturnType<typeof createMockUser>;
  let mockRsvpData: ReturnType<typeof createMockRsvp>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUser = createMockUser({ id: "user123" });
    mockRsvpData = createMockRsvp({
      id: "rsvp123",
      event: "event123",
      user: "user123",
    });

    // Set up authenticated user by default
    mockState.authStore.model = mockUser;
    mockState.authStore.isValid = true;
  });

  afterEach(() => {
    mockState.authStore.model = null;
    mockState.authStore.isValid = false;
  });

  describe("getCurrentUser", () => {
    it("returns the current user when authenticated", () => {
      const user = getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it("returns null when not authenticated", () => {
      mockState.authStore.model = null;
      const user = getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe("rsvpToEvent", () => {
    it("creates an RSVP for the current user", async () => {
      collectionMethods.create.mockResolvedValue(mockRsvpData);

      const result = await rsvpToEvent("event123");

      expect(mockState.collection).toHaveBeenCalledWith("rsvps");
      expect(collectionMethods.create).toHaveBeenCalledWith({
        event: "event123",
        user: "user123",
      });
      expect(result).toEqual(mockRsvpData);
    });

    it("throws error when not logged in", async () => {
      mockState.authStore.model = null;

      await expect(rsvpToEvent("event123")).rejects.toThrow(
        "Must be logged in to RSVP",
      );
      expect(collectionMethods.create).not.toHaveBeenCalled();
    });
  });

  describe("cancelRsvp", () => {
    it("deletes the RSVP by ID", async () => {
      collectionMethods.delete.mockResolvedValue(true);

      await cancelRsvp("rsvp123");

      expect(mockState.collection).toHaveBeenCalledWith("rsvps");
      expect(collectionMethods.delete).toHaveBeenCalledWith("rsvp123");
    });
  });

  describe("getUserEventRsvp", () => {
    it("returns the RSVP when user has one for the event", async () => {
      collectionMethods.getFirstListItem.mockResolvedValue(mockRsvpData);

      const result = await getUserEventRsvp("event123");

      expect(mockState.collection).toHaveBeenCalledWith("rsvps");
      expect(collectionMethods.getFirstListItem).toHaveBeenCalledWith(
        'event="event123" && user="user123"',
      );
      expect(result).toEqual(mockRsvpData);
    });

    it("returns null when no RSVP exists", async () => {
      collectionMethods.getFirstListItem.mockRejectedValue(
        new Error("Not found"),
      );

      const result = await getUserEventRsvp("event123");

      expect(result).toBeNull();
    });

    it("returns null when not logged in", async () => {
      mockState.authStore.model = null;

      const result = await getUserEventRsvp("event123");

      expect(result).toBeNull();
      expect(collectionMethods.getFirstListItem).not.toHaveBeenCalled();
    });
  });

  describe("getUserRsvps", () => {
    it("returns all RSVPs for the current user", async () => {
      const rsvps = createMockRsvps(3, { user: "user123" });
      collectionMethods.getFullList.mockResolvedValue(rsvps);

      const result = await getUserRsvps();

      expect(mockState.collection).toHaveBeenCalledWith("rsvps");
      expect(collectionMethods.getFullList).toHaveBeenCalledWith({
        filter: 'user="user123"',
        expand: "event",
        sort: "-created",
      });
      expect(result).toEqual(rsvps);
    });

    it("returns empty array when not logged in", async () => {
      mockState.authStore.model = null;

      const result = await getUserRsvps();

      expect(result).toEqual([]);
      expect(collectionMethods.getFullList).not.toHaveBeenCalled();
    });
  });

  describe("getEventRsvpCount", () => {
    it("returns the count of RSVPs for an event", async () => {
      collectionMethods.getList.mockResolvedValue({ items: [], totalItems: 5 });

      const result = await getEventRsvpCount("event123");

      expect(mockState.collection).toHaveBeenCalledWith("rsvps");
      expect(collectionMethods.getList).toHaveBeenCalledWith(1, 1, {
        filter: 'event="event123"',
      });
      expect(result).toBe(5);
    });

    it("returns 0 when no RSVPs exist", async () => {
      collectionMethods.getList.mockResolvedValue({ items: [], totalItems: 0 });

      const result = await getEventRsvpCount("event999");

      expect(result).toBe(0);
    });
  });

  describe("getEventRsvpCounts", () => {
    it("returns counts for multiple events", async () => {
      const rsvps = [
        createMockRsvp({ event: "event1" }),
        createMockRsvp({ event: "event1" }),
        createMockRsvp({ event: "event2" }),
      ];
      collectionMethods.getFullList.mockResolvedValue(rsvps);

      const result = await getEventRsvpCounts(["event1", "event2", "event3"]);

      expect(mockState.collection).toHaveBeenCalledWith("rsvps");
      expect(collectionMethods.getFullList).toHaveBeenCalledWith({
        filter: 'event="event1" || event="event2" || event="event3"',
      });
      expect(result).toEqual({
        event1: 2,
        event2: 1,
        event3: 0,
      });
    });

    it("returns empty object for empty event list", async () => {
      const result = await getEventRsvpCounts([]);

      expect(result).toEqual({});
      expect(collectionMethods.getFullList).not.toHaveBeenCalled();
    });
  });

  describe("getUserEventRsvps", () => {
    it("returns RSVPs for multiple events for current user", async () => {
      const rsvps = [
        createMockRsvp({ id: "rsvp1", event: "event1", user: "user123" }),
        createMockRsvp({ id: "rsvp2", event: "event2", user: "user123" }),
      ];
      collectionMethods.getFullList.mockResolvedValue(rsvps);

      const result = await getUserEventRsvps(["event1", "event2", "event3"]);

      expect(mockState.collection).toHaveBeenCalledWith("rsvps");
      expect(collectionMethods.getFullList).toHaveBeenCalledWith({
        filter:
          'user="user123" && (event="event1" || event="event2" || event="event3")',
      });
      expect(result).toEqual({
        event1: rsvps[0],
        event2: rsvps[1],
      });
    });

    it("returns empty object when not logged in", async () => {
      mockState.authStore.model = null;

      const result = await getUserEventRsvps(["event1"]);

      expect(result).toEqual({});
      expect(collectionMethods.getFullList).not.toHaveBeenCalled();
    });

    it("returns empty object for empty event list", async () => {
      const result = await getUserEventRsvps([]);

      expect(result).toEqual({});
      expect(collectionMethods.getFullList).not.toHaveBeenCalled();
    });
  });
});
