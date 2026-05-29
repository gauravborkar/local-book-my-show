#!/usr/bin/env bash
# Shared Render build steps (API + web). Install devDependencies despite NODE_ENV=production on the service.
set -euo pipefail
npm install -g pnpm@9.15.0
NODE_ENV=development pnpm install --no-frozen-lockfile
pnpm --filter @localbms/shared build
exec "$@"
