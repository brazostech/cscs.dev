#!/usr/bin/env bash
# Creates GitHub issues from the 2026-02-28 project audit.
# Prerequisites: gh CLI authenticated (run `gh auth login` first)
# Usage: bash scripts/create-audit-issues.sh

set -euo pipefail

REPO="brazostech/cscs.dev"

echo "Creating audit issues for $REPO..."
echo "Checking gh authentication..."
# gh auth status || { echo "ERROR: Run 'gh auth login' first."; exit 1; }
echo ""

# --- Issue 1: About page ---
gh issue create --repo "$REPO" \
  --title "Create About page (placeholder link in footer)" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

The Footer component (`src/components/Footer.tsx`, line 5) has an "About" navigation link that points to `href="#"` — a placeholder that goes nowhere.

## Current Behavior

Clicking "About" in the footer scrolls to the top of the page instead of navigating to an about page.

## Expected Behavior

An `/about` page should exist with information about the CSCS community, its mission, organizers, and meeting details.

## Files to Modify

- Create `src/pages/about.astro`
- Update `src/components/Footer.tsx` line 5: change `href: "#"` to `href: "/about"`

## Acceptance Criteria

- [ ] `/about` page exists with community information
- [ ] Footer link navigates to the new page
- [ ] Page uses Layout wrapper with proper SEO meta tags
- [ ] Dark mode supported
EOF
)"
echo "✓ Created: About page"

# --- Issue 2: Contact page ---
gh issue create --repo "$REPO" \
  --title "Create Contact page (placeholder link in footer)" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

The Footer component (`src/components/Footer.tsx`, line 9) has a "Contact" navigation link that points to `href="#"` — a placeholder that goes nowhere.

## Current Behavior

Clicking "Contact" in the footer scrolls to the top of the page instead of navigating to a contact page.

## Expected Behavior

A `/contact` page should exist with ways to reach the CSCS community (Discord, email, Meetup, etc.).

## Files to Modify

- Create `src/pages/contact.astro`
- Update `src/components/Footer.tsx` line 9: change `href: "#"` to `href: "/contact"`

## Acceptance Criteria

- [ ] `/contact` page exists with contact information
- [ ] Footer link navigates to the new page
- [ ] Page uses Layout wrapper with proper SEO meta tags
- [ ] Dark mode supported
EOF
)"
echo "✓ Created: Contact page"

# --- Issue 3: Privacy Policy ---
gh issue create --repo "$REPO" \
  --title "Create Privacy Policy page (placeholder link in newsletter)" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

The Newsletter component (`src/components/Newsletter.tsx`, line 92) contains a "privacy policy" link that points to `href="#"`. The text reads "We care about your data. Read our privacy policy." but the link goes nowhere.

## Current Behavior

Clicking the privacy policy link scrolls to the top of the page.

## Expected Behavior

A `/privacy` page should exist with a proper privacy policy, especially since the site collects email addresses via the newsletter signup form and has user registration.

## Files to Modify

- Create `src/pages/privacy.astro`
- Update `src/components/Newsletter.tsx` line 92: change `href="#"` to `href="/privacy"`

## Acceptance Criteria

- [ ] `/privacy` page exists with privacy policy content
- [ ] Newsletter link navigates to the new page
- [ ] Policy covers email collection (newsletter) and user registration data
- [ ] Page uses Layout wrapper with proper SEO meta tags
- [ ] Dark mode supported
EOF
)"
echo "✓ Created: Privacy Policy"

# --- Issue 4: Hero decorative images ---
gh issue create --repo "$REPO" \
  --title "Add decorative aria attributes to Hero images" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

The Hero component (`src/components/Hero.tsx`, lines 132, 142, 150, 160, 168) contains 5 decorative Unsplash images with empty `alt=""` attributes but no explicit decorative markers.

## Recommended Fix

Add `role="presentation"` and `aria-hidden="true"` to each decorative image:

```tsx
<img alt="" role="presentation" aria-hidden="true" src="..." />
```

## Files to Modify

- `src/components/Hero.tsx` — lines 131-171 (5 image elements)

## Acceptance Criteria

- [ ] All 5 decorative images have `role="presentation"` and `aria-hidden="true"`
- [ ] No accessibility warnings from eslint-plugin-jsx-a11y
EOF
)"
echo "✓ Created: Hero a11y"

# --- Issue 5: RSS feed ---
gh issue create --repo "$REPO" \
  --title "Add RSS feed for blog posts" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

The blog has 3 published posts and uses Astro content collections, but there is no RSS feed. RSS feeds are standard for blogs and allow readers to subscribe for updates.

## Recommended Implementation

1. Install `@astrojs/rss`
2. Create `src/pages/rss.xml.ts` to generate the feed
3. Add `<link rel="alternate" type="application/rss+xml">` to `src/layouts/Layout.astro`
4. Update `public/robots.txt` to reference the RSS feed

## Acceptance Criteria

- [ ] RSS feed accessible at `/rss.xml`
- [ ] Feed includes all blog posts with title, description, pubDate, and link
- [ ] Layout includes RSS autodiscovery `<link>` tag
- [ ] Feed validates against RSS spec
EOF
)"
echo "✓ Created: RSS feed"

# --- Issue 6: Analytics ---
gh issue create --repo "$REPO" \
  --title "Add web analytics integration" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

The site has no analytics configured. For a community website, understanding traffic patterns and popular content is valuable.

## Recommendation

Consider a privacy-friendly analytics solution like Plausible or Fathom, or use Google Analytics.

## Acceptance Criteria

- [ ] Analytics provider chosen and integrated
- [ ] Tracking code added to Layout.astro
- [ ] Privacy policy updated to reflect analytics usage
EOF
)"
echo "✓ Created: Analytics"

# --- Issue 7: Copyright year ---
gh issue create --repo "$REPO" \
  --title "Update copyright year in Footer to be dynamic" \
  --label "bug" \
  --body "$(cat <<'EOF'
## Summary

`src/components/Footer.tsx` line 90 has a hardcoded copyright year:

```tsx
&copy; 2025 College Station Computer Science. All rights reserved.
```

## Fix

```tsx
&copy; {new Date().getFullYear()} College Station Computer Science. All rights reserved.
```

## Files to Modify

- `src/components/Footer.tsx` — line 90
EOF
)"
echo "✓ Created: Copyright year"

# --- Issue 8: Newsletter form backend ---
gh issue create --repo "$REPO" \
  --title "Newsletter form uses Netlify Forms but site uses PocketBase" \
  --label "bug" \
  --body "$(cat <<'EOF'
## Summary

The Newsletter component (`src/components/Newsletter.tsx`) uses `data-netlify="true"` for form submission, but the site infrastructure uses Podman/PocketBase containers — there is no evidence of Netlify deployment.

## Impact

Newsletter signups may silently fail. Users see a success message but their email may not be stored anywhere.

## Recommended Fix

Either:
1. **Use PocketBase**: Create a newsletter collection and submit via the PocketBase client
2. **Use a third-party service**: SendGrid, Mailchimp, or ConvertKit API
3. **Confirm Netlify deployment**: If the site IS on Netlify, document this

## Files to Modify

- `src/components/Newsletter.tsx`
- Potentially `src/lib/pocketbase.ts`

## Acceptance Criteria

- [ ] Newsletter form submissions are actually captured and stored
- [ ] Success/error states accurately reflect submission result
- [ ] Form backend is documented
EOF
)"
echo "✓ Created: Newsletter backend"

# --- Issue 9: Test coverage ---
gh issue create --repo "$REPO" \
  --title "Expand test coverage beyond EventForm and PocketBase RSVP" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Test coverage is limited to two files:
- `src/components/EventForm.test.tsx` — 50+ tests
- `src/lib/pocketbase.test.ts` — RSVP function tests

## Components Without Tests

**High priority (interactive, stateful):**
- `LoginForm.tsx` — Authentication form
- `RegisterForm.tsx` — Registration form
- `AccountDashboard.tsx` — Account management
- `Header.tsx` — Navigation with mobile menu and auth state
- `ScheduleEvents.tsx` — Dynamic event schedule

**Medium priority:**
- `Newsletter.tsx` — Form submission
- `Hero.tsx` — CTA links
- `Footer.tsx` — Navigation links

## Acceptance Criteria

- [ ] LoginForm has tests for login flow, validation, and error states
- [ ] RegisterForm has tests for registration, validation, and error states
- [ ] Header has tests for navigation and mobile menu toggle
- [ ] ScheduleEvents has tests for event display and loading states
- [ ] Test coverage report shows meaningful improvement
EOF
)"
echo "✓ Created: Test coverage"

# --- Issue 10: CLAUDE.md test docs ---
gh issue create --repo "$REPO" \
  --title "CLAUDE.md states 'No test suite configured' but tests exist" \
  --label "documentation" \
  --body "$(cat <<'EOF'
## Summary

`CLAUDE.md` contains outdated statements:

> **Note**: No test suite is configured.
> **No test infrastructure** — manual testing required

The project now has Vitest, React Testing Library, 50+ tests, and CI-integrated testing with npm scripts (`test`, `test:run`, `test:ui`, `test:coverage`).

## Files to Modify

- `CLAUDE.md` — Update Commands section to include test commands and remove outdated notes

## Acceptance Criteria

- [ ] CLAUDE.md accurately reflects the current testing setup
- [ ] Test commands are documented
- [ ] "No test infrastructure" notes are removed
EOF
)"
echo "✓ Created: CLAUDE.md test docs"

# --- Issue 11: CLAUDE.md missing features ---
gh issue create --repo "$REPO" \
  --title "CLAUDE.md missing documentation for auth, events, and app pages" \
  --label "documentation" \
  --body "$(cat <<'EOF'
## Summary

`CLAUDE.md` documents the original static site but doesn't cover features added since.

## Missing Documentation

**Pages not listed:**
- `/login`, `/register`, `/account`, `/verify-email`
- `/schedule`, `/book-club`
- `/app/dashboard`, `/app/events`, `/app/create-event`

**Components not documented:**
- `LoginForm.tsx`, `RegisterForm.tsx`, `AccountDashboard.tsx`
- `EventForm.tsx`, `EventFormWrapper.tsx`, `ScheduleEvents.tsx`, `AppLayout.tsx`

**Architecture not covered:**
- PocketBase backend integration (`src/lib/pocketbase.ts`)
- Auth state management (`src/stores/authStore.ts`)
- Backend infrastructure (PocketBase, container setup)
- Storybook configuration

## Acceptance Criteria

- [ ] All pages documented in the Routing section
- [ ] New components listed in Component Organization
- [ ] PocketBase integration documented
- [ ] Auth architecture explained
- [ ] Storybook usage documented
EOF
)"
echo "✓ Created: CLAUDE.md missing features"

# --- Issue 12: Catalyst link TODO ---
gh issue create --repo "$REPO" \
  --title "Resolve Catalyst link component TODO comment" \
  --label "tech-debt" \
  --body "$(cat <<'EOF'
## Summary

`src/components/catalyst/link.tsx` line 2 contains:

```tsx
// TODO: Update this component to use your client-side framework's link
```

Since this is a static Astro site without a client-side router, standard `<a>` tags are the correct approach. The TODO should be removed or resolved.

## Acceptance Criteria

- [ ] TODO comment resolved or removed with rationale
- [ ] Link component works correctly for all navigation needs
EOF
)"
echo "✓ Created: Catalyst link TODO"

# --- Issue 13: Field naming ---
gh issue create --repo "$REPO" \
  --title "Standardize time_zone vs timeZone field naming" \
  --label "tech-debt" \
  --body "$(cat <<'EOF'
## Summary

As noted in `IMPROVEMENTS.md` Phase 3 backlog, there is inconsistency in timezone field naming. PocketBase uses `time_zone` (snake_case) while JavaScript conventions use `timeZone` (camelCase).

## Impact

Can cause bugs when mapping between frontend and backend data in EventForm and ScheduleEvents.

## Recommended Fix

- Use `time_zone` for PocketBase field names (database convention)
- Use `timeZone` in TypeScript/React code
- Add clear mapping layer in `src/lib/pocketbase.ts`

## Acceptance Criteria

- [ ] Consistent naming convention documented
- [ ] Frontend code uses camelCase consistently
- [ ] Mapping between frontend and backend field names is explicit
EOF
)"
echo "✓ Created: Field naming"

# --- Issue 14: Deployment docs ---
gh issue create --repo "$REPO" \
  --title "Add deployment documentation and production hosting setup" \
  --label "documentation" --label "infrastructure" \
  --body "$(cat <<'EOF'
## Summary

The project has container support for local development but no clear production deployment setup.

## Current State

- `astro.config.mjs` sets site to `https://cscs.dev`
- Local dev uses Podman Compose (frontend + PocketBase)
- `backend/deploy.sh` exists but target is unclear
- CI pipeline builds but doesn't deploy
- No Vercel, Netlify, or cloud hosting configuration

## Missing

- Production deployment documentation
- CI/CD deployment step (deploy on merge to main)
- Environment variable management for production
- PocketBase production hosting guide

## Acceptance Criteria

- [ ] Production hosting provider documented
- [ ] CI/CD pipeline includes deploy step
- [ ] Environment variables documented for production
- [ ] PocketBase production setup documented
EOF
)"
echo "✓ Created: Deployment docs"

echo ""
echo "=== All 14 audit issues created successfully ==="
