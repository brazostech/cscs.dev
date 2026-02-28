# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

College Station Computer Science (CSCS) community website - a static site with blog, newsletter signup, and event information. Built with Astro 5 + React 19, styled with Tailwind CSS v4, using the Catalyst UI Kit for components.

## Commands

```bash
npm run dev      # Start dev server at localhost:4321 (or 4322 if in use)
npm run build    # Build production site to ./dist/
npm run preview  # Preview production build locally
```

**Note**: No test suite is configured.

## Architecture Overview

### Framework: Astro with React Islands

- **Astro** handles routing, SSR, and static generation
- **React components** hydrated selectively with `client:*` directives
  - `client:load` - Critical interactive components (Header)
  - `client:visible` - Lazy-loaded on scroll (Newsletter)
  - Default is static/no hydration

### Routing

File-based routing in `src/pages/`:

- `/` - Home page with hero, newsletter, footer
- `/blog` - Blog listing (sorted by date, newest first)
- `/blog/[slug]` - Individual posts (dynamic routes from content collection)

### Content Collections

Blog posts are Markdown files in `src/content/blog/` with Zod schema:

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

Posts use `getStaticPaths()` for build-time generation. Schema defined in `src/content/config.ts`.

### Component Organization

**Catalyst UI Kit** (`src/components/catalyst/`)

- 28 pre-built components from Tailwind UI
- Based on Headless UI + clsx
- Use these for consistency: Button, Input, Heading, Text, Field, Label, etc.

**Page Components** (`src/components/`)

- `Header.tsx` - Sticky navigation (React, interactive mobile menu)
- `Hero.tsx` - Landing page hero section
- `Newsletter.tsx` - Email signup form
- `Footer.tsx` - Site footer with links

**Shared Layout** (`src/layouts/Layout.astro`)

- Wraps all pages with HTML boilerplate
- Accepts `title` and `description` props for SEO

### Styling Conventions

**Tailwind CSS v4** with utilities-first approach:

- Color palette: `zinc` (neutrals) + `indigo` (accent)
- Dark mode: Use `dark:` prefix (based on `prefers-color-scheme`)
- Container: `max-w-7xl` for main layout, `max-w-3xl` for content
- Spacing: `px-6 lg:px-8` (horizontal), `py-24 sm:py-32` (vertical)
- Responsive: `sm:` (640px), `lg:` (1024px)

**Typography**:

- Use Catalyst components: `<Heading>`, `<Text>`, etc.
- Blog content: Tailwind Typography (`prose` classes with dark mode)

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

### Dark Mode

All components must support dark mode:

- Add `dark:` variants to Tailwind classes
- Test in both light and dark themes
- Use zinc color palette for neutrals (works in both modes)

## Component Hydration Strategy

- **Default (no directive)**: Static, no JavaScript shipped
- **`client:load`**: Hydrate immediately (use sparingly - Header only)
- **`client:visible`**: Hydrate when scrolled into view (Newsletter)
- Prefer static rendering for performance

## Important Notes

- **No test infrastructure** - manual testing required
- **No backend** - forms don't submit anywhere yet
- **Content is Markdown** - not a CMS or database
- **Build is static** - all routes generated at build time
- Uses **npm** (not yarn/pnpm)
- **TypeScript** enabled with strict mode

## Worktree Workflow (Required)

All new units of work (features, bugfixes, refactors) **must** be performed in a discrete git worktree — never directly in the main working tree.

### Rules
- Use `EnterWorktree` before beginning any implementation work
- A `PreToolUse` hook enforces this: edits to project files outside a worktree are **denied**
- **Exception**: `.claude/` configuration changes (hooks, settings) are allowed in the main tree
- One worktree per unit of work — keeps changes isolated and reviewable
