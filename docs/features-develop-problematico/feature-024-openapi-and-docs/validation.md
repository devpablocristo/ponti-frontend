# validation.md — feature-024 · openapi-and-docs (FE)

Feature de documentación: la validación es de integridad de archivos y render markdown, NO de comportamiento. SOURCE = `3ffcf60`, destino `develop` (8c25e88).

## Checklist pre-PR

- [ ] Rama creada desde develop: `pr/feature-024-openapi-and-docs-fe`.
- [ ] `git diff 3ffcf60 -- ui/CLAUDE.md docs/RESPONSIVE_GUIDELINES.md PR-92.md docs/audit/` → **vacío** (los archivos traídos son idénticos al SOURCE).
- [ ] Conteo de objetos en `docs/audit/`: `git ls-tree -r 3ffcf60 docs/audit/ | wc -l` (esperado 55) coincide con lo traído.
- [ ] `git status` lista SOLO: 3 md contenido + 3 md auditoría + 45 png + 7 txt. **Ningún** `ui/src`, `api/src`, `package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`, `*.config.*`.
- [ ] `README.md` / `ui/README.md` NO modificados (recomendado). Si se modificaron, confirmar que SOLO se aceptó el hunk de copy OpenAPI/Axis-Companion y NO el rename `core→platform`/`xlsx`.
- [ ] `git diff --check` → limpio (sin whitespace errors).
- [ ] PNG no corruptos: `file docs/audit/drawers/after/*.png | grep -v PNG` → vacío.

## Checklist manual (revisión de render)

- [ ] `ui/CLAUDE.md`: tablas de "modelo de listas" y "catálogos" renderizan bien (markdown tables).
- [ ] `docs/RESPONSIVE_GUIDELINES.md`: bloques de código y tabla de breakpoints OK; links relativos (`../ui/tailwind.config.js`, `../ui/src/...`) apuntan a paths plausibles.
- [ ] `docs/audit/drawers/report.md`: links a `inventory.md`, `drawer-standard.md`, `before/`, `after/` resuelven (los archivos existen tras el checkout).
- [ ] `PR-92.md`: render del changelog; entender que es histórico, no estado actual.

## Tests sugeridos

- **FE**: no aplica suite para docs. Opcional, NO requerido por 024:
  - `yarn --cwd web/ui build` → smoke de que nada se rompió (no debería, no se tocó `ui/src`).
  - `yarn --cwd web/ui test` → la suite existente debe seguir verde (024 no toca código).
  - Markdown lint si el repo lo tiene (`markdownlint docs/**/*.md`).
- **BE**: N/A en este repo. El consumo `yarn codegen:openapi` (si existiera) es del lado del contrato BE; no se valida aquí.
- **e2e/Playwright**: los `*.failure.txt` son evidencia de una corrida pasada; NO re-ejecutar como parte de 024.

## Casos borde

- **Binarios grandes**: ~3.6 MB de PNG. Verificar que el push no exceda límites del repo/CI y que no se trackeen accidentalmente fuera de `docs/audit/`.
- **Artefactos de falla**: `before/*.failed.png` + `*.failure.txt` son intencionales (escenarios que antes no abrían). No confundir con un fallo de la extracción.
- **Links a código futuro**: `RESPONSIVE_GUIDELINES` cita `ui/scripts/lint-responsive-antipatterns.sh` (020) — puede no existir aún en develop; es aceptable.

## Qué revisar en UI / API / DB / env

- **UI**: nada cambia (sin `ui/src`). Confirmar que no se introdujo ningún componente/hook.
- **API (BFF)**: nada cambia (sin `api/src`).
- **DB**: ninguna migración.
- **env**: ninguna variable nueva.

## Qué validar en el otro repo (BE)

- Que BE-024 (si va en paralelo) NO traiga también el rename de README que pisa 001 del lado BE — mismo acuerdo de ownership.
- Que el `docs/openapi/swagger.yaml` BE esté etiquetado como piloto (2 endpoints) para no inducir codegen FE con expectativa de cobertura total.

## Señales de incompletitud / incompatibilidad

- `git diff 3ffcf60 -- docs/audit/` no vacío → faltan binarios.
- PNG de 0 bytes o `file` no reporta PNG → copia manual corrupta.
- `git status` muestra `README.md`/`ui/README.md` con el hunk de rename → se trajo ownership ajeno (revertir).
- Links rotos en `report.md` → faltan `inventory.md`/`drawer-standard.md`/carpetas.
- Aparece `ui/src/generated/ponti-ai.openapi.*` o `ui/src/types/ai.ts` → se coló código de 012 (no es de 024).
