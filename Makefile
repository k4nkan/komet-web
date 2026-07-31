SHELL = /bin/sh

.PHONY: all stop

all:
	@set -eu; \
	docker compose up -d --build --force-recreate; \
	URL=""; \
	COUNT=0; \
	while [ "$$COUNT" -lt 30 ]; do \
		URL="$$(docker compose logs tunnel 2>&1 \
			| sed -n 's/.*\(https:\/\/[a-zA-Z0-9.-]*\.trycloudflare\.com\).*/\1/p' \
			| grep -v '^https://api\.trycloudflare\.com$$' \
			| tail -1)"; \
		if [ -n "$$URL" ]; then \
			break; \
		fi; \
		COUNT=$$((COUNT + 1)); \
		sleep 1; \
	done; \
	if [ -z "$$URL" ]; then \
		echo "Could not create Cloudflare Tunnel URL." >&2; \
		echo "Check: docker compose logs tunnel" >&2; \
		exit 1; \
	fi; \
	WS_URL="$$(printf '%s' "$$URL" | sed 's/^http/ws/')/ws/host"; \
	printf 'Host:      %s/host\n' "$$URL"; \
	printf 'Comment:   %s/client\n' "$$URL"; \
	printf 'WebSocket: %s\n' "$$WS_URL"

stop:
	@docker compose down
