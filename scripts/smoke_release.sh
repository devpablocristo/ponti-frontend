#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"

if [[ -z "${BASE_URL}" ]]; then
  echo "ERROR: BASE_URL vacío." >&2
  exit 1
fi

request_status() {
  local url="$1"
  curl -sS -o /tmp/frontend-smoke-body.txt -w "%{http_code}" "$url"
}

assert_status() {
  local expected="$1"
  local got="$2"
  local label="$3"
  if [[ "$expected" != "$got" ]]; then
    echo "ERROR: ${label}. Esperado ${expected}, obtenido ${got}." >&2
    [[ -f /tmp/frontend-smoke-body.txt ]] && sed -n '1,10p' /tmp/frontend-smoke-body.txt >&2 || true
    exit 1
  fi
}

echo "[smoke-fe] Check UI root..."
root_status="$(request_status "${BASE_URL%/}/")"
if [[ "${root_status}" == "200" ]]; then
  python3 - <<'PY'
from pathlib import Path
body = Path("/tmp/frontend-smoke-body.txt").read_text(errors="replace").lower()
if "<html" not in body:
    raise SystemExit("UI root no devolvió HTML")
PY
elif [[ "${root_status}" == "404" ]]; then
  echo "[smoke-fe] WARN: root devolvió 404 (esperable en local sin build estático del UI)."
else
  echo "ERROR: UI root devolvió status inesperado ${root_status}." >&2
  sed -n '1,15p' /tmp/frontend-smoke-body.txt >&2 || true
  exit 1
fi

echo "[smoke-fe] Check BFF ping..."
ping_status="$(request_status "${BASE_URL%/}/api/v1/ping")"
assert_status "200" "${ping_status}" "BFF ping no responde 200"

echo "[smoke-fe] Check BFF version..."
version_status="$(request_status "${BASE_URL%/}/api/v1/version")"
assert_status "200" "${version_status}" "BFF version no responde 200"

echo "[smoke-fe] Check protected route guard..."
guard_status="$(request_status "${BASE_URL%/}/api/v1/work-orders?page=1&per_page=1")"
if [[ "${guard_status}" != "401" && "${guard_status}" != "403" ]]; then
  echo "ERROR: ruta protegida no respondió 401/403 (status ${guard_status})." >&2
  [[ -f /tmp/frontend-smoke-body.txt ]] && sed -n '1,20p' /tmp/frontend-smoke-body.txt >&2 || true
  exit 1
fi

echo "[smoke-fe] OK - frontend/bff validado."
