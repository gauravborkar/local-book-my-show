# LocalBMS — Local Event Discovery & Ticketing

A full-stack MVP for discovering local events, booking tickets, and managing venues/shows — inspired by BookMyShow, built for local organizers.

## Architecture

```
local-book-my-show/
├── apps/
│   ├── api/          # Express + Prisma + PostgreSQL (Render / Vercel)
│   └── web/          # React 19 + Vite + TanStack Query (Netlify)
├── packages/
│   └── shared/       # Shared types & constants
└── docker-compose.yml
```

| Layer | Stack |
|--------|--------|
| Frontend | React 19, Vite 6, Tailwind CSS 4, React Router 7, TanStack Query, Zustand |
| Backend | Node 20, Express, Prisma 6, PostgreSQL, JWT, Stripe (optional) |
| Deploy | Netlify (web), Render or Vercel (api), Neon/Supabase/Railway (database) |

## Features (MVP)

**Public**
- Browse & search published events (city, category, keyword)
- Event detail with showtimes and ticket types
- Checkout with inventory holds (10 min) and mock or Stripe payment
- Booking confirmation & lookup by code

**Attendee**
- Register / login
- My bookings

**Event manager**
- Manage facilities (venues)
- Create events, schedule shows, define ticket types & pricing
- Submit events for admin review
- Dashboard (bookings, revenue)
- Door check-in by booking code

**Admin**
- Approve / reject pending events
- Platform stats

## Quick start (local)

### Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable`)
- Docker (for PostgreSQL)

### 1. Start database

```bash
docker compose up -d
```

### 2. Configure API

```bash
cp .env.example apps/api/.env
```

### 3. Install & setup

```bash
pnpm install
pnpm db:push
pnpm db:seed
```

### 4. Run dev servers

```bash
pnpm dev
```

- **Web:** http://localhost:5173 (proxies `/api` → API)
- **API:** http://localhost:4000

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@localbms.com | password123 |
| Event manager | manager@localbms.com | password123 |
| Attendee | user@localbms.com | password123 |

## Environment variables

### API (`apps/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing (32+ chars in prod) |
| `FRONTEND_URL` | Frontend origin for redirects |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `MOCK_PAYMENTS` | `true` to skip Stripe (default if no Stripe key) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Web (`apps/web/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL (empty = same-origin / proxy in dev) |

## Deployment

### Database

Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or Render PostgreSQL. Run migrations:

```bash
cd apps/api && npx prisma migrate deploy
```

### Full stack on Render (recommended)

This repo includes a root Render Blueprint at `render.yaml` that provisions:

- `localbms-postgres` (Render Postgres)
- `localbms-api` (Node web service)
- `localbms-web` (static site)

#### One-time setup

1. In Render, click **New +** → **Blueprint**.
2. Connect this repo and select the root `render.yaml`.
3. After creation:
   - Open **localbms-api** env vars and set:
     - `FRONTEND_URL` = your web service URL (for example `https://localbms-web.onrender.com`)
     - `CORS_ORIGINS` = same URL (or comma-separated list)
   - Open **localbms-web** env vars and set:
     - `VITE_API_URL` = your API URL (for example `https://localbms-api.onrender.com`)
4. Redeploy both services after env var changes.

#### Database schema + seed on Render

Run once after deploy from your local machine (pointing to Render DB URL), or via Render shell:

```bash
pnpm --filter @localbms/api db:push
pnpm --filter @localbms/api db:seed
```

The API health endpoint is:

```bash
/api/health/ready
```

### API-only on Render

If you only want backend on Render, you can still use `apps/api/render.yaml`.

### API on Vercel

1. Set project root to `apps/api`
2. Deploy with `vercel.json` (serverless via `serverless-http`)
3. Add env vars in Vercel dashboard
4. Use Neon/serverless Postgres for `DATABASE_URL`

### Frontend on Netlify

1. Connect repository
2. Build settings (or use `apps/web/netlify.toml`):
   - Base directory: `apps/web`
   - Build command: see `netlify.toml`
   - Publish: `dist`
3. Set `VITE_API_URL` to your deployed API URL (e.g. `https://api.example.com`)

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/events` | List published events |
| GET | `/api/events/:slug` | Event detail |
| POST | `/api/bookings` | Create booking + checkout URL |
| GET | `/api/bookings/code/:code` | Booking by code |
| GET | `/api/manager/*` | Manager operations (auth) |
| GET | `/api/admin/*` | Admin operations (auth) |

## Scripts

```bash
pnpm dev          # API + web in parallel
pnpm build        # Build all packages
pnpm db:push      # Push Prisma schema to DB
pnpm db:seed      # Seed demo data
pnpm db:migrate   # Create migration (dev)
```

## License

MIT
