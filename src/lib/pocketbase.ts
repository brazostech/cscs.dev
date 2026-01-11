import PocketBase from "pocketbase";

// PocketBase URL - client-side only (static site)
// Development: http://localhost:8080
// Production: https://api.cscs.dev
function getPocketBaseUrl(): string {
  // If explicitly set, use that
  if (import.meta.env.PUBLIC_POCKETBASE_URL) {
    return import.meta.env.PUBLIC_POCKETBASE_URL;
  }

  // Production mode - use public API
  if (import.meta.env.PROD) {
    return "https://api.cscs.dev";
  }

  // Development mode - use localhost (accessible from browser)
  return "http://localhost:8080";
}

const PB_URL = getPocketBaseUrl();

// Create a single instance to be shared across the app
export const pb = new PocketBase(PB_URL);

// Enable auto cancellation for duplicated requests
pb.autoCancellation(false);

// Types for user authentication
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar?: string;
  verified: boolean;
  role?: string;
  created: string;
  updated: string;
}

export interface RegisterData {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Helper functions for authentication
export async function register(data: RegisterData) {
  return await pb.collection("users").create(data);
}

export async function login(data: LoginData) {
  return await pb
    .collection("users")
    .authWithPassword(data.email, data.password);
}

export async function logout() {
  pb.authStore.clear();
}

export function getCurrentUser(): AuthUser | null {
  return pb.authStore.model as AuthUser | null;
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

// Listen to auth state changes
export function onAuthChange(callback: (user: AuthUser | null) => void) {
  pb.authStore.onChange(() => {
    callback(getCurrentUser());
  });
}

// Request password reset
export async function requestPasswordReset(email: string) {
  return await pb.collection("users").requestPasswordReset(email);
}

// Verify email
export async function requestVerification(email: string) {
  return await pb.collection("users").requestVerification(email);
}

// ============================================
// RSVP Functions
// ============================================

export interface RsvpData {
  id: string;
  event: string;
  user: string;
  created: string;
  updated: string;
  expand?: {
    event?: {
      id: string;
      title: string;
      date: string;
      time: string;
      time_zone: string;
      location: string;
      location_details?: string;
      type: string;
    };
  };
}

/**
 * RSVP to an event (creates attendance record)
 */
export async function rsvpToEvent(eventId: string): Promise<RsvpData> {
  const user = getCurrentUser();
  if (!user) throw new Error("Must be logged in to RSVP");
  return await pb.collection("rsvps").create({
    event: eventId,
    user: user.id,
  });
}

/**
 * Cancel an RSVP (delete attendance record)
 */
export async function cancelRsvp(rsvpId: string): Promise<void> {
  await pb.collection("rsvps").delete(rsvpId);
}

/**
 * Get current user's RSVP for a specific event
 * Returns null if not RSVP'd or not logged in
 */
export async function getUserEventRsvp(
  eventId: string,
): Promise<RsvpData | null> {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    return await pb
      .collection("rsvps")
      .getFirstListItem(`event="${eventId}" && user="${user.id}"`);
  } catch {
    return null; // Not found
  }
}

/**
 * Get all RSVPs for current user (with event expansion)
 */
export async function getUserRsvps(): Promise<RsvpData[]> {
  const user = getCurrentUser();
  if (!user) return [];
  return await pb.collection("rsvps").getFullList({
    filter: `user="${user.id}"`,
    expand: "event",
    sort: "-created",
  });
}

/**
 * Get RSVP count for a single event
 */
export async function getEventRsvpCount(eventId: string): Promise<number> {
  const result = await pb.collection("rsvps").getList(1, 1, {
    filter: `event="${eventId}"`,
  });
  return result.totalItems;
}

/**
 * Get RSVP counts for multiple events (batch operation)
 * Returns a map of eventId -> count
 */
export async function getEventRsvpCounts(
  eventIds: string[],
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};

  const filter = eventIds.map((id) => `event="${id}"`).join(" || ");
  const rsvps = await pb.collection("rsvps").getFullList({ filter });

  const counts: Record<string, number> = {};
  eventIds.forEach((id) => (counts[id] = 0));
  rsvps.forEach((rsvp) => {
    counts[rsvp.event] = (counts[rsvp.event] || 0) + 1;
  });
  return counts;
}

/**
 * Get current user's RSVPs for multiple events (batch operation)
 * Returns a map of eventId -> RsvpData
 */
export async function getUserEventRsvps(
  eventIds: string[],
): Promise<Record<string, RsvpData>> {
  const user = getCurrentUser();
  if (!user || eventIds.length === 0) return {};

  const eventFilter = eventIds.map((id) => `event="${id}"`).join(" || ");
  const filter = `user="${user.id}" && (${eventFilter})`;
  const rsvps = await pb.collection("rsvps").getFullList<RsvpData>({ filter });

  const rsvpMap: Record<string, RsvpData> = {};
  rsvps.forEach((rsvp) => {
    rsvpMap[rsvp.event] = rsvp;
  });
  return rsvpMap;
}
