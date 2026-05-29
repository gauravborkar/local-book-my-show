#!/usr/bin/env bash
# Deploy local-book-my-show to Render (Project-based, not Blueprint).
# Requires: render CLI logged in (`render login`) or RENDER_API_KEY set.
set -euo pipefail

REPO="https://github.com/gauravborkar/local-book-my-show"
BRANCH="main"
ROOT="."
BUILD="npm install -g pnpm@9.15.0 && NODE_ENV=development pnpm install --no-frozen-lockfile && pnpm --filter @localbms/shared build"
API_BUILD="${BUILD} && pnpm --filter @localbms/api build"
WEB_BUILD="${BUILD} && pnpm --filter @localbms/web build"
API_START="node apps/api/dist/server.js"

if ! command -v render >/dev/null 2>&1; then
  echo "Install Render CLI: curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh"
  exit 1
fi

if [ -z "${RENDER_API_KEY:-}" ] && ! render whoami -o json >/dev/null 2>&1; then
  echo "Run: render login   (or export RENDER_API_KEY)"
  exit 1
fi

ENV_ID="${RENDER_ENVIRONMENT_ID:-}"
if [ -z "$ENV_ID" ]; then
  echo "Set RENDER_ENVIRONMENT_ID to your Render project environment ID."
  echo "Find it: render projects -o json  →  environments[].id"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL (Supabase session pooler URL with ?sslmode=require)"
  exit 1
fi

create_api() {
  render services create --confirm -o json \
    --name localbms-api \
    --type web_service \
    --runtime node \
    --region oregon \
    --plan free \
    --repo "$REPO" \
    --branch "$BRANCH" \
    --root-directory "$ROOT" \
    --build-command "$API_BUILD" \
    --start-command "$API_START" \
    --health-check-path /api/health/ready \
    --environment-id "$ENV_ID" \
    --env-var "NODE_ENV=production" \
    --env-var "DATABASE_URL=${DATABASE_URL}" \
    --env-var "JWT_EXPIRES_IN=7d" \
    --env-var "MOCK_PAYMENTS=true" \
    --env-var "FRONTEND_URL=${FRONTEND_URL:-}" \
    --env-var "CORS_ORIGINS=${CORS_ORIGINS:-}"
}

create_web() {
  render services create --confirm -o json \
    --name localbms-web \
    --type static_site \
    --repo "$REPO" \
    --branch "$BRANCH" \
    --root-directory "$ROOT" \
    --build-command "$WEB_BUILD" \
    --publish-directory apps/web/dist \
    --environment-id "$ENV_ID" \
    --env-var "VITE_API_URL=${VITE_API_URL:-}"
}

case "${1:-}" in
  api) create_api ;;
  web) create_web ;;
  *)
    echo "Usage: DATABASE_URL=... RENDER_ENVIRONMENT_ID=... FRONTEND_URL=... CORS_ORIGINS=... VITE_API_URL=... $0 api|web"
    exit 1
    ;;
esac
