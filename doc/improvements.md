# Codebase Improvement Plan

This document outlines a plan to enhance the quality, consistency, and maintainability of the CSCS community website codebase.

## 1. Linting and Formatting

Consistent code style is crucial for readability and collaboration. We will introduce ESLint for linting and Prettier for code formatting.

- **Install Dependencies**: Add `eslint`, `prettier`, and necessary plugins (`@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `prettier-plugin-astro`, `prettier-plugin-tailwindcss`) as dev dependencies.
- **Configuration**:
  - Create `.eslintrc.cjs` with recommended rules for Astro, TypeScript, and React accessibility.
  - Create `.prettierrc.mjs` to enforce a consistent code style.
  - Create `.prettierignore` to exclude generated files and dependencies.
- **NPM Scripts**: Add `lint` and `format` scripts to `package.json` for manual checks and fixes.

## 2. Automated Quality Checks

To automate code quality enforcement, we will set up Git hooks and GitHub Actions.

### Git Hooks

- **Tooling**: Use `husky` to manage Git hooks.
- **`pre-commit` Hook**: Configure a hook to run ESLint and Prettier on staged files before each commit. This ensures that no poorly formatted or error-prone code enters the version history.

### GitHub Actions

- **Workflow**: Create a `ci.yml` workflow in `.github/workflows/`.
- **Triggers**: The workflow will run on `push` and `pull_request` events for the `main` branch.
- **Jobs**:
  1.  **Setup**: Install Node.js and dependencies.
  2.  **Lint**: Run `npm run lint` to catch any linting errors.
  3.  **Format Check**: Run `npm run format -- --check` to ensure all files are formatted correctly.
  4.  **Build**: Run `npm run build` to verify that the project builds successfully.

## 3. Testing Infrastructure

The project currently lacks an automated test suite. Introducing a testing framework is a critical step towards ensuring reliability.

- **Framework**: `vitest` is a modern, fast testing framework that integrates well with Vite-based projects like Astro.
- **Initial Setup**:
  - Install `vitest` and related dependencies.
  - Configure `vitest` in the project.
  - Create a sample test file to demonstrate usage and establish a pattern for future tests.

## 4. Developer Experience

Improving the development environment helps developers write better code more efficiently.

- **VS Code Recommendations**: Update `.vscode/extensions.json` to recommend the following extensions:
  - `dbaeumer.vscode-eslint`: Integrates ESLint into the editor.
  - `esbenp.prettier-vscode`: Provides Prettier formatting within VS Code.
- **`.gitignore`**: Review and enhance the `.gitignore` file to ensure all necessary files and directories are ignored.

## 5. Implementation Status

**Completed on:** 2025-11-29

All items in this plan have been successfully implemented. The codebase now includes:

- ESLint and Prettier for consistent code style.
- A Husky pre-commit hook to enforce quality standards.
- A GitHub Actions CI workflow for automated checks.
- An updated `.vscode/extensions.json` for a better developer experience.

---

# Events Feature Roadmap

This section tracks planned improvements for the events system.

## Completed

### Phase 1: Dynamic Public Schedule (2026-01-10)

- Created `ScheduleEvents.tsx` component to fetch events from PocketBase
- Updated `/schedule` page to display events dynamically instead of hardcoded data
- Events are fetched publicly (no auth required), filtered to future events, sorted by date
- Maintains same visual design with event type badges, relative time, and location details

## In Progress

### Phase 2: Recurring Event Support

Allow moderators to create recurring events with a single form submission.

**Planned Changes:**

- Add recurrence options to EventForm (weekly, bi-weekly, monthly)
- Generate individual event records based on recurrence pattern (max 26 occurrences)
- Add `series_id` field to group related events
- Remove unique constraint on `title` field (blocks recurring events with same name)
- Update "Recurring Schedule Info" section to derive from event data

## Backlog (Phase 3)

### Schema & Data Improvements

- [ ] **Field naming consistency**: Standardize `time_zone` vs `timeZone` across codebase
- [ ] **Date/time storage**: Consider using proper date types instead of text for better sorting/filtering
- [ ] **Add `created_by` field**: Track which user created each event (relation to users)
- [ ] **Add `status` field**: Support draft/published/cancelled states for soft-cancel without delete
- [ ] **Past event handling**: Define strategy for archiving or auto-deleting old events

### Feature Improvements

- [ ] **RSVP functionality**: Implement the RSVP button (currently shows "coming soon" placeholder)
- [ ] **Event capacity**: Add `max_attendees` field and show availability
- [ ] **Virtual event links**: Add dedicated `url` field for online meeting links

### UI/UX Improvements

- [ ] **Derive recurring schedule info from data**: Replace static "Book Club" and "Algorithms Meetup" info cards with data-driven content
- [ ] **Event filtering**: Add ability to filter by event type on schedule page
- [ ] **Calendar view**: Add optional calendar visualization of events
