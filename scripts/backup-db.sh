#!/usr/bin/env bash
set -euo pipefail

APP_NAME="partsec-one-portal"
APP_DIR="/var/www/partsec-one-portal"
BACKUP_DIR="/var/backups/partsec-one-portal"
DATE="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${APP_NAME}-${DATE}.dump"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "Arquivo .env não encontrado."
  exit 1
fi

set -a
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL não configurado."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# O Prisma usa ?schema=public, mas pg_dump não aceita esse query parameter.
# Removemos qualquer query string da DATABASE_URL para uso no pg_dump.
DATABASE_URL_FOR_PGDUMP="${DATABASE_URL%%\?*}"

pg_dump "$DATABASE_URL_FOR_PGDUMP" -Fc -f "$BACKUP_FILE"

gzip "$BACKUP_FILE"

find "$BACKUP_DIR" -type f -name "${APP_NAME}-*.dump.gz" -mtime +14 -delete

echo "Backup criado: ${BACKUP_FILE}.gz"
