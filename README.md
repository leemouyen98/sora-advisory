# Sora Advisory

Internal advisor portal for Henry Lee / LLH Group. Manages client contacts, runs financial planning tools (retirement, protection, cash flow), and hosts a knowledge library. Live at **[portal.llhgroup.co](https://portal.llhgroup.co)**.

> **Private repo.** Do not make public.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Routing | React Router v6 |
| Charts | Recharts |
| PDF export | @react-pdf/renderer |
| Backend / API | Cloudflare Pages Functions (edge workers) |
| Database | Cloudflare D1 (SQLite — `goalsmapping-db`) |
| File storage | Cloudflare R2 (`sora-knowledge` bucket) |
| Auth | JWT (6-digit agent code + password) |
| Deploy | `wrangler pages deploy dist` |

---

## Project Structure

```
sora-advisory/
├── src/
│   ├── pages/           # Route-level page components
│   ├── components/      # Shared UI, layout, PDF, planners
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities
│   └── App.jsx          # Router config
├── functions/
│   └── api/             # Cloudflare Pages Functions (REST API)
│       ├── auth/        # Login, /me
│       ├── agent/       # Profile, password change
│       ├── contacts/    # CRUD
│       ├── admin/       # Agent management (admin role only)
│       ├── library/     # Knowledge library (folders, files, stars)
│       └── documents/   # Plan, underwriting, recruitment docs
├── schema.sql           # Initial D1 schema
├── migrate_*.sql        # Incremental migrations (run in order)
├── seed.sql             # Demo data
├── wrangler.toml        # Cloudflare config
└── dist/                # Production build output (gitignored)
```

---

## Pages

| Route | Page | Notes |
|---|---|---|
| `/login` | Login | Agent code (6-digit) + password |
| `/dashboard` | Dashboard | Stats, upcoming reviews, quick links |
| `/contacts` | Contacts list | Search, filter, add |
| `/contacts/:id` | Contact detail | Profile, interactions, finances, planners |
| `/contacts/:id/edit` | Edit contact | — |
| `/retirement-planner/:id` | Retirement Planner | 3-step: needs → provision → projection |
| `/protection-planner/:id` | Protection Planner | 3-step: needs → existing → gap analysis |
| `/medical-underwriting` | Medical Underwriting | — |
| `/knowledge-library` | Knowledge Library | Folder tree, file viewer, starred items |
| `/admin` | Admin | Agent management, user creation (admin only) |
| `/settings` | Settings | Profile + password change |

---

## Local Development

### Prerequisites

- Node.js ≥ 18
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with D1 and R2 access

### Setup

```bash
git clone git@github.com:<your-org>/sora-advisory.git
cd sora-advisory
npm install
```

### Create a local D1 database

```bash
# Create the DB (first time only)
wrangler d1 create goalsmapping-db

# Apply schema
wrangler d1 execute goalsmapping-db --file=./schema.sql --local

# Apply all migrations (run in order)
wrangler d1 execute goalsmapping-db --file=./migrate_add_financials.sql --local
wrangler d1 execute goalsmapping-db --file=./migrate_add_admin.sql --local
wrangler d1 execute goalsmapping-db --file=./migrate_add_agent_contact.sql --local
wrangler d1 execute goalsmapping-db --file=./migrate_add_knowledge_library.sql --local
wrangler d1 execute goalsmapping-db --file=./migrate_add_folder_nesting.sql --local
wrangler d1 execute goalsmapping-db --file=./migrate_add_favorites.sql --local

# (Optional) Load demo data
wrangler d1 execute goalsmapping-db --file=./seed.sql --local
```

### Environment variables

Set `JWT_SECRET` in your local environment. Do **not** put it in `wrangler.toml` (causes a binding conflict).

For local dev, create a `.env.local` file (gitignored):

```
JWT_SECRET=your-random-secret-here
```

For production, set it in **Cloudflare Pages → Settings → Environment variables**.

### Run locally

```bash
npm run dev
```

This starts Vite on `http://localhost:5173` with hot reload. Note: the Cloudflare Pages Functions (API routes) are **not** served by `npm run dev` — use `wrangler pages dev dist` to test the full stack locally (requires a production build first).

```bash
npm run build
wrangler pages dev dist
```

---

## Database Migrations

All schema changes live in `migrate_*.sql` files at the root. Always apply them in creation-date order. To apply to **production**:

```bash
wrangler d1 execute goalsmapping-db --file=./migrate_<name>.sql --remote
```

Never modify `schema.sql` after initial setup — add new migration files instead.

---

## Deployment

```bash
npm run deploy
# Equivalent to: npm run build && wrangler pages deploy dist
```

Deploys to Cloudflare Pages. The production URL is `portal.llhgroup.co`.

Make sure `JWT_SECRET` is set as an environment variable in the Cloudflare Pages dashboard before deploying.

---

## API Routes (Cloudflare Pages Functions)

All routes are under `/api/` and require a valid JWT bearer token except `/api/auth/login`.

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Current agent profile |
| `GET/PUT` | `/api/agent/profile` | View/update profile |
| `POST` | `/api/agent/password` | Change password |
| `GET/POST` | `/api/contacts` | List / create contacts |
| `GET/PUT/DELETE` | `/api/contacts/:id` | Get / update / delete contact |
| `GET/POST` | `/api/admin/agents` | List agents / create agent (admin) |
| `GET/PUT/DELETE` | `/api/admin/agents/:code` | Manage agent (admin) |
| `GET` | `/api/admin/agents/:code/contacts` | View agent's contacts (admin) |
| `GET/POST` | `/api/library/folders` | List / create folders |
| `GET/PUT/DELETE` | `/api/library/folders/:id` | Manage folder |
| `GET` | `/api/library/folders/:id/files` | List files in folder |
| `GET/POST` | `/api/library/files` | List / upload files |
| `GET/DELETE` | `/api/library/files/:id` | Get / delete file |
| `GET` | `/api/library/files/:id/view` | Signed R2 URL for file |
| `POST/DELETE` | `/api/library/files/:id/star` | Star / unstar file |
| `GET` | `/api/library/favorites` | List starred files |
| `POST` | `/api/documents/plan` | Generate plan document |
| `POST` | `/api/documents/underwriting` | Generate underwriting doc |
| `POST` | `/api/documents/recruitment` | Generate recruitment doc |

---

## Roles

| Role | Access |
|---|---|
| `agent` | Own contacts, own profile, knowledge library |
| `admin` | Everything above + agent management, admin dashboard |

