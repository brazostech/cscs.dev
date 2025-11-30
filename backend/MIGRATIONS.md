# PocketBase Migrations Guide

This guide explains how to work with PocketBase migrations in the CSCS.dev project.

## Overview

PocketBase migrations allow you to version control your database schema and sync it between development and production environments. Migrations are stored as JavaScript files in `backend/pb_migrations/` and are automatically applied when PocketBase starts.

## Development Workflow

### 1. Making Schema Changes (Recommended Approach)

The easiest way to create migrations is using the Admin Dashboard with automigrate enabled:

```bash
# Start development environment
podman-compose up

# Navigate to Admin Dashboard
# http://localhost:8080/_/
```

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
- TypeScript definitions updated automatically

### 2. Manual Migration Creation (Advanced)

If you prefer to write migrations by hand:

```bash
cd backend
./pocketbase migrate create "migration_name"
```

This creates a file like `1234567890_migration_name.js` with the structure:

```javascript
migrate((app) => {
  // Upgrade operations
}, (app) => {
  // Downgrade operations (optional)
})
```

### 3. Testing Migrations

Migrations apply automatically on `pocketbase serve` startup, but you can manually control them:

```bash
# Apply pending migrations
./pocketbase migrate up

# Revert last migration
./pocketbase migrate down 1

# View migration history
./pocketbase migrate history-sync
```

## Production Deployment

Your production workflow is already configured:

1. **Automatic Application**: Migrations in `backend/pb_migrations/` are copied into the container via the Containerfile
2. **Volume Persistence**: The `pb_data` volume persists the database and migration history
3. **On Startup**: When the container starts, PocketBase automatically applies pending migrations
4. **Backups**: Your GCE block storage undergoes scheduled backups

**Migration Flow:**
```
Local Changes → Git Commit → GitHub → CI/CD Build → GCE VM → Container Restart → Migrations Apply
```

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

1. Navigate to http://localhost:8080/_/
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

## Example: Events and RSVPs Schema

### Events Collection
```
Collection Type: Base
Name: events

Fields:
- title (text, required)
- description (text)
- event_type (select: "book-club", "meetup")
- event_date (date, required)
- event_time (text, required)
- time_zone (text, default: "CST")
- location (text, required)
- location_details (text)
- max_attendees (number)
```

### RSVPs Collection
```
Collection Type: Base
Name: rsvps

Fields:
- event (relation → events, cascade delete, single)
- user (relation → users, cascade delete, single)
- status (select: "attending", "maybe", "declined")

Indexes:
CREATE UNIQUE INDEX idx_event_user ON rsvps (event, user)
```

### Collection Rules (API Access)

For each collection, set appropriate rules:

**Events:**
- List: `@request.auth.id != ""` (authenticated users can list)
- View: `@request.auth.id != ""` (authenticated users can view)
- Create: `@request.auth.id != ""` (authenticated users can create)
- Update: `@request.auth.id != ""` (authenticated users can update)
- Delete: `@request.auth.id != ""` (authenticated users can delete)

**RSVPs:**
- List: `@request.auth.id != ""` (authenticated users can list)
- View: `@request.auth.id != ""` (authenticated users can view)
- Create: `@request.auth.id != "" && @request.data.user = @request.auth.id` (users can only RSVP for themselves)
- Update: `user = @request.auth.id` (users can only update their own RSVPs)
- Delete: `user = @request.auth.id` (users can only delete their own RSVPs)

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
```bash
# 1. Backup your local database
cp backend/pb_data/data.db backend/pb_data/data.db.backup

# 2. Test the migration
podman-compose restart pocketbase

# 3. Verify changes in Admin Dashboard

# 4. If issues, restore backup
cp backend/pb_data/data.db.backup backend/pb_data/data.db
```

## TypeScript Integration

PocketBase generates TypeScript definitions automatically:
- Location: `backend/pb_data/types.d.ts`
- Updated when collections change
- Use these types in your frontend code:

```typescript
import type { EventsResponse, RsvpsResponse } from '../backend/pb_data/types';

// Type-safe record access
const event: EventsResponse = await pb.collection('events').getOne('RECORD_ID');
```

## Resources

- [PocketBase Migrations Docs](https://pocketbase.io/docs/js-migrations/)
- [PocketBase API Rules](https://pocketbase.io/docs/api-rules-and-filters/)
- [PocketBase Collection Types](https://pocketbase.io/docs/collections/)
