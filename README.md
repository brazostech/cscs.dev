[![Netlify Status](https://api.netlify.com/api/v1/badges/2dcb81d1-35ab-4001-bf99-7deb67c5496a/deploy-status)](https://app.netlify.com/projects/cscsdev/deploys)
[![CI](https://github.com/brazostech/cscs.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/brazostech/cscs.dev/actions/workflows/ci.yml)

# College Station Computer Science (CSCS)

The community website for the Bryan-College Station tech community. It has two halves:

- **Public site** — home, about, blog, schedule and book club. Anyone can browse.
- **Member app** — `/app` dashboard, events and books. Sign-in is required; moderators can create, edit and delete events and books.

The frontend is a static Astro site. [PocketBase](https://pocketbase.io/) is the backend: it stores users, events, RSVPs and books, and serves the API at `https://api.cscs.dev` in production. There are two kinds of accounts: PocketBase **superusers** (dashboard access at `/_/`) and site **users** (role `user` or `moderator`).

## Tech stack

- **[Astro 7](https://astro.build)** — static site generation with React islands
- **[React 19](https://react.dev)** — interactive components
- **[Tailwind CSS v4](https://tailwindcss.com)** — styling, with dark mode
- **[PocketBase 0.34](https://pocketbase.io)** — database, auth, file storage and admin dashboard
- **[Catalyst UI Kit](https://catalyst.tailwindui.com)** — vendored component source in `src/components/catalyst/`
- **Vitest**, **React Testing Library** and **Storybook** — tests and component workshop

## Local development

### Prerequisites

- **Node 22.23.4 or newer** via [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm), for running the site on the host.
- **`make` and `unzip`** for Option A (preinstalled on macOS and most Linux distributions).
- **Podman and `podman-compose`** for the container paths. Option A and the full host-based flow do not need them.

The full-compose variant below runs both services in containers: it skips steps 1 and 4 and does not need Node on the host.

### 1. Install Node and dependencies

Use Node 22. The repo pins the major version in `.nvmrc` and `package.json` requires `>=22.23.4`:

```bash
nvm install      # installs the Node version from .nvmrc (22)
nvm use          # or: fnm use, if you already have Node 22
npm ci           # installs from package-lock.json
```

`npm ci` needs the lockfile and is what CI runs. Use npm only — the repo does not use yarn, pnpm or bun.

### 2. Start PocketBase on port 8080

Pick one of the two options below and leave it running while you develop.

**Option A — a local binary (macOS or Linux, x64 or arm64)**

The repo does not commit a PocketBase binary. `make pocketbase` installs the pinned version (0.34.0, the same one the container image uses) for your OS and architecture at `backend/pocketbase`, which is gitignored. It needs Node (step 1) and network access the first time. The download is SHA-256 checked before anything runs, and re-running the target does nothing once the right version is in place. On Windows, use Option B.

```bash
cd backend
make pocketbase
./pocketbase serve --http=127.0.0.1:8080 --dir=./pb_data --migrationsDir=./pb_migrations
```

The migrations in `backend/pb_migrations/` are applied on first start. Local data lands in `backend/pb_data/`, which is gitignored.

**Option B — Podman (any platform)**

From the project root, start just PocketBase:

```bash
podman-compose up --build -d pocketbase
```

Or start the whole stack in containers — PocketBase plus the Astro dev server on `:4321`. With this variant you skip steps 1 and 4 and do not need Node on the host:

```bash
podman-compose up --build -d
podman-compose down   # stop everything
```

**Check:** `curl http://localhost:8080/api/health` returns `{"message":"API is healthy.","code":200,...}`, and the dashboard is at <http://localhost:8080/_/>.

### 3. Environment variables (optional)

The defaults are already correct, so **you do not need a `.env` file** for local development:

- A development build talks to `http://localhost:8080`.
- A production build talks to `https://api.cscs.dev`.

To override the URL, copy the example and set the variable:

```bash
cp .env.example .env
```

Leave `PUBLIC_POCKETBASE_URL` empty to keep the defaults. `PUBLIC_` variables are compiled into the client bundle, so the browser must be able to reach the URL you set. Never point local development at the production API.

If you already have a `.env` from an older checkout, update or delete it: earlier examples used `http://pocketbase:8080`, which only resolves inside the Compose network, not in your browser.

### 4. Start the site

From the project root — run `cd ..` first if step 2 left you in `backend/` — in a second terminal:

```bash
npm run dev
```

**Check:** <http://localhost:4321> serves the home page, and <http://localhost:4321/schedule> loads events from PocketBase.

### 5. Create the PocketBase superuser

**Option A — local binary**

With a fresh `backend/pb_data/`, PocketBase prints a one-time install link in the terminal where the server is running:

```
(!) Launch the URL below in the browser ... to create your first superuser account:
http://127.0.0.1:8080/_/#/pbinstal/...
```

Open that link and create the superuser (email, password, password confirmation). Opening <http://localhost:8080/_/> without the link shows the superuser login instead, because no superuser exists yet. This account is only for the dashboard; it is not a site account.

If you missed the install link, create the account from the CLI (this works while the server is running):

```bash
cd backend
./pocketbase superuser create you@example.com 'a-long-password' --dir=./pb_data
```

**Option B — Podman**

The container runs detached, so the install link is in its logs rather than your terminal. Extract it:

```bash
podman-compose logs pocketbase | grep -o 'http://0.0.0.0:8080/_/#/pbinstal/[^ ]*'
```

PocketBase prints the host as `0.0.0.0`, which a browser cannot use. Replace it with `localhost`:

```
http://0.0.0.0:8080/_/#/pbinstal/...   ->   http://localhost:8080/_/#/pbinstal/...
```

Open the `localhost` link and create the superuser. If the link expired or you cannot retrieve it, create the account inside the running container — this runs the container's Linux binary, not the macOS binary on the host:

```bash
podman exec -it pocketbase pocketbase superuser create you@example.com 'a-long-password' --dir=/pb_data
```

Afterwards, <http://localhost:8080/_/> is the dashboard login for both options.

### 6. Register a site user and promote them to moderator

1. Go to <http://localhost:4321/register> and create an account (password 8+ characters). Registration signs you in and redirects to `/account`.
2. Local PocketBase has no SMTP configured, so the verification email never arrives. That is expected: email verification is not required for local development, including moderator actions.
3. In the dashboard at <http://localhost:8080/_/>, open **Collections → users**, click the new record, set **role** to `moderator`, and save.
4. On the site, sign out and sign back in at <http://localhost:4321/login>. The browser caches the role from sign-in, so the old session still says `user`.

The `/app/dashboard` page shows an **Email Verification Required** banner because no local SMTP is configured. That is expected; `/app/events` and moderator actions still work.

**Check:** <http://localhost:4321/account> shows a **Moderator** badge next to "Account Dashboard", and <http://localhost:4321/app/events> shows the **Create Event** button. You now have the full local setup.

## Scripts and quality gates

| Command                   | What it does                                         |
| ------------------------- | ---------------------------------------------------- |
| `npm run dev`             | Astro dev server with hot reload at `localhost:4321` |
| `npm run build`           | Production build to `dist/`                          |
| `npm run preview`         | Serve the production build locally                   |
| `npm run lint`            | ESLint over the repo                                 |
| `npm run format`          | Prettier, writing changes                            |
| `npm run format:check`    | Prettier check only (what CI runs)                   |
| `npm run check`           | `astro check` typecheck                              |
| `npm test`                | Vitest in watch mode                                 |
| `npm run test:run`        | Vitest once (what CI runs)                           |
| `npm run test:pb`         | PocketBase API rule tests (what CI runs)             |
| `npm run test:coverage`   | Vitest once with v8 coverage                         |
| `npm run storybook`       | Storybook at `localhost:6006`                        |
| `npm run build-storybook` | Static Storybook build                               |

Before opening a pull request, run the same checks CI runs:

```bash
npm run lint
npm run format:check
npm run check
npm run test:run
npm run test:pb
npm run build
npm run build-storybook
```

`npm run test:pb` downloads PocketBase v0.34.0 from GitHub releases (SHA-256 checked, cached under `node_modules/.cache/pocketbase`), so it needs network access the first time and `unzip`. CI (`.github/workflows/ci.yml`) also verifies that `.nvmrc`, the `Containerfile` base image and `netlify.toml`'s `NODE_VERSION` agree on the Node major version, and that the PocketBase version agrees across the `Containerfile`, `podman-compose.yaml` and `backend/scripts/pocketbase-download.mjs`. If you bump Node, change all three; if you bump PocketBase, change all three and the checksums in `backend/scripts/pocketbase-download.mjs`, the one module that both `npm run test:pb` and `make pocketbase` download through. `main` only accepts pull requests whose `build` job and Netlify `deploy-preview` check pass (ADR [0012](doc/adr/0012-branch-protection-via-repository-ruleset.md)).

## Project structure

The main tracked files and directories:

```
.
├── .claude/                       # Claude Code hooks, settings and docs
├── .github/
│   ├── dependabot.yml             # weekly dependency updates
│   └── workflows/
│       └── ci.yml                 # lint, format, typecheck, test, PocketBase rule tests, build, Storybook
├── .storybook/                    # Storybook config (main.ts, preview.ts)
├── backend/
│   ├── pb_migrations/             # PocketBase schema migrations (11 files)
│   ├── scripts/                   # pinned PocketBase download + checksum check (make pocketbase)
│   ├── test/                      # PocketBase API rule tests (npm run test:pb)
│   ├── Containerfile              # backend container image
│   ├── Makefile                   # make pocketbase, image build/push targets
│   ├── deploy.sh                  # GCE VM lifecycle
│   ├── startup.sh                 # VM cloud-init and Quadlet unit
│   ├── MIGRATIONS.md              # migration workflow and schema notes
│   ├── RBAC_SETUP.md              # roles and API rules
│   └── README.md                  # backend overview and deployment
├── doc/
│   ├── adr/                       # architecture decision records
│   ├── audit.md
│   ├── authentication.md
│   ├── improvements.md
│   └── seo.md
├── public/                        # static assets (favicon, robots.txt)
├── scripts/
│   └── create-audit-issues.sh
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── catalyst/              # vendored Catalyst UI Kit components
│   │   ├── Welcome.astro          # Astro welcome component
│   │   └── *.tsx                  # app components, tests and stories
│   ├── content/
│   │   └── blog/                  # Markdown blog posts
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── pocketbase.ts          # PocketBase client and typed helpers
│   │   └── pocketbase.test.ts
│   ├── pages/
│   │   ├── app/                   # authenticated app: dashboard, events, books
│   │   ├── blog/                  # blog index and post route
│   │   └── *.astro                # public pages and auth flows
│   ├── stores/
│   │   └── authStore.ts           # useAuth() hook
│   ├── styles/
│   │   └── global.css
│   ├── test/
│   │   ├── mocks/                 # PocketBase mock and factories
│   │   └── setup.ts
│   └── content.config.ts          # blog collection schema
├── .env.example
├── .nvmrc
├── .prettierrc.mjs
├── AGENTS.md                      # conventions for AI agents (CLAUDE.md is a symlink)
├── Containerfile                  # development container for the full Compose stack
├── astro.config.mjs
├── eslint.config.js
├── netlify.toml
├── package.json
├── package-lock.json
├── podman-compose.yaml
├── tsconfig.json
└── vitest.config.ts
```

## Working with Catalyst

Catalyst is vendored as source in `src/components/catalyst/`, not installed from npm, so it can be adapted. The default is still to **wrap** it: build your component in `src/components/` and import the Catalyst pieces you need.

```tsx
// src/components/PrimaryButton.tsx
import { Button as CatalystButton } from "./catalyst/button";

export function PrimaryButton(
  props: React.ComponentProps<typeof CatalystButton>,
) {
  return <CatalystButton color="indigo" {...props} />;
}
```

Edit a file inside `src/components/catalyst/` directly only when a wrapper cannot express the change, and state the reason in the pull request or commit message. A Claude Code hook asks for confirmation before such edits. Keeping the vendored files close to upstream makes Catalyst upgrades and comparisons predictable.

## Documentation map

| Document                                       | What it covers                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| [doc/adr/README.md](doc/adr/README.md)         | Index of the architecture decision records (0001–0012)             |
| [doc/authentication.md](doc/authentication.md) | Auth flows, protected routes, email verification and SMTP          |
| [backend/README.md](backend/README.md)         | Collections, backend layout and deployment                         |
| [backend/MIGRATIONS.md](backend/MIGRATIONS.md) | Migration workflow, schema reference and troubleshooting           |
| [backend/RBAC_SETUP.md](backend/RBAC_SETUP.md) | Roles, API rules and moderator setup                               |
| [AGENTS.md](AGENTS.md)                         | Code conventions and workflows for AI agents (`CLAUDE.md` symlink) |
| [doc/audit.md](doc/audit.md)                   | February 2026 project audit (historical)                           |
| [doc/improvements.md](doc/improvements.md)     | Improvement plan (historical roadmap)                              |
| [doc/seo.md](doc/seo.md)                       | SEO implementation notes                                           |

The migrations in `backend/pb_migrations/` are authoritative for collections and API rules; `backend/MIGRATIONS.md` and `backend/RBAC_SETUP.md` mirror them.

## Contributing

- Work on a branch, one change per branch, and commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, …). PR titles use the same format; merges are squashed, so the PR title becomes the commit on `main`.
- Open a pull request with a `## Summary` and a `## Test plan`, and say what you ran.
- `main` is protected: PR required, and the `build` and Netlify `deploy-preview` checks must pass.
- Add blog posts as Markdown files in `src/content/blog/` with `title`, `description`, `pubDate` and `author` frontmatter (`tags` is optional).
- PocketBase schema changes go through migrations in `backend/pb_migrations/`; see [backend/MIGRATIONS.md](backend/MIGRATIONS.md).

## Learn more

- [Astro documentation](https://docs.astro.build)
- [PocketBase documentation](https://pocketbase.io/docs/)
- [Catalyst UI Kit documentation](https://catalyst.tailwindui.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
