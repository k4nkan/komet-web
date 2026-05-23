#!/bin/sh
set -eu

docker compose up -d --build --force-recreate
docker compose exec -T komet node src/reset-comments.mjs
echo "Comments reset."

URL=""
COUNT=0
while [ "$COUNT" -lt 30 ]; do
  URL="$(docker compose logs tunnel 2>&1 \
    | sed -n 's/.*\(https:\/\/[a-zA-Z0-9.-]*\.trycloudflare\.com\).*/\1/p' \
    | tail -1)"
  if [ -n "$URL" ]; then
    break
  fi
  COUNT=$((COUNT + 1))
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Could not create Cloudflare Tunnel URL." >&2
  echo "Check: docker compose logs tunnel" >&2
  exit 1
fi

printf 'Host:   %s/host\n' "$URL"
printf 'Client: %s/client\n' "$URL"
