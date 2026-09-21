#!/bin/sh
# Container entrypoint: migrate -> seed (once) -> serve.
# POSIX sh (dash on debian-slim) - keep ASCII-only and dash-compatible.

set -u

fail() {
  echo "Entrypoint: $1" >&2
  exit 1
}

# Compose files do not set SKIP_SEED - every referenced variable needs a
# default expansion or `set -u` kills the script (restart loop).
DATABASE_PROVIDER="${DATABASE_PROVIDER:-postgres}"
SKIP_SEED="${SKIP_SEED:-false}"

echo "Entrypoint: starting (DATABASE_PROVIDER=${DATABASE_PROVIDER})..."

# --- migrate ---
if [ "${DATABASE_PROVIDER}" = "pglite" ]; then
  echo "Entrypoint: applying migrations to the embedded database..."
  node scripts/migrate-pglite.mjs || fail "embedded migration failed"
else
  echo "Entrypoint: applying prisma migrations..."
  npx prisma migrate deploy || fail "prisma migrate deploy failed"
fi

# --- seed (once, marker-file guarded) ---
if [ "${SKIP_SEED}" = "true" ]; then
  echo "Entrypoint: seed skipped (SKIP_SEED=true)."
elif [ -f /app/.storage/.seeded ]; then
  echo "Entrypoint: seed already applied."
else
  echo "Entrypoint: seeding default settings and system roles..."
  if npx prisma db seed && touch /app/.storage/.seeded; then
    echo "Entrypoint: seed complete."
  else
    echo "Entrypoint: seed failed - continuing anyway (retry on next boot)."
  fi
fi

# --- serve ---
echo "Entrypoint: starting server..."
exec node server.js
