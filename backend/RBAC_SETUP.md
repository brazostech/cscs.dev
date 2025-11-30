# RBAC Setup Guide

This guide explains how to set up Role-Based Access Control for the CSCS.dev site.

## User Roles

### 1. Super Admins (PocketBase Admins)
- **Access**: https://api.cscs.dev/_/ (Admin Dashboard)
- **Purpose**: Full system administration, manage collections, migrations, settings
- **Authentication**: Separate from regular users
- **Create**: `pocketbase admin create email@example.com password`

### 2. Regular Users (users collection)
- **Access**: Frontend login at https://cscs.dev/login
- **Default role**: `user`
- **Permissions**: View events, RSVP to events, manage own profile

### 3. Moderators (users with role="moderator")
- **Access**: Frontend login (same as regular users)
- **Permissions**: All regular user permissions + create/edit/delete events
- **Upgrade**: Super admin changes user's `role` field to "moderator" via dashboard

## Setup Steps

### Step 1: Add role field to users collection

1. Open Admin Dashboard: http://localhost:8080/_/
2. Go to Collections → users
3. Click "Edit" on the users collection
4. Add new field:
   - **Name**: `role`
   - **Type**: Select
   - **Options**: `user`, `moderator`
   - **Max select**: 1
   - **Default**: `user`
   - **Required**: Yes
5. Save the collection
6. A migration file will be auto-generated in `backend/pb_migrations/`
7. Commit the migration file

### Step 2: Set API Rules for events collection

In Admin Dashboard → Collections → events → API Rules:

```javascript
// List rule - Anyone can view events (including unauthenticated)
""

// View rule - Anyone can view individual events
""

// Create rule - Only moderators can create events
@request.auth.id != "" && @request.auth.role = "moderator"

// Update rule - Only moderators can update events
@request.auth.id != "" && @request.auth.role = "moderator"

// Delete rule - Only moderators can delete events
@request.auth.id != "" && @request.auth.role = "moderator"
```

### Step 3: Set API Rules for rsvps collection (when created)

In Admin Dashboard → Collections → rsvps → API Rules:

```javascript
// List rule - Authenticated users can see all RSVPs
@request.auth.id != ""

// View rule - Authenticated users can view RSVPs
@request.auth.id != ""

// Create rule - Users can only RSVP for themselves
@request.auth.id != "" && @request.data.user = @request.auth.id

// Update rule - Users can only update their own RSVPs
user = @request.auth.id

// Delete rule - Users can only delete their own RSVPs
user = @request.auth.id
```

## Making a User a Moderator

### Via Admin Dashboard (Recommended)
1. Login to https://api.cscs.dev/_/
2. Go to Collections → users
3. Find the user
4. Edit their record
5. Change `role` from `user` to `moderator`
6. Save

### Via CLI (if needed)
```bash
# SSH into production server
ssh -i ~/.ssh/id_rsa jackvincenthall@34.67.31.86

# Execute update query (replace USER_ID and EMAIL)
sudo podman exec pocketbase-pocketbase pocketbase admin update USER_EMAIL --role moderator
```

## Frontend Usage

### Check if user is moderator (TypeScript)

```typescript
import { pb } from './lib/pocketbase';

// Check current user role
const isModerator = pb.authStore.model?.role === 'moderator';

// Show/hide moderator features
if (isModerator) {
  // Show "Create Event" button
  // Show "Edit" and "Delete" buttons on events
}
```

### Example: Conditional UI rendering

```tsx
import { useAuth } from '../stores/authStore';

function EventsList() {
  const { user } = useAuth();
  const isModerator = user?.role === 'moderator';

  return (
    <div>
      {isModerator && (
        <button onClick={createEvent}>Create New Event</button>
      )}

      {events.map(event => (
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

## Security Notes

1. **Frontend checks are for UX only** - Always enforce permissions on the backend via API rules
2. **API rules are the source of truth** - Even if frontend shows a button, API will reject unauthorized requests
3. **Super admins are separate** - Don't try to login as super admin via frontend `/login`
4. **Test your rules** - Try creating/editing events as both user and moderator to verify

## Migration Workflow

After adding the role field and setting API rules:

1. Migration file auto-generated in `backend/pb_migrations/`
2. Commit the migration:
   ```bash
   git add backend/pb_migrations/
   git commit -m "feat: add user roles (user/moderator)"
   ```
3. Deploy to production:
   ```bash
   cd backend
   make build-push
   ```
4. Migrations apply automatically on container restart

## Current State

- ✅ Super admin access via `/_/` dashboard
- ✅ Regular user authentication via frontend
- ⏳ Role field to be added (follow Step 1)
- ⏳ API rules to be set (follow Step 2)
- ⏳ RSVP collection and rules (future)
- ⏳ Frontend moderator UI (future)
