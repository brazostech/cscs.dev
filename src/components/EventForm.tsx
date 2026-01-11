import { useState, useEffect } from "react";
import { pb } from "../lib/pocketbase";
import { Button } from "./catalyst/button";
import { Field, Label } from "./catalyst/fieldset";
import { Input } from "./catalyst/input";
import { Textarea } from "./catalyst/textarea";
import { Select } from "./catalyst/select";

interface EventFormProps {
  eventId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface EventData {
  title: string;
  description: string;
  date: string;
  time: string;
  time_zone: string;
  location: string;
  location_details?: string;
  type: string;
  tags: string;
  series_id?: string;
}

interface RecurrenceOptions {
  enabled: boolean;
  pattern: "weekly" | "biweekly" | "monthly";
  occurrences: number;
}

/**
 * Generate a unique series ID for recurring events.
 * Exported for testing.
 */
export function generateSeriesId(): string {
  return `series_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate future dates based on recurrence pattern.
 * Exported for testing.
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param pattern - Recurrence pattern: 'weekly', 'biweekly', or 'monthly'
 * @param count - Number of occurrences to generate
 * @returns Array of dates in YYYY-MM-DD format
 */
export function generateRecurringDates(
  startDate: string,
  pattern: string,
  count: number,
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");

  for (let i = 0; i < count; i++) {
    const date = new Date(start);

    switch (pattern) {
      case "weekly":
        date.setDate(start.getDate() + i * 7);
        break;
      case "biweekly":
        date.setDate(start.getDate() + i * 14);
        break;
      case "monthly":
        date.setMonth(start.getMonth() + i);
        break;
    }

    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

export default function EventForm({
  eventId,
  onSuccess,
  onCancel,
}: EventFormProps) {
  const [formData, setFormData] = useState<EventData>({
    title: "",
    description: "",
    date: "",
    time: "",
    time_zone: "CST",
    location: "",
    location_details: "",
    type: "meetup",
    tags: "",
  });
  const [recurrence, setRecurrence] = useState<RecurrenceOptions>({
    enabled: false,
    pattern: "weekly",
    occurrences: 4,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(!!eventId);
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  async function loadEvent() {
    try {
      const event = await pb.collection("events").getOne(eventId!);
      setFormData({
        title: event.title || "",
        description: event.description || "",
        date: event.date || "",
        time: event.time || "",
        time_zone: event.time_zone || "CST",
        location: event.location || "",
        location_details: event.location_details || "",
        type: event.type || "meetup",
        tags: event.tags || "",
        series_id: event.series_id || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setIsLoadingEvent(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setCreatedCount(0);

    try {
      if (eventId) {
        // Update existing event (no recurrence for edits)
        await pb.collection("events").update(eventId, formData);
      } else if (recurrence.enabled) {
        // Create recurring events
        const seriesId = generateSeriesId();
        const dates = generateRecurringDates(
          formData.date,
          recurrence.pattern,
          recurrence.occurrences,
        );

        for (let i = 0; i < dates.length; i++) {
          const eventData = {
            ...formData,
            date: dates[i],
            series_id: seriesId,
          };
          await pb.collection("events").create(eventData);
          setCreatedCount(i + 1);
        }
      } else {
        // Create single event
        await pb.collection("events").create(formData);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = "/app/events";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(field: keyof EventData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleRecurrenceChange(
    field: keyof RecurrenceOptions,
    value: boolean | string | number,
  ) {
    setRecurrence((prev) => ({ ...prev, [field]: value }));
  }

  if (isLoadingEvent) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Loading event...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <Field>
        <Label>Title *</Label>
        <Input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </Field>

      <Field>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field>
          <Label>{recurrence.enabled ? "Start Date *" : "Date *"}</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            required
          />
        </Field>

        <Field>
          <Label>Time *</Label>
          <Input
            type="time"
            value={formData.time}
            onChange={(e) => handleChange("time", e.target.value)}
            required
          />
        </Field>
      </div>

      <Field>
        <Label>Time Zone</Label>
        <Select
          value={formData.time_zone}
          onChange={(e) => handleChange("time_zone", e.target.value)}
        >
          <option value="CST">CST</option>
          <option value="EST">EST</option>
          <option value="PST">PST</option>
          <option value="MST">MST</option>
        </Select>
      </Field>

      <Field>
        <Label>Location *</Label>
        <Input
          type="text"
          value={formData.location}
          onChange={(e) => handleChange("location", e.target.value)}
          placeholder="e.g., Zoom, Capsher Technologies"
          required
        />
      </Field>

      <Field>
        <Label>Location Details</Label>
        <Input
          type="text"
          value={formData.location_details}
          onChange={(e) => handleChange("location_details", e.target.value)}
          placeholder="e.g., Address or meeting link"
        />
      </Field>

      <Field>
        <Label>Type *</Label>
        <Select
          value={formData.type}
          onChange={(e) => handleChange("type", e.target.value)}
        >
          <option value="meetup">Meetup</option>
          <option value="book-club">Book Club</option>
        </Select>
      </Field>

      <Field>
        <Label>Tags</Label>
        <Input
          type="text"
          value={formData.tags}
          onChange={(e) => handleChange("tags", e.target.value)}
          placeholder="e.g., algorithms, networking"
        />
      </Field>

      {/* Recurrence Options - Only show for new events */}
      {!eventId && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurrence-enabled"
              checked={recurrence.enabled}
              onChange={(e) =>
                handleRecurrenceChange("enabled", e.target.checked)
              }
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600 dark:border-zinc-600 dark:bg-zinc-800"
            />
            <label
              htmlFor="recurrence-enabled"
              className="text-sm font-medium text-zinc-900 dark:text-white"
            >
              Create recurring event
            </label>
          </div>

          {recurrence.enabled && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <Label>Repeat</Label>
                <Select
                  value={recurrence.pattern}
                  onChange={(e) =>
                    handleRecurrenceChange(
                      "pattern",
                      e.target.value as RecurrenceOptions["pattern"],
                    )
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </Field>

              <Field>
                <Label>Number of occurrences</Label>
                <Select
                  value={recurrence.occurrences}
                  onChange={(e) =>
                    handleRecurrenceChange(
                      "occurrences",
                      parseInt(e.target.value),
                    )
                  }
                >
                  {[2, 4, 6, 8, 10, 12, 16, 20, 26].map((n) => (
                    <option key={n} value={n}>
                      {n} events
                    </option>
                  ))}
                </Select>
              </Field>

              {formData.date && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This will create {recurrence.occurrences} events from{" "}
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {formData.date}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {
                        generateRecurringDates(
                          formData.date,
                          recurrence.pattern,
                          recurrence.occurrences,
                        ).slice(-1)[0]
                      }
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" plain onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? recurrence.enabled
              ? `Creating ${createdCount}/${recurrence.occurrences}...`
              : "Saving..."
            : eventId
              ? "Update Event"
              : recurrence.enabled
                ? `Create ${recurrence.occurrences} Events`
                : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
