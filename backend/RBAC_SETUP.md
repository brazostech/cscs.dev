# RBAC Setup Guide

This guide explains how to set up Role-Based Access Control for the CSCS.dev site.

## User Roles

### 1. Super Admins (PocketBase Admins)

- **Access**: https://api.cscs.dev/_/ (Admin Dashboard)
- **Purpose**: Full system administration, manage collections, migrations, settings
- **Authentication**: Separate from regular users
- **Create**: `pocketbase superuser create email@example.com password` (PocketBase 0.34; the old `pocketbase admin` command is gone). On the VM, see [Making a User a Moderator](#making-a-user-a-moderator) for how to reach the container.

### 2. Regular Users (users collection)

- **Access**: Frontend login at https://cscs.dev/login
- **Default role**: `user`
- **Permissions**: View events, RSVP to events, manage own profile

### 3. Moderators (users with role="moderator")

- **Access**: Frontend login (same as regular users)
- **Permissions**: All regular user permissions + create/edit/delete events
- **Upgrade**: Super admin changes user's `role` field to "moderator" via dashboard

## Setup Steps

The `role` field and every API rule below are already created by the migrations in `backend/pb_migrations/`, and those files are authoritative. This section describes what they set so you can check a running instance against them. Do not re-enter rules by hand in the dashboard: that drifts from the migrations. Change rules by adding a new migration (see [MIGRATIONS.md](MIGRATIONS.md)).

### Step 1: `role` field on users

`1764526671_updated_users.js` adds `role` (select, single, values `user` and `moderator`). `1764527610_updated_users.js` makes it required, so a registration must send a role: the site's register form sends `role: "user"`.

### Step 2: API rules for users

Set by `1764528168_updated_users.js`:

```javascript
// Create rule - Allow registration but enforce role='user'
@request.body.email:isset = true && @request.body.password:isset = true && (@request.body.role:isset = false || @request.body.role = 'user')

// Update rule - Users can update their own record but never change role
id = @request.auth.id && (@request.body.role:isset = false || @request.body.role = role)
```

### Step 3: API rules for events

Set by `1764527567_updated_events.js`:

```javascript
// List rule - Anyone can view events (including unauthenticated)
""

// View rule - Anyone can view individual events
""

// Create, update and delete rules - Only moderators
@request.auth.id != "" && @request.auth.role = "moderator"
```

### Step 4: API rules for rsvps

Set by `1768138900_created_rsvps.js` and `1793620800_updated_rsvps_create_rule.js`:

```javascript
// List rule - Authenticated users can see all RSVPs
@request.auth.id != ""

// View rule - Authenticated users can view RSVPs
@request.auth.id != ""

// Create rule - Users can only RSVP for themselves
@request.auth.id != "" && @request.body.user = @request.auth.id

// Update rule - unset (null): only superusers can update an RSVP
// (no rule text)

// Delete rule - Users can only delete their own RSVPs
user = @request.auth.id
```

The create rule matters: before `1793620800` it was only `@request.auth.id != ""`, so any signed-in user could POST an RSVP with another user's id in `user` and RSVP on their behalf. A user can't forge an update because the update rule is unset, and can't delete someone else's RSVP because of the delete rule. List and view are open to every signed-in user by design, so any member can see who is attending. `npm run test:pb` checks all of this against a local PocketBase.

## Making a User a Moderator

### Via Admin Dashboard (Recommended)

1. Login to https://api.cscs.dev/_/
2. Go to Collections → users
3. Find the user
4. Edit their record
5. Change `role` from `user` to `moderator`
6. Save

### Via CLI

There is no CLI command that edits a `users` record: `pocketbase superuser create|update|upsert|delete` only manages superuser accounts (the removed `pocketbase admin` command did the same). Promote a moderator in the dashboard. To reach the production VM, for example to create a superuser if you are locked out:

```bash
gcloud compute ssh cscs-dev-backend --zone=us-central1-a --project=cscsdotdev

# On the VM: confirm the container name (expected: pocketbase-pocketbase),
# then run the superuser command inside it against the production data dir
sudo podman ps --format '{{.Names}}'
# (/data/pb_data comes from the Quadlet config written by startup.sh)
# The CLI takes the password as an argument, so it is visible in the process list and
# shell history: use a throwaway password and change it in the dashboard afterwards
sudo podman exec -it pocketbase-pocketbase pocketbase superuser upsert you@example.com 'temporary-password' --dir=/data/pb_data
```

See [RUNBOOK.md](RUNBOOK.md) for the rest of VM access.

## Frontend Usage

### Check if user is moderator (TypeScript)

```typescript
import { pb } from "./lib/pocketbase";

// Check current user role
const isModerator = pb.authStore.record?.role === "moderator";

// Show/hide moderator features
if (isModerator) {
  // Show "Create Event" button
  // Show "Edit" and "Delete" buttons on events
}
```

### Example: Conditional UI rendering

```tsx
import { useAuth } from "../stores/authStore";

function EventsList() {
  const { user } = useAuth();
  const isModerator = user?.role === "moderator";

  return (
    <div>
      {isModerator && <button onClick={createEvent}>Create New Event</button>}

      {events.map((event) => (
        <div key={event.id}>
          <h3>{event.title}</h3>
          {isModerator && (
            <>
              <button onClick={() => editEvent(event.id)}>Edit</button>
              <button onClick={() => deleteEvent(event.id)}>Delete</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Example: Guarding a whole page

```tsx
import RequireRole from "../components/RequireRole";

// A signed-out visitor goes to /login, a non-moderator sees a permission
// notice, and the children mount (and fetch) only for a moderator.
export default function CreateEventPage() {
  return (
    <RequireRole requiredRole="moderator">
      <EventFormBody />
    </RequireRole>
  );
}
```

`RequireRole` is UX only. The API rules below still decide what is allowed.

## Security Notes

1. **Frontend checks are for UX only** - Always enforce permissions on the backend via API rules
2. **API rules are the source of truth** - Even if frontend shows a button, API will reject unauthorized requests
3. **Super admins are separate** - Don't try to login as super admin via frontend `/login`
4. **Test your rules** - `npm run test:pb` runs the RSVP rule tests against a local PocketBase with this repo's migrations. For other collections, try creating and editing as both a user and a moderator

## Migration Workflow

To change an API rule:

1. Add a new migration in `backend/pb_migrations/` (never edit one that has been committed). Give it a matching `down` that restores the previous rule.
2. Test locally, then open a PR:
   ```bash
   npm run test:pb
   git add backend/pb_migrations/
   git commit -m "fix(backend): tighten the <collection> <rule>"
   ```
3. Deploy to production manually; see [RUNBOOK.md](RUNBOOK.md#deploy-an-image) and [ADR 0010](../doc/adr/0010-backend-deployment-via-manual-script.md).
4. Migrations apply automatically when the container restarts.

## Current State

- ✅ Super admin access via the `/_/` dashboard
- ✅ Regular user authentication via the frontend
- ✅ `role` field and users/events/rsvps API rules, all in migrations
- ✅ Frontend moderator UI for events and books
