# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

College Station Computer Science (CSCS) community website - a static site with blog, events, and authentication. Built with Astro 5 + React 19, Tailwind CSS v4, PocketBase backend, and Catalyst UI Kit.

## Build Commands

```bash
npm run dev      # Start dev server at localhost:4321
npm run build    # Build production site to ./dist/
npm run preview  # Preview production build

npm run lint     # Run ESLint
npm run format   # Run Prettier (writes changes)

npm run test          # Run Vitest in watch mode
npm run test:run      # Run tests once (CI)
npm run test:coverage # Run tests with v8 coverage
```

## Code Style

### Formatting

Prettier handles formatting via `npm run format`. Configuration:

- Uses `prettier-plugin-astro` for `.astro` files
- Uses `prettier-plugin-tailwindcss` for class sorting
- Default Prettier settings (no explicit config for quotes, semicolons, etc.)

### Linting

ESLint with TypeScript, Astro, and jsx-a11y plugins. Key rules:

- `@typescript-eslint/no-explicit-any` is disabled
- Astro recommended + jsx-a11y recommended rules enabled
- Ignored directories: `.astro/`, `dist/`, `node_modules/`, `backend/`

### TypeScript

Strict mode enabled via `astro/tsconfigs/strict`. React JSX configured.

- Use explicit types for function parameters and return values
- Interfaces preferred for object shapes (see `EventData`, `AuthUser`)
- Use `type` for unions and simple type aliases

### Imports

1. External packages (`react`, `astro:content`, `@headlessui/react`)
2. Internal lib (`../lib/pocketbase`)
3. Components (`./catalyst/button`, `../components/Header`)

### Naming Conventions

- **Files**: kebab-case for pages (`create-event.astro`), PascalCase for components (`EventForm.tsx`)
- **Components**: PascalCase (`Header`, `Newsletter`, `LoginForm`)
- **Functions**: camelCase (`handleSubmit`, `getCurrentUser`, `formatDate`)
- **Interfaces**: PascalCase with descriptive names (`AuthUser`, `EventData`, `RegisterData`)
- **Constants**: camelCase for module-level (`navigation`, `styles`)

### React Components

- Use function components with hooks (no class components)
- Export default for page-level components (`export default function Header()`)
- Named exports for utility components (`export const Button`, `export function TouchTarget`)
- Use `"use client"` directive for components that need client-side features

### Dark Mode

All components must support dark mode:

- Add `dark:` variants to Tailwind classes
- Use zinc color palette for neutrals (works in both modes)

### Error Handling

Use try/catch with typed error handling. Display user-friendly messages in UI:

```typescript
try {
  await someAsyncOperation();
} catch (err) {
  setError(err instanceof Error ? err.message : "Operation failed");
}
```

### Async Operations

Use async/await with loading state. Disable submit buttons during operations:

```typescript
const [isLoading, setIsLoading] = useState(false);
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setIsLoading(true);
  try {
    await apiCall();
  } finally {
    setIsLoading(false);
  }
}
```

## Architecture

### File Structure

```
src/
  components/        # React components
    catalyst/        # UI kit (don't modify unless necessary)
  content/blog/      # Markdown blog posts
  layouts/           # Astro layouts
  lib/               # Shared utilities (pocketbase.ts)
  pages/             # File-based routing (app/, blog/)
  stores/            # React state (authStore.ts)
  styles/            # Global CSS
  test/              # Test setup, mocks, and factories
```

### Routing

File-based routing in `src/pages/`:

- `/` - Home page with hero, newsletter, footer
- `/blog` - Blog listing (sorted by date, newest first)
- `/blog/[slug]` - Individual posts (dynamic routes from content collection)

### Astro Pages

- Use `.astro` files for pages
- Import `Layout` from `../layouts/Layout.astro` — accepts `title` and `description` props for SEO
- Import `Header` and `Footer` for consistent page structure
- Frontmatter goes between `---` fences at top

### React Hydration

Use the minimal hydration directive needed. Prefer static rendering for performance.

- `client:only="react"` - Auth-dependent components (Header)
- `client:load` - Interactive on page load (use sparingly)
- `client:visible` - Lazy load when scrolled into view
- No directive - Static, no JavaScript shipped

### Catalyst UI Kit

Located in `src/components/catalyst/`. Use these for consistency:

- `Button` - All buttons (supports `color`, `outline`, `plain` variants)
- `Input`, `Textarea`, `Select` - Form inputs
- `Field`, `Label`, `ErrorMessage` - Form field wrappers
- `Heading`, `Text` - Typography
- `Alert`, `Dialog` - Modals and notifications

### Styling

Tailwind CSS v4 with utilities-first approach:

- Color palette: `zinc` (neutrals) + `indigo` (accent)
- Container: `max-w-7xl` for layout, `max-w-3xl` for content
- Spacing: `px-6 lg:px-8` (horizontal), `py-24 sm:py-32` (vertical)
- Responsive breakpoints: `sm:` (640px), `lg:` (1024px)
- Typography: Use Catalyst `<Heading>`, `<Text>` components; blog content uses Tailwind Typography (`prose` classes with dark mode)

### Backend Integration

PocketBase client in `src/lib/pocketbase.ts`:

- Use `pb.collection('name')` for CRUD operations
- Auth functions: `login()`, `logout()`, `register()`, `getCurrentUser()`
- Use `useAuth()` hook in React components for auth state

## Content Collections

Blog posts are Markdown files in `src/content/blog/` with Zod schema (defined in `src/content/config.ts`):

```typescript
{
  title: string
  description: string
  pubDate: Date
  author: string
  image?: string
  tags: string[] (default: [])
}
```

Required frontmatter example:

```markdown
---
title: "Post Title"
description: "Brief description"
pubDate: 2025-01-10
author: "Author Name"
tags: ["tag1", "tag2"]
---
```

Posts use `getStaticPaths()` for build-time generation.

## Key Patterns

### Adding a New Page

1. Create `src/pages/your-page.astro`
2. Import and use `Layout` wrapper with title/description
3. Import `Header` and `Footer` for consistency
4. Use Catalyst components for UI elements

### Adding a Blog Post

1. Create `src/content/blog/your-slug.md`
2. Add frontmatter with required fields (see schema above)
3. Write content in Markdown
4. Build will generate `/blog/your-slug` automatically

### Creating Interactive Components

1. Use `.tsx` files for React components with state/interactivity
2. Import from `src/components/catalyst/` for UI primitives
3. Add to Astro pages with appropriate `client:*` directive
4. Keep components small and focused

## Important Notes

- **Testing** — Run `npm run test:run` to verify changes; see test files in `src/` for patterns
- **No backend** - Forms don't submit anywhere yet
- **Content is Markdown** - Not a CMS or database
- **Static output** - All routes generated at build time
- Uses **npm** (not yarn/pnpm) — enforced by deny rules in `.claude/settings.json`
- **TypeScript** enabled with strict mode
- PocketBase backend runs separately (see `backend/README.md`)

## Worktree Workflow (Required)

All new units of work (features, bugfixes, refactors) **must** be performed in a discrete git worktree — never directly in the main working tree.

### Canonical Directory

Worktrees live in `.claude/worktrees/` (gitignored). `EnterWorktree` creates them here automatically. Example path: `.claude/worktrees/issue-42-add-dark-mode/`.

### Rules

- Use `EnterWorktree` before beginning any implementation work
- A `PreToolUse` hook enforces this: edits to project files outside a worktree are **denied**
- **Exception**: `.claude/` configuration changes (hooks, settings) are allowed in the main tree
- One worktree per unit of work — keeps changes isolated and reviewable
