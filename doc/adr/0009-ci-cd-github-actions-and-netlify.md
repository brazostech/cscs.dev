# ADR 0009: CI/CD — GitHub Actions and Netlify

**Status**: Accepted

**Date**: 2026-02-28

## Context

Code changes must be validated before they go live. The project uses GitHub as the source of truth. Two concerns exist: validation (does the code pass lint, format, tests, and build?) and deployment (how does validated code reach production?).

These are handled by two separate systems. GitHub Actions provides a configurable CI pipeline. Netlify provides automatic deployment with its native GitHub integration. The question is whether to unify them or keep them separate.

## Decision

We will use GitHub Actions for the CI validation pipeline and Netlify's native GitHub integration for deployment. These two systems operate independently.

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and on every pull request targeting `main`. It executes these validation steps: Node pin check, lint (ESLint), format check (Prettier `--check`), typecheck (`astro check`), tests (Vitest), Astro build, and Storybook build. The amendments below add a pin check (#79) and, for #84, a PocketBase pin check and PocketBase API rule tests.

Netlify watches the same repository and deploys independently when it detects a push to `main`, using its own auto-detected Astro build settings. Netlify is not triggered by or dependent on the GitHub Actions workflow.

## Consequences

- CI catches lint errors, formatting issues, test failures, and build errors before or after merge, depending on whether branch protection rules require status checks.
- Netlify deployment is fast and requires no deploy step in the CI workflow — it is fully managed.
- Pull request deploy previews from Netlify are available for visual review.
- CI and deployment are decoupled. A push to `main` can fail CI but still deploy to Netlify, since Netlify does not wait for GitHub Actions to pass. This is a known gap; see the 2026-11-01 amendment for #80 below, which narrows it.
- There is no staging environment. Every merge to `main` deploys directly to production on Netlify.
- The Astro build runs twice on every push to `main` — once in GitHub Actions (for validation) and once in Netlify (for deployment). This is redundant but acceptable at the current scale.
- CI runs on `ubuntu-latest`. The build artifact produced by CI is discarded — Netlify builds its own artifact.

## Amendment (2026-11-01, #79)

- CI previously used Node.js 20 (end of life 2026-04-30). `.nvmrc` now pins Node 22 and `engines.node` requires `>=22.12`.
- CI reads `.nvmrc` through `setup-node`. The `Containerfile` base image and `netlify.toml` (`NODE_VERSION`) each state the major version explicitly, because neither can read `.nvmrc`; a CI step fails when either differs from `.nvmrc`. A `netlify.toml` setting overrides a `NODE_VERSION` set in the Netlify UI.
- The format check now runs `prettier --check` (`npm run format:check`). The previous command expanded to `prettier --write . --check` and could not fail.
- A typecheck step (`astro check`) was added.
- The workflow declares `permissions: contents: read` and a concurrency group that cancels superseded runs on pull requests only.

## Amendment (2026-11-01, #80)

- [ADR 0012](0012-branch-protection-via-repository-ruleset.md) protects `main` with a ruleset: changes land only through squash-merged pull requests whose `build` and Netlify `deploy-preview` checks passed. This narrows the known gap above rather than closing it: a change can still deploy without a passing CI run on its final merged state, through an admin bypass or because the checks are not strict.

## Amendment (2026-11-02, #81)

- `engines.node` now requires `>=22.23.4`, the floor set by astro 7.4.2 and `@astrojs/react` 7.1.1 (jsdom 30 needs `^22.22.2`). This supersedes the `>=22.12` floor in the #79 amendment.
- `.nvmrc`, the `Containerfile` base image and `netlify.toml` still state only the major version (22), so they track the latest 22.x. The CI pin check compares only the major. A local Node, a cached image or a Netlify build image older than 22.23.4 passes that check and then fails when `astro` starts.

## Amendment (2026-11-02, #84)

- Two steps were added: a PocketBase pin check (the version in `backend/Containerfile`, `podman-compose.yaml` and `backend/scripts/pocketbase-download.mjs` must agree; see the #86 amendment) and `npm run test:pb`, which runs the PocketBase API rule tests (`backend/test/`). A cache step for the downloaded PocketBase release (`actions/cache`) sits before the tests, and the job has `timeout-minutes: 15`.
- `test:pb` downloads the pinned PocketBase release from `github.com/pocketbase/pocketbase/releases`, verifies its SHA-256 against checksums stored in that module, and runs it on a random local port against a temporary data directory with this repo's migrations. It never contacts the production API, and it does not use a local `backend/pocketbase` binary.
- The required `build` check (ADR 0012) now depends on that download whenever the cache misses. If GitHub's release CDN is unavailable the download retries three times, then `build` fails. A checksum mismatch fails the job and is never retried. A failed run is re-run, or, as for any stuck check, covered by the admin bypass ADR 0012 reserves.

## Amendment (2026-11-02, #86)

- `backend/pocketbase` is no longer committed. It is gitignored, and `make pocketbase` (in `backend/`) installs it.
- The PocketBase version, SHA-256 checksums and verified download moved from the test harness to `backend/scripts/pocketbase-download.mjs`. The harness and `make pocketbase` both import it. The pin check and the cache key in `ci.yml` follow that file.
- After `test:pb`, CI runs `make -C backend pocketbase` twice (install, then no-op) and checks the version against the Containerfile.
- The image build still downloads PocketBase without a checksum check (#122).

## Amendment (2026-11-02, #119)

- `setup-node` now runs with `check-latest: true`. Without it, setup-node accepted any Node 22 in the runner's tool cache, so a runner cached at 22.23.3 failed `engines.node >=22.23.4` (main run 41374299584, PR #130 run 41482663555). With it, setup-node resolves the newest 22.x and downloads it when the cache is older.
- A step right after setup-node fails the job if `node --version` does not satisfy `engines.node`, so a stale Node fails with a clear message instead of an `EBADENGINE` warning later. It supports only a `>=X.Y.Z` range and fails on any other form.
- Cost: when the cache is stale, setup-node downloads Node, which adds seconds to the run.
