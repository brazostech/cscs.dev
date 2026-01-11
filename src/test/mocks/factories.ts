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

let eventCounter = 0;
let userCounter = 0;

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
 * Reset counters between test suites if needed.
 */
export function resetFactoryCounters(): void {
  eventCounter = 0;
  userCounter = 0;
}
