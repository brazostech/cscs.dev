# ADR 0004: PocketBase as Backend

**Status**: Accepted

**Date**: 2026-02-28

## Context

The site needs user authentication (email/password registration and login), event management (CRUD operations for community events), and RSVP functionality. These features require a persistent backend with a database, REST API, and auth system.

The team is small and this is a community project. The operational cost of running a traditional API server with a separate database, ORM, migration framework, and auth library would be disproportionate to the project's scale. The expected traffic is modest — a local tech community, not a high-scale application.

SQLite-backed solutions are acceptable at this traffic level and avoid the need for a separate database server.

## Decision

We will use PocketBase v0.34.0 as the sole backend service. PocketBase provides a built-in REST API, SQLite persistence, an admin dashboard, user authentication (email/password), collection-level access control rules, and JavaScript migration support — all in a single pre-compiled Go binary.

The backend is accessed by the frontend at `https://api.cscs.dev` in production and `http://localhost:8080` in development. Schema changes are managed through the PocketBase admin UI with automigrate enabled, generating JavaScript migration files in `backend/pb_migrations/`.

## Consequences

- One binary, one service, zero infrastructure dependencies beyond the VM it runs on. No separate database server, no ORM, no auth framework to configure.
- Schema changes and migrations are managed through PocketBase's admin UI, which auto-generates versioned migration files.
- Auth, CRUD, file storage, and access control rules are included without additional packages or configuration.
- PocketBase is a single point of failure for the backend. If the process goes down, all authenticated features are unavailable.
- SQLite does not scale horizontally. If the community grows significantly, the database engine becomes a bottleneck.
- Upgrading PocketBase major versions can introduce breaking changes to the API or admin interface.
- All API access goes through PocketBase's standard REST interface, which the frontend consumes via the PocketBase JavaScript SDK.
