# AGENTS.md

Instructions for AI coding agents. `CLAUDE.md` is a symlink to this file.

## Quick Start

- **Project**: CSCS community website — Astro 7 + React 19, Tailwind CSS v4, PocketBase backend, Catalyst UI Kit
- **Worktree required**: All implementation work must happen in a git worktree. Use `EnterWorktree` before editing project files. A hook enforces this.
- **GitHub MCP tools**: Use MCP tools (not `gh` CLI) for PRs, issues, etc. A hook redirects `gh` commands.
- **Package manager**: npm only (yarn/pnpm/bun are denied by settings)

## Commands

```bash
npm run dev          # Dev server at localhost:4321
npm run build        # Production build to ./dist/
npm run preview      # Preview production build
npm run lint         # ESLint
npm run format       # Prettier (writes changes)
npm run format:check # Prettier (check only, what CI runs)
npm run check        # astro check (typecheck)
npm run test:run     # Vitest (single run)
npm run test:coverage # Vitest with v8 coverage
npm run build-storybook # Build Storybook
```

Node version is pinned in `.nvmrc` (22). CI reads it directly; the `Containerfile` base image and `netlify.toml` `NODE_VERSION` must match it, and CI fails if they don't.

## Code Conventions

### Formatting & Linting

- **Prettier** with `prettier-plugin-astro` and `prettier-plugin-tailwindcss`
- **ESLint** 10 with TypeScript, Astro, and a11y plugins. The a11y rules come from `eslint-plugin-jsx-a11y-x` (the maintained fork of `eslint-plugin-jsx-a11y`, which does not support ESLint 10), loaded through `eslint-plugin-astro`'s `flat/jsx-a11y-recommended` config. `@typescript-eslint/no-explicit-any` is disabled.

### TypeScript

- Strict mode via `astro/tsconfigs/strict`
- Interfaces for object shapes, `type` for unions/aliases
- Explicit types for function parameters and return values

### Naming

- **Files**: kebab-case for pages (`create-event.astro`), PascalCase for components (`EventForm.tsx`)
- **Components**: PascalCase. Default export for page-level, named exports for utilities.
- **Functions**: camelCase
- **Interfaces**: PascalCase with descriptive names (`AuthUser`, `EventData`, `BookData`)

### React

- Function components with hooks only
- Hydration directives: `client:only="react"` for auth-dependent, `client:load` for interactive, `client:visible` for lazy, none for static
- All components must support dark mode (`dark:` variants, `zinc` neutrals + `indigo` accent)

### Error Handling & Async

- try/catch with `err instanceof Error ? err.message : "fallback"` pattern
- Loading state with disabled submit buttons during async operations

## Architecture

```
src/
  components/         # React components
    catalyst/         # UI kit — don't modify, use as-is
  content/blog/       # Markdown blog posts (collection defined in src/content.config.ts: glob loader + Zod schema)
  layouts/            # Astro layouts (Layout.astro accepts title, description)
  lib/                # PocketBase client and helpers (pocketbase.ts)
  pages/              # File-based routing
    app/              # Authenticated pages (dashboard, events, books)
  stores/             # React state (authStore.ts → useAuth() hook)
  test/               # Mocks and factories
```

### Routing

- `/` — Home | `/blog`, `/blog/[slug]` — Blog | `/book-club` — Book club | `/schedule` — Events
- `/app/dashboard`, `/app/events`, `/app/books` — Authenticated app pages
- `/login`, `/register`, `/verify-email`, `/account` — Auth flows

### PocketBase Integration

- Client: `src/lib/pocketbase.ts` exports `pb` instance + typed helper functions
- Collections: `users` (auth), `events`, `rsvps`, `books`
- Auth: `useAuth()` hook for React components, `user?.role === "moderator"` for admin checks
- RBAC: Public list/view, moderator-only create/update/delete (enforced via API rules)

### Catalyst UI Kit

Located in `src/components/catalyst/`. Use these for UI consistency:

- `Button`, `Input`, `Textarea`, `Select` — Form elements
- `Field`, `Label`, `ErrorMessage` — Form field wrappers
- `Heading`, `Text` — Typography
- `Dialog`, `Alert` — Modals

A hook soft-asks before editing catalyst/ files. Prefer wrapping over modifying.

## Key Patterns

### Testing

Vitest + React Testing Library. Reference implementations:

- **Component tests**: `src/components/EventForm.test.tsx`, `src/components/BookClubPage.test.tsx`
- **Library tests**: `src/lib/pocketbase.test.ts`
- **Mock factories**: `src/test/mocks/factories.ts` (createMockEvent, createMockBook, etc.)
- **PocketBase mock**: `src/test/mocks/pocketbase.ts` (createMockPocketBaseModule)

Pattern: `vi.mock("../lib/pocketbase", ...)` with `vi.hoisted()` for variables used in mock factories.

### PocketBase Migrations

Migration files in `backend/pb_migrations/` with timestamp prefixes:

- New collection: see `1768138900_created_rsvps.js` pattern
- Update collection: see `1768098549_updated_events_recurring.js` pattern
- Each migration has up/down functions for reversibility

### Blog Posts

Markdown in `src/content/blog/` with required frontmatter: `title`, `description`, `pubDate`, `author`, `tags`.

### Date Handling

Store dates as text (`YYYY-MM-DD`). Parse with `new Date(year, month - 1, day)` — never `new Date("YYYY-MM-DD")` which parses as UTC and shows wrong day in US timezones.

## Git Workflow

- **Branches**: one branch per worktree, descriptive names (`fix-event-date-bug`, `feat-book-club-page`)
- **Commits**: conventional commits — `feat:`, `fix:`, `chore:`, `docs:`. Brief subject line, body for "why".
- **PRs**: create via GitHub MCP tools. Title under 70 chars. Body with `## Summary` and `## Test plan`. `main` takes changes only through PRs (ruleset, ADR 0012).
- **Merging**: squash only. The PR title becomes the commit subject on `main`, so it must be a Conventional Commit; the body becomes the commit message. Branches delete on merge.
- **CI**: PRs run lint, format check, typecheck, tests, build, Storybook build via GitHub Actions. The `build` job and Netlify's `deploy-preview` must both pass before merge.

## Boundaries

**Free** (no confirmation needed): read files, run tests/lint/build, git status/log/diff, search code

**Ask first** (confirm with user): git push, create/merge PRs (enabling auto-merge counts as merging), modify CI config, delete files/branches, run deployment commands

**Forbidden**: store secrets in code, skip pre-commit hooks (`--no-verify`), force-push to main, bypass the `main` ruleset (`gh pr merge --admin`), modify `node_modules/` or `dist/`

## References

- **Architecture decisions**: `doc/adr/` (12 ADRs covering hosting, runtime, CI/CD, etc.)
- **Backend setup & deployment**: `backend/README.md`
- **Auth system details**: `doc/authentication.md`
- **Project audit & known issues**: `doc/audit.md`
- **Feature roadmap**: `doc/improvements.md`
- **CI pipeline**: `.github/workflows/ci.yml` (lint, format check, typecheck, test, build, Storybook build)
- **Hook & skill docs**: `.claude/README.md`

## Worktree Workflow

All work happens in `.claude/worktrees/` (gitignored). `EnterWorktree` creates them automatically.

**Rules**:

- Use `EnterWorktree` before any implementation work
- One worktree per unit of work (feature, bugfix, refactor)
- `.claude/` config changes are exempt from the worktree requirement
