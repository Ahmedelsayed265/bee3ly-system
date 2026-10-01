#!/bin/sh
set -e

if [ -n "${DB_HOST}" ] && [ -n "${DB_USER}" ] && [ -n "${DB_PASSWORD}" ] && [ -n "${DB_NAME}" ]; then
  DB_PORT="${DB_PORT:-5432}"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
fi

if [ -z "${DATABASE_URL}" ]; then
  echo "DATABASE_URL is not set (provide DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME)" >&2
  exit 1
fi

npx prisma migrate deploy
exec node dist/main.js
