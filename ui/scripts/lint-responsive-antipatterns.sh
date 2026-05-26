#!/usr/bin/env bash
# Salvaguardia post-Fase-0: detecta antipatterns que bloquean responsive.
#
# Política:
#   - z-[N] arbitrarios → FAIL (Fase 0 ya migró todos al scale z-modal/
#     z-navbar/z-dropdown/etc. Cualquier nuevo z-[N] es regresión).
#   - window.innerWidth raw → FAIL (usar useIsMobile / useBreakpoint).
#   - w-[Npx] / h-[Npx] arbitrarios → WARN con count (migración pendiente
#     en Fases 3-5; cuando todos sean 0, convertir el warn a FAIL).
#
# Diseñado para correr en CI después de `yarn lint`. Se integra desde el
# script `lint` en package.json como `yarn lint:responsive`.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$UI_DIR/src"

fail=0

echo "Buscando antipatterns responsive..."

# 1) z-[N] arbitrarios. Excluye el hook canónico que define la escala.
#    Migrados en Fase 0: BaseModal, AppFilterBar, Navbar, Menu, ArchivedLots,
#    SummaryResultsReport, drawer-root en index.css.
z_hits="$(grep -rnE 'z-\[[0-9]+\]' "$SRC" \
  --include='*.ts' --include='*.tsx' --include='*.css' 2>/dev/null || true)"
if [[ -n "$z_hits" ]]; then
  echo
  echo "✖ z-[N] arbitrario detectado (usar escala z-modal/z-navbar/z-dropdown/z-sticky/z-nav-menu/z-drawer/z-popover/z-tooltip/z-notification de tailwind.config.js)"
  echo "$z_hits"
  fail=1
fi

# 2) window.innerWidth raw. Excluye el hook canónico que lo encapsula.
innerwidth_hits="$(grep -rnE 'window\.innerWidth' "$SRC" \
  --include='*.ts' --include='*.tsx' 2>/dev/null \
  | grep -vE 'hooks/useBreakpoint\.ts' || true)"
if [[ -n "$innerwidth_hits" ]]; then
  echo
  echo "✖ window.innerWidth raw — usar useIsMobile() o useBreakpoint() de @/hooks/useBreakpoint"
  echo "$innerwidth_hits"
  fail=1
fi

# 3) w-[Npx] / h-[Npx] / min-w-[Npx] / max-w-[Npx] arbitrarios. WARN-only
#    durante la migración progresiva. Convertir a FAIL cuando count = 0.
width_hits="$(grep -rnE 'w-\[[0-9]+px\]|min-w-\[[0-9]+px\]|max-w-\[[0-9]+px\]' "$SRC" \
  --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l)"
height_hits="$(grep -rnE 'h-\[[0-9]+px\]|min-h-\[[0-9]+px\]|max-h-\[[0-9]+px\]' "$SRC" \
  --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l)"

if [[ "$width_hits" -gt 0 || "$height_hits" -gt 0 ]]; then
  echo
  echo "⚠ widths/heights arbitrarios pendientes de migración (Fases 3-5):"
  echo "    w-[Npx] / min-w-[Npx] / max-w-[Npx] : $width_hits"
  echo "    h-[Npx] / min-h-[Npx] / max-h-[Npx] : $height_hits"
  echo "  No bloquea CI todavía. Bajalos a 0 antes de cerrar Fase 5."
fi

if [[ $fail -ne 0 ]]; then
  echo
  echo "✗ Antipatterns responsive bloqueantes detectados. Fijar antes de mergear."
  exit 1
fi

echo "✓ Sin antipatterns responsive bloqueantes."
