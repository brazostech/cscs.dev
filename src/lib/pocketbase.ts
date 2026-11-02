import PocketBase from "pocketbase";
import type { BookRecord, RsvpRecord, UserRecord } from "./types";

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
export type AuthUser = UserRecord;

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
  return await pb.collection<UserRecord>("users").create(data);
}

export async function login(data: LoginData) {
  return await pb
    .collection<UserRecord>("users")
    .authWithPassword(data.email, data.password);
}

export async function logout() {
  pb.authStore.clear();
}

export function getCurrentUser(): AuthUser | null {
  return pb.authStore.record as AuthUser | null;
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

export type RsvpData = RsvpRecord;

/**
 * RSVP to an event (creates attendance record)
 */
export async function rsvpToEvent(eventId: string): Promise<RsvpData> {
  const user = getCurrentUser();
  if (!user) throw new Error("Must be logged in to RSVP");
  return await pb.collection<RsvpRecord>("rsvps").create({
    event: eventId,
    user: user.id,
  });
}

/**
 * Cancel an RSVP (delete attendance record)
 */
export async function cancelRsvp(rsvpId: string): Promise<void> {
  await pb.collection<RsvpRecord>("rsvps").delete(rsvpId);
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
      .collection<RsvpRecord>("rsvps")
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
  return await pb.collection<RsvpRecord>("rsvps").getFullList({
    filter: `user="${user.id}"`,
    expand: "event",
    sort: "-created",
  });
}

/**
 * Get RSVP count for a single event
 */
export async function getEventRsvpCount(eventId: string): Promise<number> {
  const result = await pb.collection<RsvpRecord>("rsvps").getList(1, 1, {
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
  const rsvps = await pb
    .collection<RsvpRecord>("rsvps")
    .getFullList({ filter });

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
  const rsvps = await pb
    .collection<RsvpRecord>("rsvps")
    .getFullList({ filter });

  const rsvpMap: Record<string, RsvpData> = {};
  rsvps.forEach((rsvp) => {
    rsvpMap[rsvp.event] = rsvp;
  });
  return rsvpMap;
}

// ============================================
// Book Club Functions
// ============================================

export type BookData = BookRecord;

/**
 * Get the currently-reading book (expects 0 or 1 result).
 */
export async function getCurrentBook(): Promise<BookData | null> {
  try {
    return await pb
      .collection<BookRecord>("books")
      .getFirstListItem('status="reading"');
  } catch {
    return null;
  }
}

/**
 * Get all completed books, ordered by sort_order then end_date descending.
 */
export async function getCompletedBooks(): Promise<BookData[]> {
  return await pb.collection<BookRecord>("books").getFullList({
    filter: 'status="completed"',
    sort: "sort_order,-end_date",
  });
}

/**
 * Get all books (for admin management).
 */
export async function getAllBooks(): Promise<BookData[]> {
  return await pb.collection<BookRecord>("books").getFullList({
    sort: "-created",
  });
}

/**
 * Get the cover image URL for a book.
 */
export function getBookCoverUrl(book: BookData): string | null {
  if (!book.cover_image) return null;
  return pb.files.getURL(book, book.cover_image);
}
