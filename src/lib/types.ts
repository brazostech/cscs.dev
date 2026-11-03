/**
 * Hand-written record types for the PocketBase collections.
 *
 * Each field name and type mirrors `backend/pb_migrations`. Change a
 * migration and the matching type here in the same commit.
 *
 * PocketBase returns an empty string for an unset text, select, file or
 * relation field, so those fields are `string`, not optional. Date fields are
 * stored as text (`YYYY-MM-DD`); see "Date Handling" in AGENTS.md.
 */

/** `events` (pbc_1687431684) */
export interface EventRecord {
  id: string;
  title: string;
  description: string;
  /** Free-form text, e.g. "meetup" or "book-club". */
  type: string;
  location: string;
  location_details: string;
  time_zone: string;
  /** Text, `YYYY-MM-DD`. */
  date: string;
  /** Text, e.g. "18:00". */
  time: string;
  /** Groups the occurrences of a recurring event. */
  series_id: string;
  /** Text, not a relation. */
  tags: string;
  /** Relation to `books`: a record id, or "" when unset. */
  book: string;
  created: string;
  updated: string;
}

/**
 * The fields the event form writes. `book` is left out so saving the form
 * never touches an event's linked book. `series_id` is optional because only
 * recurring events and edits of them carry one.
 */
export type EventInput = Omit<
  EventRecord,
  "id" | "created" | "updated" | "book" | "series_id"
> &
  Partial<Pick<EventRecord, "series_id">>;

/** `rsvps` (pbc_rsvps) */
export interface RsvpRecord {
  id: string;
  /** Relation to `events`: a record id. */
  event: string;
  /** Relation to `users`: a record id. */
  user: string;
  created: string;
  updated: string;
  expand?: {
    event?: EventRecord;
  };
}

/** `books` (pbc_books) */
export interface BookRecord {
  id: string;
  title: string;
  author: string;
  description: string;
  /** File name; empty when there is no cover. */
  cover_image: string;
  status: "reading" | "completed";
  purchase_link: string;
  /** Text, `YYYY-MM-DD`. */
  start_date: string;
  /** Text, `YYYY-MM-DD`. */
  end_date: string;
  sort_order: number;
  created: string;
  updated: string;
}

/**
 * `users` (_pb_users_auth_). Only `role` comes from a migration; the rest
 * are PocketBase's built-in auth fields.
 */
export interface UserRecord {
  id: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name: string;
  avatar: string;
  role: "user" | "moderator";
  created: string;
  updated: string;
}
