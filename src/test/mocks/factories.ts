/**
 * Test data factories for creating mock objects with realistic defaults.
 * Use these to create test data with optional overrides.
 */

export interface MockEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  time_zone: string;
  location: string;
  location_details: string;
  type: string;
  tags: string;
  series_id: string;
  created: string;
  updated: string;
}

export interface MockUser {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar: string;
  verified: boolean;
  role: string;
  created: string;
  updated: string;
}

export interface MockRsvp {
  id: string;
  event: string;
  user: string;
  created: string;
  updated: string;
  expand?: {
    event?: MockEvent;
    user?: MockUser;
  };
}

export interface MockBook {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_image: string;
  status: "reading" | "completed";
  purchase_link: string;
  start_date: string;
  end_date: string;
  sort_order: number;
  created: string;
  updated: string;
}

let eventCounter = 0;
let userCounter = 0;
let rsvpCounter = 0;
let bookCounter = 0;

/**
 * Create a mock event with sensible defaults.
 * All properties can be overridden.
 */
export function createMockEvent(overrides?: Partial<MockEvent>): MockEvent {
  eventCounter++;
  const now = new Date().toISOString();

  return {
    id: `event_${eventCounter}_${Math.random().toString(36).substring(2, 7)}`,
    title: `Test Event ${eventCounter}`,
    description: "A test event description for testing purposes.",
    date: "2026-02-15",
    time: "18:00",
    time_zone: "CST",
    location: "Test Location",
    location_details: "123 Test Street",
    type: "meetup",
    tags: "test, mock",
    series_id: "",
    created: now,
    updated: now,
    ...overrides,
  };
}

/**
 * Create a mock user with sensible defaults.
 * All properties can be overridden.
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  userCounter++;
  const now = new Date().toISOString();

  return {
    id: `user_${userCounter}_${Math.random().toString(36).substring(2, 7)}`,
    email: `testuser${userCounter}@example.com`,
    name: `Test User ${userCounter}`,
    username: `testuser${userCounter}`,
    avatar: "",
    verified: true,
    role: "member",
    created: now,
    updated: now,
    ...overrides,
  };
}

/**
 * Create a mock moderator user.
 */
export function createMockModerator(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    role: "moderator",
    ...overrides,
  });
}

/**
 * Create multiple mock events.
 */
export function createMockEvents(
  count: number,
  overrides?: Partial<MockEvent>,
): MockEvent[] {
  return Array.from({ length: count }, () => createMockEvent(overrides));
}

/**
 * Create a mock RSVP with sensible defaults.
 * All properties can be overridden.
 */
export function createMockRsvp(overrides?: Partial<MockRsvp>): MockRsvp {
  rsvpCounter++;
  const now = new Date().toISOString();

  return {
    id: `rsvp_${rsvpCounter}_${Math.random().toString(36).substring(2, 7)}`,
    event: `event_${rsvpCounter}`,
    user: `user_${rsvpCounter}`,
    created: now,
    updated: now,
    ...overrides,
  };
}

/**
 * Create multiple mock RSVPs.
 */
export function createMockRsvps(
  count: number,
  overrides?: Partial<MockRsvp>,
): MockRsvp[] {
  return Array.from({ length: count }, () => createMockRsvp(overrides));
}

/**
 * Create a mock book with sensible defaults.
 * All properties can be overridden.
 */
export function createMockBook(overrides?: Partial<MockBook>): MockBook {
  bookCounter++;
  const now = new Date().toISOString();

  return {
    id: `book_${bookCounter}_${Math.random().toString(36).substring(2, 7)}`,
    title: `Test Book ${bookCounter}`,
    author: `Test Author ${bookCounter}`,
    description: "A test book description.",
    cover_image: "",
    status: "completed",
    purchase_link: "",
    start_date: "2026-01-01",
    end_date: "2026-02-01",
    sort_order: bookCounter,
    created: now,
    updated: now,
    ...overrides,
  };
}

/**
 * Create multiple mock books.
 */
export function createMockBooks(
  count: number,
  overrides?: Partial<MockBook>,
): MockBook[] {
  return Array.from({ length: count }, () => createMockBook(overrides));
}

/**
 * Reset counters between test suites if needed.
 */
export function resetFactoryCounters(): void {
  eventCounter = 0;
  userCounter = 0;
  rsvpCounter = 0;
  bookCounter = 0;
}
