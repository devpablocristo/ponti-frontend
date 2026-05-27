#!/usr/bin/env bash
# Verificación en cadena (divide y vencerás): cada paso debe dar 200 antes de mirar el stream.
# Uso: desde repo web, con core y BFF levantados:
#   BASE_MANAGER_API=http://localhost:8080/api/v1 BFF_URL=http://localhost:3001 ./scripts/verify-chat-stream-hops.sh

set -euo pipefail

BASE_MANAGER_API="${BASE_MANAGER_API:-http://localhost:8080/api/v1}"
BFF_URL="${BFF_URL:-http://localhost:3001}"

echo "== Paso 1 (100%): core alcanzable — GET ${BASE_MANAGER_API%/}/ping =="
curl -sfS "${BASE_MANAGER_API%/}/ping" -o /dev/null -w "HTTP %{http_code}\n"

echo "== Paso 2 (100%): BFF alcanzable — GET ${BFF_URL%/}/api/v1/ping =="
curl -sfS "${BFF_URL%/}/api/v1/ping" -o /dev/null -w "HTTP %{http_code}\n"

echo "== Paso 3: POST chat/stream (requiere cookies/JWT + X-Project-Id; sin eso esperá 401/400) =="
echo "    Omitido aquí. Probar desde la UI o curl con los mismos headers que el navegador."
echo "OK: saltos 1 y 2 verificados."
