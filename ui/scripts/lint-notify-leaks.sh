#!/usr/bin/env bash
# Salvaguardia post-cutover: falla si encuentra patrones de feedback al
# usuario que no pasan por el módulo unificado (`notify` + `Notification`
# + `formatError`).
#
# Diseñado para correr en CI después de `yarn lint`. Cuando aparezca un
# nuevo patrón anti-pipeline (ej. otra forma creativa de exponer JSON
# crudo), agregar el grep correspondiente acá.
#
# Cada chequeo es un grep -rE con patrón pesimista. Si matchea aunque sea
# una vez, el script termina con exit 1 y reporta los hits. Cero hits = OK.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$UI_DIR/src"

fail=0

scan() {
  local label="$1"
  local pattern="$2"
  shift 2
  local -a paths=("$@")
  if [[ ${#paths[@]} -eq 0 ]]; then
    paths=("$SRC")
  fi
  local out
  out="$(grep -rnE "$pattern" "${paths[@]}" --include='*.ts' --include='*.tsx' 2>/dev/null || true)"
  if [[ -n "$out" ]]; then
    echo
    echo "✖ $label"
    echo "$out"
    fail=1
  fi
}

echo "Buscando feedback al usuario que NO pase por el módulo unificado..."

# 1) setError / setSubmitError con `.message` crudo del error.
scan "setError con .message crudo (usar formatError en su lugar)" \
  'set(Error|SubmitError)\(\s*(err|error|e)\.message\b' "$SRC"

# 2) JSX que pinta directo {error} dentro de un <p> rojo.
scan "<p text-red-*>{error}</p> renderizado inline (usar useEffect → notify.error)" \
  '<p[^>]*text-(red|rose|orange)-[5-9]00[^>]*>\s*\{[^}]*error' "$SRC/pages" "$SRC/components"

# 3) JSON.stringify(error) o (err) en cualquier archivo de UI (pages/components).
scan "JSON.stringify(error|err) en pages/components (NUNCA mostrar JSON crudo al user)" \
  'JSON\.stringify\([^)]*(err|error)' "$SRC/pages" "$SRC/components"

# 4) alert() con texto al usuario.
scan "alert() — usar notify.{error,warning,info,success}" \
  '(^|[^a-zA-Z_$.])alert\(\s*["`]' "$SRC/pages" "$SRC/components" "$SRC/hooks"

# 5) Import directo de `sonner` fuera del wrapper oficial.
#    Permitido: `lib/notify.ts` y `components/AppToaster.tsx`. Cualquier otro
#    consumer debe usar `notify.{success,warning,info,error}` para mantener
#    la API unificada.
sonner_hits="$(grep -rnE 'from\s+["\x27]sonner["\x27]' "$SRC" \
  --include='*.ts' --include='*.tsx' 2>/dev/null \
  | grep -vE '(lib/notify\.ts|components/AppToaster\.tsx)' || true)"
if [[ -n "$sonner_hits" ]]; then
  echo
  echo "✖ import directo de sonner fuera del wrapper oficial (usar @/lib/notify)"
  echo "$sonner_hits"
  fail=1
fi

if [[ $fail -ne 0 ]]; then
  echo
  echo "✗ Hay leaks fuera del módulo unificado. Migrarlos antes de mergear."
  exit 1
fi

echo "✓ Sin leaks. Todas las notificaciones pasan por el módulo unificado."
