# ADR 0002: Static Site Generation with Astro

**Status**: Accepted

**Date**: 2026-02-28

## Context

The cscs.dev website is a community hub for the College Station Computer Science group. It serves a blog, event listings, newsletter signup, and user authentication. Most of the content — blog posts, the landing page, SEO metadata — is not user-specific and does not change between requests.

The team is comfortable with React for building interactive UI components. However, shipping a full React single-page application would mean sending a large JavaScript bundle to the browser for pages that are fundamentally static content.

Performance and simplicity of deployment are priorities. The site should be hostable on any static file server or CDN without requiring a Node.js runtime in production.

## Decision

We will build the frontend using Astro 5 with `output: "static"`, producing a fully pre-rendered static site at build time. Interactive components (authentication, event RSVP, form handling) will use React 19 via Astro's islands architecture, hydrated selectively with `client:load`, `client:visible`, and `client:only="react"` directives.

The Astro configuration sets `site: "https://cscs.dev"` and uses the React and Sitemap integrations. Tailwind CSS v4 is loaded through Astro's Vite plugin pipeline.

## Consequences

- Pages are pre-rendered to static HTML, enabling zero-latency delivery from a CDN edge with no server-side compute.
- No Node.js server is needed in production for the frontend — the build output is plain files in `./dist/`.
- React is available where interactivity is genuinely needed (auth flows, forms, dynamic event lists) without shipping JavaScript for static content.
- Blog posts and pages require a rebuild to update, since all routes are generated at build time.
- Client-side authentication cannot enforce server-side route protection — protected pages are served as static HTML with client-side auth checks.
- The `PUBLIC_POCKETBASE_URL` environment variable is resolved at build time, not at request time.
