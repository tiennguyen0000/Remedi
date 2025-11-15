#!/usr/bin/env bash
# Database seeding script - cross-platform compatible
set -euo pipefail

HOST="${POSTGRES_HOST:-postgres}"
USER="${POSTGRES_USER:-admin}"
DB="${POSTGRES_DB:-medicine_recycling}"

echo "[db-init] Waiting for PostgreSQL at ${HOST}..."
until pg_isready -h "${HOST}" -U "${USER}" -d "${DB}" >/dev/null 2>&1; do
  sleep 1
done

# Check if database is already initialized (cross-platform safe)
EXISTS=$(psql -h "${HOST}" -U "${USER}" -d "${DB}" -tAc "SELECT to_regclass('public.users') IS NOT NULL" | tr -d '[:space:]')
if [ "${EXISTS}" = "t" ]; then
  echo "[db-init] Database already initialized. Skipping seed."
  exit 0
fi

echo "[db-init] Applying seed data from /init.sql..."
psql -h "${HOST}" -U "${USER}" -d "${DB}" -v ON_ERROR_STOP=1 -f /init.sql
echo "[db-init] Seed completed successfully."

# Generate PDF certificates for approved submissions
echo "[db-init] Generating PDF certificates for approved submissions..."
python3 /app/generate_init_certificates.py

echo "[db-init] Database initialization complete."
echo "[db-init] ✓ All initial data and certificates are ready!"

