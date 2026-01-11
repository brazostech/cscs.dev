import { useState, useEffect } from "react";
import { pb } from "../lib/pocketbase";

interface Event {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  time_zone: string;
  location: string;
  location_details?: string;
  description?: string;
}

// Format date for display
function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Get relative time (e.g., "Tomorrow", "In 3 days")
function getRelativeTime(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 14) return "Next week";
  return `In ${Math.floor(diffDays / 7)} weeks`;
}

// Get badge color based on event type
function getBadgeColor(type: string): string {
  return type === "book-club"
    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
}

// Get display name for event type
function getTypeName(type: string): string {
  return type === "book-club" ? "Book Club" : "Meetup";
}

export default function ScheduleEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        // Fetch all events, sorted by date
        const allEvents = await pb.collection("events").getFullList<Event>({
          sort: "date",
        });

        // Filter to only show future events
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureEvents = allEvents.filter((event) => {
          const [year, month, day] = event.date.split("-").map(Number);
          const eventDate = new Date(year, month - 1, day);
          return eventDate >= today;
        });

        setEvents(futureEvents);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent dark:border-indigo-400"></div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Loading events...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
          Error loading events
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
          No upcoming events
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Check back soon for new events!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <article
          key={event.id}
          className="rounded-2xl border border-zinc-200 p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getBadgeColor(event.type)}`}
                >
                  {getTypeName(event.type)}
                </span>
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {getRelativeTime(event.date)}
                </span>
              </div>

              <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
                {event.title}
              </h2>

              {event.description && (
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {event.description}
                </p>
              )}

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {formatDate(event.date)}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {event.time} {event.time_zone}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {event.location}
                    </p>
                    {event.location_details && (
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {event.location_details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
