# ADR 0012: Branch Protection via Repository Ruleset

**Status**: Accepted

**Date**: 2026-11-01

## Context

Every merge to `main` deploys to production on Netlify (ADR 0003, ADR 0009), and Netlify does not wait for GitHub Actions. Until 2026-11-01, `main` had no branch protection and no rulesets. Anyone with write access could push straight to `main`, force-push or delete it, or merge a pull request with failing CI. ADR 0009 recorded this as a known gap.

The repository also allowed all three merge methods, so history mixed merge commits with the Conventional Commits that `AGENTS.md` requires. Merged branches were not deleted, auto-merge was off, and secret scanning, push protection and Dependabot security updates were all disabled.

The project has two active committers, so a mandatory human approval would stall work without adding review. Netlify posts a `netlify/cscsdev/deploy-preview` status on pull requests, but it does not always post it: fork pull requests and skipped builds report nothing. A required check that never reports blocks the merge permanently.

## Decision

We will protect `main` with a repository ruleset named `main`, and tighten the repository's merge and security settings. These settings live in GitHub, not in the repository, so this ADR is their record.

**Ruleset `main`** targets the default branch (`~DEFAULT_BRANCH`) and is enforced. It:

- blocks deletion and force-pushes;
- requires a pull request, with 0 required approvals and required conversation resolution, and allows only squash as the merge method. Stale-review dismissal and last-push approval are off, and `require_extra_approval_for_unattributed_changes` is on (a no-op while no approval is required);
- requires the `build` status check from GitHub Actions (the single job in `.github/workflows/ci.yml`, which runs lint, format check, typecheck, tests, the Astro build and the Storybook build). The check is not strict: a branch does not need to be up to date with `main` before it merges;
- lets repository admins bypass the ruleset in `pull_request` mode only. This is an emergency valve: an admin can merge a pull request past a failing check, but cannot push directly to `main`.

**Netlify `deploy-preview` is deliberately not required.** Because Netlify does not always report it (the context is named `netlify/cscsdev/deploy-preview`), requiring it would block some merges with no way to satisfy it. The `build` job already runs the Astro build, so a build failure is caught without it. The preview is still produced for visual review. The three neutral Netlify check-runs are not required either.

**Merge settings.** Squash is the only enabled merge method. The squash commit uses the pull request title as its subject and the pull request body as its message. Auto-merge is allowed, head branches are deleted on merge, and "update branch" is allowed.

**Security settings.** Secret scanning, push protection, Dependabot alerts and Dependabot security updates are enabled.

**CODEOWNERS** is not part of this decision. It stays in #45, because its draft names teams that do not exist.

## Consequences

- A direct push to `main`, a force-push or a deletion is rejected, and a pull request with a failing or missing `build` check cannot be merged. Netlify now deploys only merges of pull requests whose `build` passed on the branch, except for an admin bypass. Because the check is not strict, that is not a guarantee that the merged result passes (see below).
- History on `main` is linear, with one commit per pull request. The pull request title becomes the commit subject and the body becomes the commit message, so the title should be a Conventional Commit and the body should read as a commit message. Nothing enforces the title format; it is a convention. Dependabot pull requests are not configured with a `commit-message` prefix, so their titles are not Conventional Commits unless edited before merge. Intermediate branch commits are discarded on merge.
- Auto-merge lets a pull request merge itself once `build` passes, and merged branches no longer pile up.
- Because the check is not strict, two pull requests that each pass `build` can merge in sequence and break `main`, as `build` never ran on the combined result. This is accepted at the current scale. CI also runs on every push to `main`, so a break is reported after the fact, but Netlify still deploys it first.
- There is no required human review. Review is by convention, and conversations must be resolved before merge.
- Pull requests from forks and pull requests where Netlify skips the build are not blocked by a missing preview status. A fork pull request still waits for a maintainer to approve its workflow run before `build` reports.
- The admin bypass is a standing exception that depends on trusting repository admins. Using it should be rare and explained in the pull request.
- Secret scanning with push protection blocks pushes that contain known credential patterns. Dependabot security updates open pull requests for vulnerable dependencies, and these pull requests must pass `build` like any other.
- The ruleset and settings are not stored in the repository, so a change in GitHub's settings page is not reviewed. Changes to them need a new or amended ADR.
