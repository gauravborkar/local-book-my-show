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

### Database (Supabase)

This project uses **[Supabase](https://supabase.com) PostgreSQL** (not a database hosted on Render).

1. In Supabase → **Project Settings** → **Database**, copy the **Session pooler** connection string (IPv4-friendly).
2. Append `?sslmode=require` if it is not already in the URL.
3. Set `DATABASE_URL` in `apps/api/.env` for local dev and in Render for production (see below).

Apply schema locally:

```bash
pnpm --filter @localbms/api db:push
pnpm --filter @localbms/api db:seed   # optional demo data
```

### Full stack on Render (Project — recommended)

Deploy with a **Render Project**, not a Blueprint. Step-by-step guide:

**[docs/RENDER_PROJECT.md](docs/RENDER_PROJECT.md)**

Summary:

- **Database:** Supabase (`DATABASE_URL` on the API service only)
- **API:** Web Service `localbms-api` — build/start commands in the doc above
- **Web:** Static Site `localbms-web` — `VITE_API_URL` → API URL

Optional CLI: `scripts/render-deploy.sh` (requires `render login` and `RENDER_ENVIRONMENT_ID`).

Health check: `/api/health/ready`

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
