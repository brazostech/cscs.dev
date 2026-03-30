# Project Audit — 2026-02-28

Comprehensive audit of the CSCS community website (cscs.dev) covering project health, content completeness, code quality, and recommended next steps.

---

## Executive Summary

**Overall Score: 85/100** — The project is well-built with modern tooling (Astro 5 + React 19 + Tailwind 4), a solid CI/CD pipeline, and comprehensive event management features. The main gaps are placeholder links awaiting pages, limited test coverage, outdated documentation, and unclear production deployment.

---

## Project Stats

| Metric            | Count                                     |
| ----------------- | ----------------------------------------- |
| Pages             | 13 (5 public, 8 authenticated/app)        |
| React Components  | 12 custom + 28 Catalyst UI Kit            |
| Blog Posts        | 3 published                               |
| Test Files        | 2 (EventForm: 50+ tests, PocketBase RSVP) |
| NPM Scripts       | 13                                        |
| CI Pipeline Steps | 6 (lint, format, test, build, storybook)  |

---

## What's Working Well

- **Modern stack**: Astro 5.16, React 19, Tailwind CSS 4, TypeScript strict mode
- **CI/CD pipeline**: GitHub Actions runs lint, format check, tests, build, and Storybook
- **Content quality**: All 3 blog posts have valid frontmatter and substantive content (no lorem ipsum)
- **SEO**: Layout includes OG tags, Twitter cards, JSON-LD Organization schema, canonical URLs, sitemap, robots.txt
- **Dark mode**: Comprehensive `dark:` support across all components
- **Accessibility**: ARIA labels, `sr-only` text, semantic HTML, `eslint-plugin-jsx-a11y` configured
- **Backend integration**: PocketBase with auth, events, RSVP, recurring event support
- **Developer tooling**: ESLint, Prettier, Husky hooks, Storybook, Vitest + React Testing Library
- **Container support**: Podman Compose for local dev (frontend + PocketBase)
- **All external links verified working** (Discord, Meetup, YouTube, GitHub)

---

## Issues Found

### HIGH — Broken Links / Placeholder Pages

#### 1. Footer "About" link is a placeholder

- **File**: `src/components/Footer.tsx:5`
- **Issue**: `href: "#"` — navigates nowhere
- **Fix**: Create `/about` page, update link

#### 2. Footer "Contact" link is a placeholder

- **File**: `src/components/Footer.tsx:9`
- **Issue**: `href: "#"` — navigates nowhere
- **Fix**: Create `/contact` page, update link

#### 3. Newsletter "privacy policy" link is a placeholder

- **File**: `src/components/Newsletter.tsx:92`
- **Issue**: `href="#"` — text says "Read our privacy policy" but links nowhere
- **Fix**: Create `/privacy` page, update link. Especially important since the site collects emails and has user registration.

### HIGH — Functionality Gaps

#### 4. Newsletter form may not work in production

- **File**: `src/components/Newsletter.tsx:67`
- **Issue**: Uses `data-netlify="true"` for Netlify Forms, but the site infrastructure uses Podman/PocketBase — no evidence of Netlify deployment. Form submissions may silently fail.
- **Fix**: Integrate with PocketBase (newsletter collection) or a third-party email service. Verify form submissions are actually captured.

### MEDIUM — Code Quality

#### 5. Hero images lack proper decorative attributes

- **File**: `src/components/Hero.tsx:132,142,150,160,168`
- **Issue**: 5 Unsplash images have `alt=""` but no `role="presentation"` or `aria-hidden="true"` to explicitly mark as decorative.
- **Fix**: Add `role="presentation" aria-hidden="true"` to each decorative image.

#### 6. Copyright year is hardcoded

- **File**: `src/components/Footer.tsx:90`
- **Issue**: `© 2025 College Station Computer Science` — will be stale in future years
- **Fix**: Use `{new Date().getFullYear()}` for dynamic year

#### 7. Catalyst link component TODO not resolved

- **File**: `src/components/catalyst/link.tsx:2`
- **Issue**: `// TODO: Update this component to use your client-side framework's link`
- **Fix**: Since this is a static Astro site, remove the TODO or document that `<a>` tags are the correct approach.

#### 8. Field naming inconsistency: `time_zone` vs `timeZone`

- **Referenced in**: `IMPROVEMENTS.md` Phase 3 backlog
- **Issue**: PocketBase uses `time_zone` (snake_case) while JS convention is `timeZone` (camelCase). No clear mapping layer.
- **Fix**: Standardize naming and add explicit mapping in `src/lib/pocketbase.ts`

### MEDIUM — Testing

#### 9. Limited test coverage

- **Current**: Only `EventForm.test.tsx` (50+ tests) and `pocketbase.test.ts` (RSVP functions)
- **Missing**: LoginForm, RegisterForm, AccountDashboard, Header, ScheduleEvents, Newsletter, Footer
- **Fix**: Prioritize tests for auth components (LoginForm, RegisterForm) and ScheduleEvents

### MEDIUM — Documentation

#### 10. CLAUDE.md says "No test suite configured" — inaccurate

- **File**: `CLAUDE.md`
- **Issue**: States "No test suite is configured" and "No test infrastructure — manual testing required." This is outdated — the project has Vitest, React Testing Library, 50+ tests, and CI-integrated testing.
- **Fix**: Update CLAUDE.md with test commands and remove the outdated notes.

#### 11. CLAUDE.md missing auth, events, and app page documentation

- **File**: `CLAUDE.md`
- **Issue**: Documents the original static site but not: login/register/account pages, PocketBase integration, auth store, EventForm, ScheduleEvents, AppLayout, Storybook, container setup.
- **Fix**: Add sections for backend integration, auth architecture, new pages, and new components.

### LOW — Enhancements

#### 12. No RSS feed for blog

- **Issue**: Blog has 3 posts and content collections but no RSS feed
- **Fix**: Install `@astrojs/rss`, create `src/pages/rss.xml.ts`, add autodiscovery `<link>` tag

#### 13. No web analytics

- **Issue**: No tracking configured (Google Analytics, Plausible, etc.)
- **Fix**: Choose privacy-friendly analytics, add to Layout, update privacy policy

#### 14. No deployment documentation or CI/CD deploy step

- **Issue**: `astro.config.mjs` sets site to `https://cscs.dev` but there's no hosting configuration, no deploy step in CI, and no production environment docs.
- **Fix**: Document production hosting, add CI deploy step, document environment variable management.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│                   Browser                    │
│  ┌─────────┐  ┌──────┐  ┌───────────────┐  │
│  │ Static  │  │ Blog │  │  App (Auth'd)  │  │
│  │ Pages   │  │      │  │  Dashboard     │  │
│  │ /, etc. │  │ /blog│  │  Events, RSVP  │  │
│  └────┬────┘  └──┬───┘  └───────┬───────┘  │
└───────┼──────────┼───────────────┼──────────┘
        │          │               │
┌───────┴──────────┴───────────────┴──────────┐
│              Astro Static Build              │
│    (React Islands with client:* directives)  │
│    Catalyst UI Kit  |  Tailwind CSS v4       │
└───────────────────────┬─────────────────────┘
                        │
                  ┌─────┴─────┐
                  │ PocketBase │
                  │   (8080)   │
                  │  - Users   │
                  │  - Events  │
                  │  - RSVPs   │
                  └────────────┘
```

---

## Recommended Priority Order

1. **Fix newsletter form** (users think they're signing up but data may be lost)
2. **Create privacy policy page** (collecting emails without a policy)
3. **Create about & contact pages** (broken navigation links)
4. **Update CLAUDE.md** (developers get incorrect guidance)
5. **Expand test coverage** (auth forms are untested)
6. **Fix copyright year** (quick win)
7. **Add RSS feed** (standard blog feature)
8. **Resolve Catalyst link TODO** (tech debt cleanup)
9. **Add deployment docs** (needed for production)
10. **Add analytics** (understand traffic)
11. **Standardize field naming** (prevent future bugs)
12. **Fix decorative image attributes** (accessibility)
