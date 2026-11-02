import { useCallback, useEffect, useState } from "react";
import {
  CalendarIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import {
  pb,
  getEventRsvpCounts,
  getUserEventRsvps,
  rsvpToEvent,
  cancelRsvp,
} from "../lib/pocketbase";
import type { EventRecord, RsvpRecord } from "../lib/types";
import { useLatestRequest } from "../lib/useLatestRequest";
import { useRedirectToLogin } from "../lib/useRedirectToLogin";
import { useAuth } from "../stores/authStore";
import { BadgeButton } from "./catalyst/badge";
import { Button } from "./catalyst/button";
import { Heading } from "./catalyst/heading";
import { Text } from "./catalyst/text";
import { Notice, Spinner, errorMessage } from "./ListStates";

/** Format a `YYYY-MM-DD` string without the UTC shift of `new Date(string)`. */
function formatEventDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface EventRowProps {
  event: EventRecord;
  count: number;
  isAttending: boolean;
  isPending: boolean;
  isModerator: boolean;
  onToggleRsvp: (event: EventRecord) => void;
  onDelete: (event: EventRecord) => void;
}

/**
 * One event. A card below the `lg` breakpoint and a table row from `lg` up,
 * from the same markup: the table elements only change `display`.
 */
function EventRow({
  event,
  count,
  isAttending,
  isPending,
  isModerator,
  onToggleRsvp,
  onDelete,
}: EventRowProps) {
  return (
    <tr
      role="row"
      className="flex flex-wrap items-center gap-y-3 max-lg:rounded-lg max-lg:border max-lg:border-zinc-200 max-lg:bg-white max-lg:p-4 lg:table-row dark:max-lg:border-zinc-800 dark:max-lg:bg-zinc-900"
    >
      <td
        role="cell"
        className="w-full wrap-anywhere lg:table-cell lg:w-auto lg:px-4 lg:py-4"
      >
        <div className="text-sm font-medium text-zinc-900 dark:text-white">
          {event.title}
        </div>
        <div className="text-xs text-zinc-500 lg:text-sm dark:text-zinc-400">
          {event.type}
        </div>
      </td>
      <td
        role="cell"
        className="flex w-full items-start gap-2 lg:table-cell lg:w-auto lg:px-4 lg:py-4 lg:whitespace-nowrap"
      >
        <CalendarIcon
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 lg:hidden"
        />
        <div>
          <div className="text-sm text-zinc-900 dark:text-white">
            {formatEventDate(event.date)}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {event.time} {event.time_zone}
          </div>
        </div>
      </td>
      <td
        role="cell"
        className="flex w-full items-start gap-2 wrap-anywhere lg:table-cell lg:w-auto lg:px-4 lg:py-4"
      >
        <MapPinIcon
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 lg:hidden"
        />
        <div>
          <div className="text-sm text-zinc-900 dark:text-white">
            {event.location}
          </div>
          {event.location_details && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {event.location_details}
            </div>
          )}
        </div>
      </td>
      {/* Cards read "N attending"; the table column header says it already. */}
      <td
        role="cell"
        className="flex items-center gap-1 text-xs text-zinc-500 lg:table-cell lg:px-4 lg:py-4 lg:text-center lg:text-sm dark:text-zinc-400"
      >
        <UsersIcon aria-hidden="true" className="h-4 w-4 lg:hidden" />
        <span>{count}</span>
        <span className="lg:sr-only"> attending</span>
      </td>
      <td
        role="cell"
        className="ml-auto flex flex-wrap items-center justify-end gap-2 lg:table-cell lg:px-4 lg:py-4 lg:text-right"
      >
        <div className="flex flex-wrap items-center justify-end gap-2 lg:flex-nowrap">
          <BadgeButton
            color={isAttending ? "emerald" : "indigo"}
            disabled={isPending}
            aria-pressed={isAttending}
            aria-label={`${isAttending ? "Attending" : "RSVP"}: ${event.title}`}
            className="data-disabled:opacity-50"
            onClick={() => onToggleRsvp(event)}
          >
            {isAttending ? "Attending" : "RSVP"}
          </BadgeButton>
          {isModerator && (
            <>
              <BadgeButton
                href={`/app/create-event?edit=${encodeURIComponent(event.id)}`}
                aria-label={`Edit: ${event.title}`}
              >
                Edit
              </BadgeButton>
              <BadgeButton
                color="red"
                disabled={isPending}
                aria-label={`Delete: ${event.title}`}
                className="data-disabled:opacity-50"
                onClick={() => onDelete(event)}
              >
                Delete
              </BadgeButton>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function EventsList() {
  const { user } = useAuth();
  const isModerator = user?.role === "moderator";
  const isLoggedIn = !!user;

  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [userRsvps, setUserRsvps] = useState<Record<string, RsvpRecord>>({});
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const beginLoad = useLatestRequest();

  const loadEvents = useCallback(async () => {
    const isLatest = beginLoad();
    try {
      const loaded = await pb
        .collection<EventRecord>("events")
        .getFullList({ sort: "date" });
      // A superseded load skips the RSVP fetches.
      if (!isLatest()) return;

      let counts: Record<string, number> = {};
      let rsvps: Record<string, RsvpRecord> = {};
      if (loaded.length > 0) {
        const eventIds = loaded.map((e) => e.id);
        [counts, rsvps] = await Promise.all([
          getEventRsvpCounts(eventIds),
          getUserEventRsvps(eventIds),
        ]);
      }

      if (!isLatest()) return;
      setRsvpCounts(counts);
      setUserRsvps(rsvps);
      setError(null);
      setEvents(loaded);
    } catch (err) {
      if (!isLatest()) return;
      console.error("Error loading events:", err);
      setError(errorMessage(err, "Failed to load events"));
    }
  }, [beginLoad]);

  useRedirectToLogin(isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) {
      loadEvents();
    }
  }, [isLoggedIn, loadEvents]);

  async function handleToggleRsvp(event: EventRecord) {
    const eventId = event.id;
    const existing = userRsvps[eventId];

    setPendingIds((ids) => new Set(ids).add(eventId));
    try {
      if (existing) {
        await cancelRsvp(existing.id);
        setUserRsvps((current) => {
          const rest = { ...current };
          delete rest[eventId];
          return rest;
        });
        setRsvpCounts((current) => ({
          ...current,
          [eventId]: Math.max(0, (current[eventId] || 1) - 1),
        }));
      } else {
        const created = await rsvpToEvent(eventId);
        setUserRsvps((current) => ({ ...current, [eventId]: created }));
        setRsvpCounts((current) => ({
          ...current,
          [eventId]: (current[eventId] || 0) + 1,
        }));
      }
    } catch (err) {
      console.error("Error updating RSVP:", err);
      alert("Failed to update RSVP: " + errorMessage(err, "Unknown error"));
    } finally {
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(eventId);
        return next;
      });
    }
  }

  async function handleDelete(event: EventRecord) {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    setPendingIds((ids) => new Set(ids).add(event.id));
    try {
      await pb.collection<EventRecord>("events").delete(event.id);
      // Drop it at once, so a stale reload can't leave a deleted event to click.
      setEvents((current) => current?.filter((e) => e.id !== event.id) ?? null);
      await loadEvents();
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event: " + errorMessage(err, "Unknown error"));
    } finally {
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(event.id);
        return next;
      });
    }
  }

  let content: React.ReactNode;
  if (error) {
    content = (
      <Notice
        icon={
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-red-400"
          />
        }
        title="Error loading events"
        message={error}
      />
    );
  } else if (events === null) {
    content = <Spinner label="Loading events..." />;
  } else if (events.length === 0) {
    content = (
      <Notice
        icon={
          <CalendarIcon
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-zinc-400"
          />
        }
        title="No events"
        message="No events have been scheduled yet."
      />
    );
  } else {
    content = (
      <div className="lg:overflow-x-auto lg:rounded-lg lg:border lg:border-zinc-200 dark:lg:border-zinc-800">
        <table
          role="table"
          className="block min-w-full lg:table lg:divide-y lg:divide-zinc-200 dark:lg:divide-zinc-800"
        >
          <thead
            role="rowgroup"
            className="max-lg:sr-only lg:table-header-group lg:bg-zinc-50 dark:lg:bg-zinc-900"
          >
            <tr role="row">
              <th
                role="columnheader"
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
              >
                Event
              </th>
              <th
                role="columnheader"
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
              >
                Date &amp; Time
              </th>
              <th
                role="columnheader"
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
              >
                Location
              </th>
              <th
                role="columnheader"
                scope="col"
                className="px-4 py-3 text-center text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
              >
                Attending
              </th>
              <th
                role="columnheader"
                scope="col"
                className="relative px-4 py-3"
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody
            role="rowgroup"
            className="block space-y-4 lg:table-row-group lg:space-y-0 lg:divide-y lg:divide-zinc-200 lg:bg-white dark:lg:divide-zinc-800 dark:lg:bg-zinc-900"
          >
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                count={rsvpCounts[event.id] || 0}
                isAttending={!!userRsvps[event.id]}
                isPending={pendingIds.has(event.id)}
                isModerator={isModerator}
                onToggleRsvp={handleToggleRsvp}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Heading>Events</Heading>
          <Text className="mt-2">
            View upcoming events and manage your RSVPs
          </Text>
        </div>
        {isModerator && (
          <Button color="indigo" href="/app/create-event" className="shrink-0">
            <PlusIcon data-slot="icon" />
            Create Event
          </Button>
        )}
      </div>
      {content}
    </div>
  );
}
