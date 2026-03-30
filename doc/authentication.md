# Authentication with PocketBase

This project uses [PocketBase](https://pocketbase.io/) for user authentication.

## Features

- ✅ User registration with email verification
- ✅ Login/logout functionality
- ✅ Role-based access control (user/moderator)
- ✅ Protected routes and account dashboard
- ✅ Client-side authentication (static site)
- ✅ Email verification (production only, requires SMTP)
- ✅ Custom verification page with user-friendly UI

## Setup

### 1. PocketBase URLs

This is a **static site with client-side authentication only**. The application uses:

- **Development**: `http://localhost:8080` (accessible from your browser)
- **Production**: `https://api.cscs.dev`

You can override these defaults by setting `PUBLIC_POCKETBASE_URL` in your `.env` file.

### 2. Development Setup

#### Using Podman Compose (Recommended)

The project includes a `podman-compose.yaml` file for local development:

```bash
podman-compose up
```

This will:

- Start PocketBase on `http://localhost:8080`
- Start the Astro dev server on `http://localhost:4321`
- Client-side code will automatically connect to `http://localhost:8080`

Access the PocketBase admin UI at `http://localhost:8080/_/`

#### Running PocketBase Standalone

If you're running PocketBase locally outside of containers:

1. Download PocketBase from [https://pocketbase.io/](https://pocketbase.io/)
2. Start PocketBase: `./pocketbase serve --http=0.0.0.0:8080`
3. Create a `.env` file to set the URL:

```bash
cp .env.example .env
```

Add to `.env`:

```env
PUBLIC_POCKETBASE_URL=http://localhost:8080
```

The admin UI will be available at `http://localhost:8080/_/`

### 3. Configure PocketBase

1. Navigate to the PocketBase admin UI
2. Create an admin account
3. The default `users` collection should already exist with basic authentication fields

## Features

### Pages

- `/login` - User login page
- `/register` - User registration page
- `/account` - Protected account dashboard (requires authentication)

### Components

- `LoginForm.tsx` - Login form with email/password
- `RegisterForm.tsx` - Registration form with email/password/name
- `AccountDashboard.tsx` - User profile and logout

### Authentication Flow

1. **Registration**: User creates account via `/register`
   - Validates password length (min 8 characters)
   - Validates password confirmation matches
   - Creates user in PocketBase
   - Automatically logs in after registration
   - Redirects to `/account`

2. **Login**: User signs in via `/login`
   - Authenticates with email/password
   - Sets auth token in browser storage
   - Redirects to `/account`

3. **Protected Routes**: Client-side checks
   - Components like `AccountDashboard` check auth status
   - Unauthenticated users redirected to `/login` in-browser
   - Auth state persists via localStorage

4. **Logout**: User signs out from `/account`
   - Clears auth token
   - Redirects to home page

### PocketBase Client

The PocketBase client is initialized in `src/lib/pocketbase.ts` and provides:

- `pb` - PocketBase instance
- `register(data)` - Create new user
- `login(data)` - Authenticate user
- `logout()` - Clear auth state
- `getCurrentUser()` - Get current user data
- `isAuthenticated()` - Check if user is logged in
- `onAuthChange(callback)` - Subscribe to auth changes

### Auth Store

The `useAuth()` hook in `src/stores/authStore.ts` provides reactive auth state:

```typescript
const { user, isAuthenticated, isLoading } = useAuth();
```

## Customization

### Adding Protected Routes

This is a static site, so protection is client-side only. Components check auth status using the `useAuth()` hook and redirect if needed. See `AccountDashboard.tsx` for an example.

### Customizing User Fields

You can extend the user collection in PocketBase to add custom fields:

1. Go to PocketBase admin UI
2. Navigate to Collections > users
3. Add custom fields as needed
4. Update `AuthUser` interface in `src/lib/pocketbase.ts`

### Email Verification

PocketBase supports email verification. To enable:

1. Configure SMTP settings in PocketBase admin
2. Use `requestVerification(email)` helper function
3. Users will receive verification email automatically on registration

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:4321` (or 4322 if 4321 is in use).

## Production

For production deployment:

1. **PocketBase**: Deploy PocketBase at `https://api.cscs.dev`
   - The application will automatically use this URL in production mode
   - Ensure CORS allows requests from your domain (e.g., `https://cscs.dev`)
   - Set up SSL/TLS for secure connections
   - Configure SMTP for email verification

2. **Environment Variables**: Set `PUBLIC_POCKETBASE_URL` only if you need to override the default production URL

3. **Build**: Run `npm run build` to create the production build with the correct PocketBase URL baked in

## Email Verification

### Setup (Production)

Email verification requires SMTP configuration:

1. Login to Admin Dashboard: https://api.cscs.dev/_/
2. Navigate to **Settings → Mail settings**
3. Configure SMTP (SendGrid):
   - **SMTP host**: smtp.sendgrid.net
   - **Port**: 587
   - **Username**: apikey
   - **Password**: [SendGrid API key]
   - **From address**: noreply@cscs.dev
   - **From name**: CSCS
4. Set **App URL**: https://api.cscs.dev (under Settings → Application)
   - **Important**: This must be the PocketBase API URL, not your frontend URL
   - The verification link will be: `https://api.cscs.dev/api/collections/users/confirm-verification?token=...`

### Verification Flow

1. User registers at `/register`
2. `requestVerification(email)` is called
3. PocketBase sends verification email using its built-in template
4. Email contains link to: `https://api.cscs.dev/api/collections/users/confirm-verification?token=ABC123`
5. User clicks link → PocketBase verifies token and returns JSON response
6. User can then log in with verified email

**Limitation**: PocketBase's pre-built binary uses hardcoded email templates that link directly to the API endpoint (`/api/collections/users/confirm-verification?token=...`). Users will see a JSON response after clicking the verification link.

**Workaround**: A custom verification page exists at `/verify-email?token=...` that provides a user-friendly UI, but users would need to manually navigate there with the token from the email. To use custom email templates with proper redirects, you would need to extend PocketBase with Go hooks or use a custom build.

### Development

Email verification is configured in development with SendGrid SMTP. To test:

1. Set **App URL** in Admin Dashboard: http://localhost:8080 (or http://localhost:4321)
2. Register with a real email address
3. Check your email for the verification link
4. Click the link to verify

Alternatively, you can manually verify users via Admin Dashboard (Collections → users → Edit user → check "verified")

## Troubleshooting

### SendGrid Link Tracking

SendGrid wraps all email links with click tracking URLs (e.g., `url8394.cscs.dev`). This is normal behavior and the link will redirect to the actual verification URL after tracking.

To disable link tracking (optional):

1. Login to SendGrid dashboard
2. Go to Settings → Tracking
3. Disable "Click Tracking"

**Note**: Even with tracking enabled, verification should work - SendGrid redirects to the actual URL after tracking the click.

### CORS Issues

If you encounter CORS errors, make sure your PocketBase instance allows requests from your domain. You can configure this in the PocketBase admin UI under Settings > Application.

### Auth State Not Persisting

PocketBase stores auth tokens in localStorage by default. Make sure your browser allows localStorage and isn't in private/incognito mode.

### Client-Side Only Security

Since this is a static site, all auth checks happen in the browser. This is fine for most community sites, but sensitive operations should always be validated on your PocketBase backend regardless of client-side checks.

## Resources

- [PocketBase Documentation](https://pocketbase.io/docs/)
- [PocketBase JavaScript SDK](https://github.com/pocketbase/js-sdk)
- [Astro Documentation](https://docs.astro.build/)
