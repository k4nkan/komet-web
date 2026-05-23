#!/bin/sh
set -eu

if [ "${CONFIRM:-}" != "reset" ]; then
  echo "This deletes all comments."
  echo "Run: CONFIRM=reset sh reset-comments.sh"
  exit 1
fi

docker compose exec -T komet node src/reset-comments.mjs
docker compose restart komet

echo "All comments deleted."
