#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/partsec-one-portal"
APP_NAME="partsec-one-portal"

cd "$APP_DIR"

echo "==> Criando backup antes do deploy"
if [ -f scripts/backup-db.sh ]; then
  scripts/backup-db.sh
else
  echo "scripts/backup-db.sh não encontrado. Abortando deploy por segurança."
  exit 1
fi

echo "==> Atualizando código"
git pull

echo "==> Instalando dependências"
npm install

echo "==> Validando ambiente"
if [ -f scripts/check-env.ts ]; then
  npx tsx scripts/check-env.ts
else
  echo "scripts/check-env.ts não encontrado. Pulando validação."
fi

echo "==> Aplicando migrations"
npx prisma migrate deploy
npx prisma generate

echo "==> Build"
npm run build

echo "==> Reiniciando PM2"
pm2 restart "$APP_NAME"

echo "==> Status"
pm2 status "$APP_NAME"

echo "Deploy concluído."
