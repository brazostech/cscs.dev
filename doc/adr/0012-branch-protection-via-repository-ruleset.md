# ADR 0012: Branch Protection via Repository Ruleset

**Status**: Accepted

**Date**: 2026-11-01

## Context

Every merge to `main` deploys to production on Netlify (ADR 0003, ADR 0009), and Netlify does not wait for GitHub Actions. Until 2026-11-01, `main` had no branch protection. Anyone with write access could push straight to it, force-push or delete it, or merge a pull request with failing CI. All three merge methods were enabled, so history mixed merge commits with Conventional Commits. Secret scanning and Dependabot security updates were off.

The project has two active committers, so a mandatory human approval would stall work without adding review.

## Decision

We will protect `main` with a repository ruleset named `main`, and record it here because it lives in GitHub settings. The ruleset blocks deletion and force-pushes, and requires a pull request with resolved conversations and zero approvals. Squash is the only allowed merge method. The exact parameters are available from `gh api repos/brazostech/cscs.dev/rulesets/26334442`.

The ruleset requires two status checks: `build` from GitHub Actions, and `netlify/cscsdev/deploy-preview`. They guard different things. CI builds the code, while Netlify builds it in its own environment, which can drift from CI (ADR 0009, #79). Neither check is strict, so a branch need not be up to date with `main`.

Repository admins can bypass the ruleset on a pull request, but cannot push directly. At the time of writing, five of the six collaborators are admins. This is the way out of a stuck or failing required check, such as a Netlify outage, and is not for routine use.

Merges are squash-only, using the pull request title and body. Auto-merge and "update branch" are allowed, and branches are deleted on merge. Secret scanning, push protection and Dependabot alerts are enabled. Dependabot security updates are enabled, but GitHub reports them paused for inactivity, and they should resume once Dependabot pull requests are merged again (#81). CODEOWNERS stays in #45.

## Consequences

- A direct push to `main`, a force-push, or a pull request with a failing required check is rejected. Netlify deploys only merged pull requests, apart from an admin bypass.
- History is linear, one commit per pull request. The title becomes the commit subject, so it should be a Conventional Commit, but nothing enforces this.
- Because the checks are not strict, two pull requests that each pass can merge in sequence and break `main`. CI reports this only afterwards. This is accepted at the current scale.
- Review is by convention only, and the admin bypass depends on trusting admins.
- A fork pull request waits for a maintainer to approve its workflow run before `build` reports.
- Changes to the ruleset are not reviewed in git, so they need a new or amended ADR.
