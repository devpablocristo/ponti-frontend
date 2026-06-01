# extraction-plan.md — feature-024 · openapi-and-docs (FE)

- **repo**: `/home/pablocristo/Proyectos/pablo/ponti/web` (monorepo `ui/` + `api/`)
- **rama base**: `develop` (tip `8c25e88`)
- **SOURCE**: `develop-problematico~1` (SHA `3ffcf60`). NUNCA `develop-problematico` (tip vacío/restore).
- **RANGO diff de verdad**: `fefbe695..3ffcf60`
- **rama sugerida**: `pr/feature-024-openapi-and-docs-fe`
- **merge**: independiente (no depende de ninguna feature; no bloquea ninguna).

## PR title

`docs(fe): guía CLAUDE.md de ui/, RESPONSIVE_GUIDELINES, auditoría visual de drawers y changelog PR-92 (feature-024)`

## PR description (borrador)

> Porta la documentación FE de feature-024 (OpenAPI & docs) desde `develop-problematico~1` (3ffcf60).
>
> **Incluye (alta limpia, no existían en develop):**
> - `ui/CLAUDE.md` — guía onboarding del FE: modelo conceptual de listas del menú (OT / Labores / Insumos / Stock), catálogos, tipos de movimiento de `supply_movements`, sistema único de notificaciones + dark mode, reglas de UX writing (voseo, verbos CRUDAR), convenciones de filtros workspace / CSV / respuestas BE.
> - `docs/RESPONSIVE_GUIDELINES.md` — contrato responsive: breakpoints, mobile-first, layout primitives, `ResponsiveTable`, drawers/modales, escala z-index, patrones prohibidos (lint-enforced), iOS Safari, touch targets, PDF export.
> - `docs/audit/drawers/` — auditoría visual de la normalización de drawers sobre `DrawerShell`: `report.md` + `inventory.md` + `drawer-standard.md` + 45 PNG before/after + 7 `.txt` de artefactos Playwright.
> - `PR-92.md` — changelog narrativo del big-bang "Nueva Versión Ponti" (referencia histórica).
>
> **NO incluye:** cambios de `README.md`/`ui/README.md` (su rename `core→platform` / retiro `xlsx` pertenece a feature-001 / 021).
>
> Cero cambios en `ui/src`, `api/src`, deps, lockfiles o config. Solo documentación + binarios de evidencia.

## Pasos ordenados

1. `git -C web checkout develop && git -C web pull` (asegurar tip 8c25e88).
2. `git -C web checkout -b pr/feature-024-openapi-and-docs-fe`.
3. Traer los 3 `.md` de contenido:
   - `git checkout 3ffcf60 -- ui/CLAUDE.md docs/RESPONSIVE_GUIDELINES.md PR-92.md`
4. Traer los 3 `.md` de auditoría:
   - `git checkout 3ffcf60 -- docs/audit/drawers/report.md docs/audit/drawers/inventory.md docs/audit/drawers/drawer-standard.md`
5. Traer los binarios + txt de evidencia (carpetas enteras):
   - `git checkout 3ffcf60 -- docs/audit/drawers/after/`
   - `git checkout 3ffcf60 -- docs/audit/drawers/before/`
6. **NO** tocar `README.md` / `ui/README.md` (ver "Qué NO traer"). Si el equipo decide traer la nota OpenAPI/Axis-Companion, hacerlo con `git restore -p --source=3ffcf60 -- README.md ui/README.md` y aceptar SOLO el hunk de copy, rechazando el hunk de rename `core→platform`/`xlsx`.
7. Verificar:
   - `git diff 3ffcf60 -- ui/CLAUDE.md docs/RESPONSIVE_GUIDELINES.md PR-92.md docs/audit/` → vacío.
   - `git diff --check` → limpio (markdown, riesgo bajo).
   - `git status` → solo archivos de 024, ningún `ui/src`/`api/src`/`*.json`/lockfile.
8. `git add` de los paths, commit, push, abrir PR a `develop`.

## Archivos enteros vs parciales

- **Enteros (whole-file / binario)**: los 56 nuevos. Usar `git checkout 3ffcf60 -- <path>` (incluye PNG binarios — NUNCA copy-paste manual).
- **Parciales (partial-hunks)**: SOLO si se decide tocar `README.md`/`ui/README.md`. Por defecto: omitir.

## Migraciones / tests a incluir

- Migraciones: ninguna (no aplica a docs).
- Tests: ninguno de código. Los `*.failure.txt` son output Playwright (evidencia), NO una suite a ejecutar.

## Dependencias previas

- Ninguna feature debe mergear antes para que 024-FE funcione (es doc). Ver `dependencies.md`.
- Referencias informativas a 006/007/014/018/020 no bloquean.

## Coordinación con el otro repo (BE)

- **Orden**: para la doc pura, orden libre (independiente). Para la parte OpenAPI: el BE publica `docs/openapi/swagger.yaml` (BE-024 primero) y el FE lo consumiría con `yarn codegen:openapi` — pero ese consumo NO está en este flist FE, así que no hay bloqueo real aquí.
- **Coordinación de READMEs**: el rename `core→platform`/`ponti-frontend→web`/`xlsx` aparece en AMBOS repos como hunk de README dentro de 024. Decidir UNA vez quién es dueño (recomendado: 001/021 en cada repo) y omitirlo de los paquetes 024.
- Paquete BE de referencia: `/home/pablocristo/Proyectos/pablo/ponti/core/docs/features-develop-problematico/feature-024-openapi-and-docs/`.

## Comandos git SUGERIDOS (para un humano; este agente NO los ejecuta)

```bash
REPO=/home/pablocristo/Proyectos/pablo/ponti/web
git -C "$REPO" checkout develop
git -C "$REPO" checkout -b pr/feature-024-openapi-and-docs-fe

# Docs de contenido + auditoría (texto)
git -C "$REPO" checkout 3ffcf60 -- ui/CLAUDE.md docs/RESPONSIVE_GUIDELINES.md PR-92.md
git -C "$REPO" checkout 3ffcf60 -- docs/audit/drawers/report.md docs/audit/drawers/inventory.md docs/audit/drawers/drawer-standard.md

# Binarios + txt (carpetas enteras)
git -C "$REPO" checkout 3ffcf60 -- docs/audit/drawers/after/ docs/audit/drawers/before/

# (OPCIONAL, solo si se decide tocar READMEs — interactivo, elegir SOLO hunk de copy OpenAPI)
# git -C "$REPO" restore -p --source=3ffcf60 -- README.md ui/README.md

# Verificación
git -C "$REPO" diff 3ffcf60 -- ui/CLAUDE.md docs/RESPONSIVE_GUIDELINES.md PR-92.md docs/audit/
git -C "$REPO" diff --check
git -C "$REPO" status
```

## Qué NO traer

- `README.md`, `ui/README.md`: el rename `@devpablocristo/core-*`→`platform-*`, `ponti-frontend`→`web` y retiro `xlsx` pertenece a feature-001 / 021. develop tip aún tiene los nombres viejos; traerlos con 024 adelanta un rename que romperá ownership y puede conflictuar cuando 001/021 lleguen.
- `ui/src/generated/ponti-ai.openapi.{json,ts}`, `ui/src/types/ai.ts`: referenciados en README pero NO en flist (son de 012).
- `ui/scripts/lint-responsive-antipatterns.sh`: referenciado por RESPONSIVE_GUIDELINES pero es de 020 (ci-workflows).

## Qué podría romperse

- Nada en runtime (docs + binarios).
- Posible conflicto/regresión SOLO si se traen los READMEs y luego mergean 001/021 (pisarían el rename). Mitigación: omitir READMEs.

## Cómo detectar extracción incompleta

- `git diff 3ffcf60 -- docs/audit/` NO vacío → faltó algún PNG/txt (lo más probable: olvidar `before/` o `after/`).
- Conteo esperado: `git ls-tree -r 3ffcf60 docs/audit/ | wc -l` debe coincidir tras el checkout (55 objetos).
- PNG corrupto/0 bytes → se copió a mano en vez de `git checkout`.
- Links rotos en `report.md` (apunta a `inventory.md`, `drawer-standard.md`, `before/`, `after/`) → faltan archivos referenciados.

## Qué validar antes del PR

- `git status` solo lista archivos de 024 (3 md contenido + 3 md auditoría + 45 png + 7 txt). Ningún `ui/src`/`api/src`/`*.json`/lockfile/`*.config.*`.
- `git diff --check` limpio.
- Render de markdown OK (tablas de `ui/CLAUDE.md`/`inventory.md` bien formadas; links relativos válidos).

## Qué hacer después de mergear

- Confirmar que 001/021 sean dueños del rename de READMEs.
- Si más adelante se anota el OpenAPI completo en BE, agregar al `RESPONSIVE_GUIDELINES`/`ui/CLAUDE.md` el flujo `yarn codegen:openapi` actualizado.
- Considerar mover `PR-92.md` a un `docs/history/` si ensucia la raíz.
