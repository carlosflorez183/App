#!/usr/bin/env bash
# =============================================
#  Respaldo de la base PostgreSQL del stack.
#
#  Uso:
#    npm run backup                # guarda en ./backups
#    scripts/backup-db.sh /ruta    # directorio a medida
#
#  Restaurar (¡sobrescribe la base actual!):
#    gunzip -c backups/uni_plataforma-<sello>.sql.gz \
#      | docker exec -i uni-db psql -U uni -d uni_plataforma
# =============================================
set -euo pipefail

DESTINO="${1:-backups}"
CONTENEDOR="${DB_CONTAINER:-uni-db}"
USUARIO="${DB_USER:-uni}"
BASE="${DB_NAME:-uni_plataforma}"
SELLO="$(date +%Y%m%d-%H%M%S)"
ARCHIVO="$DESTINO/uni_plataforma-$SELLO.sql.gz"

# En WSL el binario puede llamarse `docker.exe`; se admite override con DOCKER.
DOCKER="${DOCKER:-$(command -v docker || command -v docker.exe || true)}"
if [ -z "$DOCKER" ]; then
  echo "No se encontró el comando docker. Define DOCKER con la ruta al ejecutable." >&2
  exit 1
fi

if ! "$DOCKER" exec "$CONTENEDOR" pg_isready -U "$USUARIO" -d "$BASE" >/dev/null 2>&1; then
  echo "No se pudo contactar la base en el contenedor '$CONTENEDOR'. ¿Está arriba el stack?" >&2
  exit 1
fi

mkdir -p "$DESTINO"
"$DOCKER" exec "$CONTENEDOR" pg_dump -U "$USUARIO" "$BASE" | gzip > "$ARCHIVO"

echo "Respaldo creado: $ARCHIVO"
