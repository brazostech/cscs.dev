# PocketBase Migrations Guide

This guide explains how to work with PocketBase migrations in the CSCS.dev project.

## Overview

PocketBase migrations allow you to version control your database schema and sync it between development and production environments. Migrations are stored as JavaScript files in `backend/pb_migrations/` and are automatically applied when PocketBase starts.

## Development Workflow

### 1. Making Schema Changes (Recommended Approach)

The easiest way to create migrations is using the Admin Dashboard with automigrate enabled:

Choose one of these, from the project root:

```bash
# Option A — Podman
podman-compose up --build -d pocketbase
```

```bash
# Option B — committed binary (macOS arm64 only)
cd backend
./pocketbase serve --http=127.0.0.1:8080 --dir=./pb_data --migrationsDir=./pb_migrations
```

Then open the Admin Dashboard at http://localhost:8080/\_/.

**Steps:**

1. Login to the Admin Dashboard
2. Go to "Collections"
3. Create or modify collections using the UI
4. PocketBase automatically generates migration files in `backend/pb_migrations/`
5. Review the generated migration files
6. Commit them to git

**Advantages:**

- Visual interface for schema design
- Automatic migration generation
- No syntax errors
- PocketBase refreshes its JSVM and editor definitions at `backend/pb_data/types.d.ts` (not the frontend record types)

### 2. Manual Migration Creation (Advanced)

If you prefer to write migrations by hand:

```bash
cd backend
./pocketbase migrate create "migration_name"
```

This creates a file like `1234567890_migration_name.js` with the structure:

```javascript
migrate(
  (app) => {
    // Upgrade operations
  },
  (app) => {
    // Downgrade operations (optional)
  },
);
```

### 3. Testing Migrations

`npm run test:pb` (from the project root) downloads the pinned PocketBase release, verifies its SHA-256, starts it on a free local port with a temporary data directory and `backend/pb_migrations`, and runs the RSVP rule tests (`backend/test/`). It never contacts api.cscs.dev, and CI runs it. Add a case there when you change an API rule.

Migrations apply automatically on `pocketbase serve` startup, but you can manually control them:

```bash
# Apply pending migrations
./pocketbase migrate up

# Revert last migration
./pocketbase migrate down 1

# Remove history entries for migration files that were deleted
./pocketbase migrate history-sync
```

## Production Deployment

Backend deployment is manual — there is no CI/CD deploy step (see [ADR 0010](../doc/adr/0010-backend-deployment-via-manual-script.md)). What does happen automatically:

1. **Image contents**: Migrations in `backend/pb_migrations/` are copied into the container image by the `Containerfile`
2. **Directory persistence**: The `pb_data` directory on the GCE persistent disk holds the database and the applied-migration history
3. **On startup**: When the container starts, PocketBase applies pending migrations
4. **Backups**: The `pod-data` disk has daily snapshots at 03:00 UTC with 7-day retention. See [RUNBOOK.md](RUNBOOK.md#backups) for verification and restore.

**Migration flow:**

```
Local change → commit and PR → merge to main → (backend/) make build-push
  → SSH to the VM → podman pull → systemctl restart pocketbase.service
  → migrations apply on startup
```

The build, push and restart commands are in [backend/README.md](README.md#deployment).

### Rolling back a migration in production

An image rollback does not undo a migration (see [RUNBOOK.md](RUNBOOK.md#roll-back-an-image)), and the new image still contains the migration file, so a plain restart would apply it again. To undo one on the live database, run its `down` and then move to the previous image:

```bash
gcloud compute ssh cscs-dev-backend --zone=us-central1-a --project=cscsdotdev
# On the VM. This prompts "Do you really want to revert ...? (y/N)": answer y.
sudo podman exec -it pocketbase-pocketbase pocketbase migrate down 1 \
  --dir=/data/pb_data --migrationsDir=/pb_migrations
```

Then pin the previous image by digest and restart the service, following [Roll back an image](RUNBOOK.md#roll-back-an-image). The same `migrate down 1` command reverts only the most recently applied migration. Take a snapshot first if the migration touched data.

## Best Practices

### DO:

- ✅ Use Admin Dashboard for schema changes (automigrate)
- ✅ Commit all migration files to git
- ✅ Test migrations locally before deploying
- ✅ Review generated migrations before committing
- ✅ Use descriptive migration names
- ✅ Keep migrations small and focused

### DON'T:

- ❌ Manually edit the production database
- ❌ Delete migration files after they've been applied
- ❌ Modify migration files after committing
- ❌ Skip testing migrations locally
- ❌ Create migrations that depend on data that might not exist

## Common Operations

### Creating a New Collection

1. Navigate to http://localhost:8080/\_/
2. Collections → New Collection
3. Choose collection type (Base, Auth, View)
4. Add fields with appropriate types
5. Set validation rules and indexes
6. Save → Migration file created automatically

### Adding a Field to Existing Collection

1. Navigate to the collection in Admin Dashboard
2. Click "Edit" on the collection
3. Add your new field
4. Save → Migration file created automatically

### Creating Relationships

When creating a relation field:

- **Type**: Relation
- **Collection**: Select the target collection
- **Cascade Delete**: Check if deleting parent should delete children
- **Single/Multiple**: Choose maxSelect (1 for single, higher for multiple)

### Adding Indexes

For performance or uniqueness:

1. Edit collection
2. Scroll to "Indexes" section
3. Add index SQL: `CREATE INDEX idx_name ON table (column)`
4. For unique: `CREATE UNIQUE INDEX idx_name ON table (column1, column2)`

## Schema reference: events and RSVPs

This mirrors the committed migrations in `backend/pb_migrations/`. Update it when a migration changes the schema.

### Events Collection

```
Collection Type: Base
Name: events

Fields:
- title (text)
- description (text)
- tags (text)
- type (text — the app uses "meetup" and "book-club")
- location (text)
- location_details (text)
- time_zone (text)
- date (text, YYYY-MM-DD — text so it parses in local time)
- time (text)
- series_id (text — groups recurring events)
- book (relation → books, single, optional)
- created, updated (autodate)
```

The original unique index on `title` was removed in `1768098549_updated_events_recurring.js` so recurring events can share a name.

### RSVPs Collection

```
Collection Type: Base
Name: rsvps

Fields:
- event (relation → events, required, single, cascade delete)
- user (relation → users, required, single, cascade delete)
- created, updated (autodate)

Indexes:
CREATE UNIQUE INDEX `idx_rsvp_event_user` ON `rsvps` (`event`, `user`)
```

There is no `status` field: the app treats the existence of an RSVP as "attending" and cancels by deleting the record.

### Collection Rules (API Access)

These are the rules in the migrations:

**Events:**

- List: `""` (public)
- View: `""` (public)
- Create: `@request.auth.id != "" && @request.auth.role = "moderator"`
- Update: `@request.auth.id != "" && @request.auth.role = "moderator"`
- Delete: `@request.auth.id != "" && @request.auth.role = "moderator"`

**Books** (`1774800965_created_books.js`):

- List: `""` (public)
- View: `""` (public)
- Create: `@request.auth.id != "" && @request.auth.role = "moderator"`
- Update: `@request.auth.id != "" && @request.auth.role = "moderator"`
- Delete: `@request.auth.id != "" && @request.auth.role = "moderator"`

**RSVPs:**

- List: `@request.auth.id != ""` (authenticated users can list)
- View: `@request.auth.id != ""` (authenticated users can view)
- Create: `@request.auth.id != "" && @request.body.user = @request.auth.id` (a user can only create an RSVP for themselves; `1793620800_updated_rsvps_create_rule.js`)
- Update: unset (`null`, superuser only; no user can update an RSVP)
- Delete: `user = @request.auth.id` (users can only delete their own RSVPs)

**Users** (`1764528168_updated_users.js`):

- Create: `@request.body.email:isset = true && @request.body.password:isset = true && (@request.body.role:isset = false || @request.body.role = 'user')`
- Update: `id = @request.auth.id && (@request.body.role:isset = false || @request.body.role = role)`

See [RBAC_SETUP.md](RBAC_SETUP.md) for the reasoning behind each rule.

## Troubleshooting

### Migration fails on production

1. Check logs: `podman logs pocketbase`
2. Verify migration file syntax
3. Check if migration was already partially applied
4. Use `migrate history-sync` to clean orphaned entries

### Migration file not generated

1. Ensure `--automigrate` flag is enabled (default)
2. Check file permissions on `pb_migrations/` directory
3. Restart PocketBase after making changes

### Schema out of sync

1. Use `./pocketbase migrate collections` to create snapshot
2. Review and apply the generated migration
3. Commit to git

### Testing locally before production

From the project root:

```bash
# 1. Backup your local database
cp backend/pb_data/data.db backend/pb_data/data.db.backup

# 2. Test the migration
podman-compose restart pocketbase

# 3. Verify changes in Admin Dashboard

# 4. If issues, restore backup
cp backend/pb_data/data.db.backup backend/pb_data/data.db
```

## TypeScript Types

PocketBase writes editor definitions to `backend/pb_data/types.d.ts`, and the migration files reference that path in a `/// <reference path="..." />` comment for editor support. `pb_data/` is gitignored: the file is generated locally, absent from a fresh clone, and never committed.

Do not import from `pb_data/`. The app declares its PocketBase types by hand in `src/lib/pocketbase.ts` (`AuthUser`, `RsvpData`, `BookData`); update those interfaces when a schema change affects them.

## Resources

- [PocketBase Migrations Docs](https://pocketbase.io/docs/js-migrations/)
- [PocketBase API Rules](https://pocketbase.io/docs/api-rules-and-filters/)
- [PocketBase Collection Types](https://pocketbase.io/docs/collections/)
