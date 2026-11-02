# ADR 0009: CI/CD — GitHub Actions and Netlify

**Status**: Accepted

**Date**: 2026-02-28

## Context

Code changes must be validated before they go live. The project uses GitHub as the source of truth. Two concerns exist: validation (does the code pass lint, format, tests, and build?) and deployment (how does validated code reach production?).

These are handled by two separate systems. GitHub Actions provides a configurable CI pipeline. Netlify provides automatic deployment with its native GitHub integration. The question is whether to unify them or keep them separate.

## Decision

We will use GitHub Actions for the CI validation pipeline and Netlify's native GitHub integration for deployment. These two systems operate independently.

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and on every pull request targeting `main`. It executes seven steps: Node pin check, lint (ESLint), format check (Prettier `--check`), typecheck (`astro check`), tests (Vitest), Astro build, and Storybook build. See the 2026-11-01 amendment below.

Netlify watches the same repository and deploys independently when it detects a push to `main`, using its own auto-detected Astro build settings. Netlify is not triggered by or dependent on the GitHub Actions workflow.

## Consequences

- CI catches lint errors, formatting issues, test failures, and build errors before or after merge, depending on whether branch protection rules require status checks.
- Netlify deployment is fast and requires no deploy step in the CI workflow — it is fully managed.
- Pull request deploy previews from Netlify are available for visual review.
- CI and deployment are decoupled. A push to `main` can fail CI but still deploy to Netlify, since Netlify does not wait for GitHub Actions to pass. This is a known gap.
- There is no staging environment. Every merge to `main` deploys directly to production on Netlify.
- The Astro build runs twice on every push to `main` — once in GitHub Actions (for validation) and once in Netlify (for deployment). This is redundant but acceptable at the current scale.
- CI runs on `ubuntu-latest`. The build artifact produced by CI is discarded — Netlify builds its own artifact.

## Amendment (2026-11-01, #79)

- CI previously used Node.js 20 (end of life 2026-04-30). `.nvmrc` now pins Node 22 and `engines.node` requires `>=22.12`.
- CI reads `.nvmrc` through `setup-node`. The `Containerfile` base image and `netlify.toml` (`NODE_VERSION`) each state the major version explicitly, because neither can read `.nvmrc`; a CI step fails when either differs from `.nvmrc`. A `netlify.toml` setting overrides a `NODE_VERSION` set in the Netlify UI.
- The format check now runs `prettier --check` (`npm run format:check`). The previous command expanded to `prettier --write . --check` and could not fail.
- A typecheck step (`astro check`) was added.
- The workflow declares `permissions: contents: read` and a concurrency group that cancels superseded runs on pull requests only.
