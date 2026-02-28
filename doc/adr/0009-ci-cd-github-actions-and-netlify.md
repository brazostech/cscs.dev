# ADR 0009: CI/CD — GitHub Actions and Netlify

**Status**: Accepted

**Date**: 2026-02-28

## Context

Code changes must be validated before they go live. The project uses GitHub as the source of truth. Two concerns exist: validation (does the code pass lint, format, tests, and build?) and deployment (how does validated code reach production?).

These are handled by two separate systems. GitHub Actions provides a configurable CI pipeline. Netlify provides automatic deployment with its native GitHub integration. The question is whether to unify them or keep them separate.

## Decision

We will use GitHub Actions for the CI validation pipeline and Netlify's native GitHub integration for deployment. These two systems operate independently.

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and on every pull request targeting `main`. It executes six steps: lint (ESLint), format check (Prettier `--check`), tests (Vitest), Astro build, and Storybook build.

Netlify watches the same repository and deploys independently when it detects a push to `main`, using its own auto-detected Astro build settings. Netlify is not triggered by or dependent on the GitHub Actions workflow.

## Consequences

- CI catches lint errors, formatting issues, test failures, and build errors before or after merge, depending on whether branch protection rules require status checks.
- Netlify deployment is fast and requires no deploy step in the CI workflow — it is fully managed.
- Pull request deploy previews from Netlify are available for visual review.
- CI and deployment are decoupled. A push to `main` can fail CI but still deploy to Netlify, since Netlify does not wait for GitHub Actions to pass. This is a known gap.
- There is no staging environment. Every merge to `main` deploys directly to production on Netlify.
- The Astro build runs twice on every push to `main` — once in GitHub Actions (for validation) and once in Netlify (for deployment). This is redundant but acceptable at the current scale.
- CI uses Node.js 20 on `ubuntu-latest`. The build artifact produced by CI is discarded — Netlify builds its own artifact.
