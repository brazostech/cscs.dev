/**
 * EventForm Stories
 *
 * Demonstrates the EventForm component in various states:
 * - Creating a new event
 * - Creating recurring events
 * - Editing an existing event
 * - With callbacks
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import EventForm from "./EventForm";

const meta: Meta<typeof EventForm> = {
  title: "Forms/EventForm",
  component: EventForm,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
The EventForm component handles creating and editing events.

## Features
- Create single events
- Create recurring events (weekly, biweekly, monthly)
- Edit existing events
- Form validation
- Loading and error states

## Usage
\`\`\`tsx
// Create new event
<EventForm onSuccess={() => router.push('/events')} />

// Edit existing event
<EventForm eventId="123" onSuccess={() => router.push('/events')} />

// With cancel callback
<EventForm onCancel={() => router.back()} onSuccess={handleSuccess} />
\`\`\`
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    eventId: {
      description: "ID of event to edit. If omitted, creates a new event.",
      control: "text",
    },
    onSuccess: {
      description: "Callback fired after successful create/update.",
      action: "onSuccess",
    },
    onCancel: {
      description:
        "Callback fired when cancel button is clicked. If omitted, cancel button is hidden.",
      action: "onCancel",
    },
  },
};

export default meta;
type Story = StoryObj<typeof EventForm>;

/**
 * Default state for creating a new event.
 * Shows all form fields with empty values.
 */
export const Default: Story = {
  args: {},
};

/**
 * Form with cancel button visible.
 * Useful when the form is in a modal or side panel.
 */
export const WithCancelButton: Story = {
  args: {
    onCancel: fn(),
    onSuccess: fn(),
  },
};

/**
 * Demonstrates the recurrence feature.
 * Click "Create recurring event" to see the recurrence options.
 */
export const WithRecurrenceEnabled: Story = {
  args: {
    onSuccess: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Enable recurrence
    const checkbox = canvas.getByLabelText(/create recurring event/i);
    await userEvent.click(checkbox);

    // Fill in a date to see the preview
    const dateInput = canvas.getByLabelText(/start date/i);
    await userEvent.type(dateInput, "2026-03-01");

    // Change pattern to biweekly
    const patternSelect = canvas.getByLabelText(/repeat/i);
    await userEvent.selectOptions(patternSelect, "biweekly");

    // Change occurrences to 6
    const occurrencesSelect = canvas.getByLabelText(/number of occurrences/i);
    await userEvent.selectOptions(occurrencesSelect, "6");
  },
};

/**
 * Form pre-filled with sample data.
 * Demonstrates what a filled-out form looks like before submission.
 */
export const PreFilledForm: Story = {
  args: {
    onSuccess: fn(),
    onCancel: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill out the form with sample data
    await userEvent.type(
      canvas.getByLabelText(/title/i),
      "Monthly Tech Meetup",
    );
    await userEvent.type(
      canvas.getByLabelText(/description/i),
      "Join us for our monthly technology meetup where we discuss the latest trends in software development, share projects, and network with fellow developers.",
    );
    await userEvent.type(canvas.getByLabelText(/date/i), "2026-02-15");
    await userEvent.type(canvas.getByLabelText(/^time \*/i), "18:30");
    await userEvent.selectOptions(canvas.getByLabelText(/time zone/i), "CST");
    await userEvent.type(
      canvas.getByLabelText(/^location \*/i),
      "Capsher Technologies",
    );
    await userEvent.type(
      canvas.getByLabelText(/location details/i),
      "123 Innovation Drive, College Station, TX",
    );
    await userEvent.selectOptions(canvas.getByLabelText(/^type \*/i), "meetup");
    await userEvent.type(
      canvas.getByLabelText(/tags/i),
      "technology, networking, software",
    );
  },
};

/**
 * Book Club event example.
 * Shows the form configured for a book club meeting.
 */
export const BookClubEvent: Story = {
  args: {
    onSuccess: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      canvas.getByLabelText(/title/i),
      "Book Club: Clean Code",
    );
    await userEvent.type(
      canvas.getByLabelText(/description/i),
      "This month we're reading 'Clean Code' by Robert C. Martin. We'll discuss chapters 1-5.",
    );
    await userEvent.type(canvas.getByLabelText(/date/i), "2026-02-20");
    await userEvent.type(canvas.getByLabelText(/^time \*/i), "19:00");
    await userEvent.type(canvas.getByLabelText(/^location \*/i), "Zoom");
    await userEvent.type(
      canvas.getByLabelText(/location details/i),
      "Link will be sent via email",
    );
    await userEvent.selectOptions(
      canvas.getByLabelText(/^type \*/i),
      "book-club",
    );
    await userEvent.type(
      canvas.getByLabelText(/tags/i),
      "book-club, clean-code, programming",
    );
  },
};

/**
 * Weekly recurring meetup.
 * Demonstrates creating a series of weekly events.
 */
export const WeeklyRecurringMeetup: Story = {
  args: {
    onSuccess: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill basic info
    await userEvent.type(
      canvas.getByLabelText(/title/i),
      "Weekly Code Review Session",
    );
    await userEvent.type(
      canvas.getByLabelText(/description/i),
      "Weekly session to review code and share best practices.",
    );

    // Enable recurrence first
    await userEvent.click(canvas.getByLabelText(/create recurring event/i));

    // Now fill date (label changed to "Start Date")
    await userEvent.type(canvas.getByLabelText(/start date/i), "2026-01-06");
    await userEvent.type(canvas.getByLabelText(/^time \*/i), "12:00");
    await userEvent.type(canvas.getByLabelText(/^location \*/i), "Zoom");

    // Configure recurrence - weekly for 12 weeks
    await userEvent.selectOptions(canvas.getByLabelText(/repeat/i), "weekly");
    await userEvent.selectOptions(
      canvas.getByLabelText(/number of occurrences/i),
      "12",
    );
  },
};

/**
 * Mobile viewport story.
 * Shows how the form looks on smaller screens.
 */
export const MobileView: Story = {
  args: {
    onSuccess: fn(),
    onCancel: fn(),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile",
    },
  },
};

/**
 * Form validation state.
 * Demonstrates the form with validation in action.
 * Note: Native HTML5 validation is used, so validation messages
 * appear when trying to submit with empty required fields.
 */
export const ValidationExample: Story = {
  args: {
    onSuccess: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Try clicking the submit button to see HTML5 validation in action. Required fields are marked with an asterisk (*).",
      },
    },
  },
};
