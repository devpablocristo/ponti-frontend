#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
AUTH_BEARER_TOKEN="${AUTH_BEARER_TOKEN:-}"
REQUIRE_AUTH_SMOKE="${REQUIRE_AUTH_SMOKE:-0}"

if [[ -z "${BASE_URL}" ]]; then
  echo "ERROR: BASE_URL vacío." >&2
  exit 1
fi

request_status() {
  local url="$1"
  local use_auth="${2:-0}"
  local -a args
  args=(-sS -o /tmp/frontend-smoke-body.txt -w "%{http_code}")
  if [[ "$use_auth" == "1" && -n "$AUTH_BEARER_TOKEN" ]]; then
    args+=(-H "Authorization: Bearer ${AUTH_BEARER_TOKEN}")
  fi
  args+=("$url")
  curl "${args[@]}"
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
if [[ "${ping_status}" != "200" && "${ping_status}" != "401" ]]; then
  echo "ERROR: BFF ping devolvió status inesperado ${ping_status} (esperado 200/401)." >&2
  [[ -f /tmp/frontend-smoke-body.txt ]] && sed -n '1,20p' /tmp/frontend-smoke-body.txt >&2 || true
  exit 1
fi

echo "[smoke-fe] Check BFF version..."
version_status="$(request_status "${BASE_URL%/}/api/v1/version")"
if [[ "${version_status}" != "200" && "${version_status}" != "401" ]]; then
  echo "ERROR: BFF version devolvió status inesperado ${version_status} (esperado 200/401)." >&2
  [[ -f /tmp/frontend-smoke-body.txt ]] && sed -n '1,20p' /tmp/frontend-smoke-body.txt >&2 || true
  exit 1
fi

echo "[smoke-fe] Check protected route guard..."
if [[ "${REQUIRE_AUTH_SMOKE}" == "1" && -z "${AUTH_BEARER_TOKEN}" ]]; then
  echo "ERROR: REQUIRE_AUTH_SMOKE=1 pero falta AUTH_BEARER_TOKEN." >&2
  exit 1
fi

if [[ -n "${AUTH_BEARER_TOKEN}" ]]; then
  guard_status="$(request_status "${BASE_URL%/}/api/v1/work-orders?page=1&per_page=1" "1")"
  if [[ "${guard_status}" != "200" ]]; then
    echo "ERROR: smoke autenticado esperado con status 200 en ruta protegida, obtenido ${guard_status}." >&2
    [[ -f /tmp/frontend-smoke-body.txt ]] && sed -n '1,30p' /tmp/frontend-smoke-body.txt >&2 || true
    exit 1
  fi
else
  guard_status="$(request_status "${BASE_URL%/}/api/v1/work-orders?page=1&per_page=1")"
  if [[ "${guard_status}" != "401" && "${guard_status}" != "403" ]]; then
    echo "ERROR: ruta protegida no respondió 401/403 (status ${guard_status})." >&2
    [[ -f /tmp/frontend-smoke-body.txt ]] && sed -n '1,20p' /tmp/frontend-smoke-body.txt >&2 || true
    exit 1
  fi
fi

echo "[smoke-fe] OK - frontend/bff validado."
