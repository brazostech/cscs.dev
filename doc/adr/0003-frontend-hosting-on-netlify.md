# ADR 0003: Frontend Hosting on Netlify

**Status**: Accepted

**Date**: 2026-02-28

## Context

The frontend is a static build artifact (see [ADR 0002](0002-static-site-generation-with-astro.md)). It needs hosting that auto-deploys on push to the main branch, provides a global CDN, and handles custom domains with TLS — all without operational overhead. Budget is minimal since this is a community project.

Alternatives considered included GitHub Pages, Cloudflare Pages, and Vercel. All would work for static hosting, but the team chose to move forward with Netlify due to familiarity and its built-in form handling capability.

## Decision

We will host the static frontend on Netlify under the project name `cscsdev`, connected directly to the GitHub repository. Netlify auto-detects the Astro framework and runs the build on every push to main. No `netlify.toml` configuration file is maintained in the repository — Netlify's auto-detection handles build commands and publish directory correctly.

The custom domain `cscs.dev` is configured through Netlify's domain management. The newsletter form uses `data-netlify="true"` to leverage Netlify Forms for submission capture.

## Consequences

- Zero infrastructure to manage for the frontend — no servers, no containers, no CDN configuration.
- Automatic deploy previews are available for pull requests, enabling visual review before merge.
- SSL/TLS is handled automatically by Netlify for the custom domain.
- A Netlify status badge in `README.md` provides instant build status visibility.
- Netlify is an external dependency; outages or pricing changes affect site availability.
- Deployment is not gated by CI — Netlify builds and deploys independently of the GitHub Actions workflow (see [ADR 0009](0009-ci-cd-github-actions-and-netlify.md)), so a push could fail CI checks but still deploy to production.
- The absence of a `netlify.toml` means build configuration is not version-controlled. If Netlify's auto-detection behavior changes, the build could break without a code change.
