# ADR 0001: Record Architecture Decisions

**Status**: Accepted

**Date**: 2026-02-28

## Context

Significant architectural decisions are made during the life of the cscs.dev project, but they are currently scattered across deploy scripts, configuration files, and tribal knowledge. When a new contributor encounters the infrastructure — a GCE e2-micro VM running PocketBase via Podman Quadlet, a Netlify-hosted static frontend, a split CI/deploy pipeline — there is no single place to understand why these choices were made or what tradeoffs were considered.

Without a record, future contributors must reverse-engineer rationale from code alone. Decisions that seemed obvious at the time become mysterious six months later. Alternatives that were considered and rejected get proposed again.

## Decision

We will use Architecture Decision Records, as described by Michael Nygard, to document significant architectural decisions in this project. ADRs will be stored in `doc/adr/` as markdown files, numbered sequentially with four-digit zero-padded identifiers (e.g., `0001-record-architecture-decisions.md`).

Each ADR will contain a title, status, date, context, decision, and consequences section. The status of an ADR can be proposed, accepted, deprecated, or superseded. When an ADR is superseded, it will reference the replacement ADR.

ADRs will be committed alongside the code they describe, so decisions and their rationale age together with the codebase.

## Consequences

- Architectural decisions become discoverable and reviewable by anyone with access to the repository.
- The reasoning behind past decisions is preserved, preventing repeated discussions about choices that were already evaluated.
- A lightweight template makes it easy to record new decisions without significant overhead.
- ADRs are a social convention, not a technical enforcement — there is no mechanism that requires an ADR be written for every decision.
- The `doc/adr/` directory will grow over time, but each file is small (1-2 pages) and the overhead is minimal.
