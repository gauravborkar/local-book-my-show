# Deploy on Render (Project — not Blueprint)

Use a **Render Project** to group services. Do **not** use a root `render.yaml` Blueprint (that file is kept only as `infrastructure/render.blueprint.yaml.backup`).

Database: **Supabase** only (`DATABASE_URL` = Session pooler URL + `?sslmode=require`).

**Build note:** The service may set `NODE_ENV=production`, which makes `pnpm install` skip devDependencies (`prisma`, `typescript`). Prefix install with `NODE_ENV=development` in the build command (runtime can stay `production`).

## 1. Create or pick a project

Dashboard → **New** → **Project** → name e.g. `local-book-my-show`, environment `Production`.

(Hobby workspaces are limited to **one extra project**; you can reuse an existing empty project and rename it under **Settings**.)

## 2. Create services inside the project

When creating each service, choose **Project** = `local-book-my-show` and **Environment** = `Production`.

### API — Web Service

| Setting | Value |
|--------|--------|
| Name | `localbms-api` |
| Repo | `gauravborkar/local-book-my-show` |
| Branch | `main` |
| Root Directory | *(empty = repo root)* |
| Runtime | Node |
| Build Command | `npm install -g pnpm@9.15.0 && NODE_ENV=development pnpm install --no-frozen-lockfile && pnpm --filter @localbms/shared build && pnpm --filter @localbms/api build` |
| Start Command | `node apps/api/dist/server.js` |
| Health Check Path | `/api/health/ready` |

**Environment variables:**

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Supabase session pooler URL |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `MOCK_PAYMENTS` | `true` |
| `FRONTEND_URL` | `https://localbms-web.onrender.com` (after web is live) |
| `CORS_ORIGINS` | same as `FRONTEND_URL` |

### Web — Static Site

| Setting | Value |
|--------|--------|
| Name | `localbms-web` |
| Repo | same |
| Branch | `main` |
| Root Directory | *(empty)* |
| Build Command | `npm install -g pnpm@9.15.0 && NODE_ENV=development pnpm install --no-frozen-lockfile && pnpm --filter @localbms/shared build && pnpm --filter @localbms/web build` |
| Publish Directory | `apps/web/dist` |

**Environment variables:**

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://localbms-api.onrender.com` |

Add a **Rewrite** rule: `/*` → `/index.html` (SPA).

## 3. Move existing Blueprint services (optional)

If `localbms-api` / `localbms-web` were created by a Blueprint:

1. Dashboard → select both services → **Move** → your project / Production.
2. **Blueprints** → delete or disconnect the `local-book-my-show` blueprint so it stops overriding settings.

## 4. CLI alternative

```bash
render login
export RENDER_ENVIRONMENT_ID="<env-id-from-project>"
export DATABASE_URL="<supabase-pooler-url>"
export FRONTEND_URL="https://localbms-web.onrender.com"
export CORS_ORIGINS="$FRONTEND_URL"
export VITE_API_URL="https://localbms-api.onrender.com"
chmod +x scripts/render-deploy.sh
./scripts/render-deploy.sh api
./scripts/render-deploy.sh web
```

## 5. After deploy

1. Redeploy **web** once API URL is live (so `VITE_API_URL` is baked into the build).
2. Schema is already on Supabase if you ran `db:push` locally; otherwise run it locally against the same `DATABASE_URL`.
