#!/usr/bin/env bash
# Export a point-in-time copy of the Turso database before a migration or a
# large ingest. Run from the repository root.
#
#   bash scripts/backup-turso.sh
#
# Requires the Turso CLI and an authenticated session. The output is a local
# SQLite file and its WAL; it is intentionally ignored by git.
set -euo pipefail

DB_NAME="${TURSO_DB_NAME:-tnea-compass}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${TURSO_BACKUP_DIR:-backups}"
OUT_FILE="$OUT_DIR/${DB_NAME}-${STAMP}.db"

mkdir -p "$OUT_DIR"

if ! command -v turso >/dev/null 2>&1; then
  if [ -x "$HOME/.turso/turso" ]; then
    export PATH="$HOME/.turso:$PATH"
  else
    echo "turso CLI not found. Add it to PATH or install it first." >&2
    exit 1
  fi
fi

echo "Exporting $DB_NAME to $OUT_FILE ..."
turso db export "$DB_NAME" --output-file "$OUT_FILE" --overwrite

echo "Done."
ls -lh "$OUT_FILE"*
echo
echo "Keep these files out of git. Restore by importing the snapshot into a"
echo "new database, then point DATABASE_URL at it before redeploying."
