# notes-for-future-agent.md — feature-010 projects (FE / repo web)

## Resumen corto

Feature FULL-STACK. En ESTE repo (web) = 5 archivos nuevos del módulo
`ui/src/pages/admin/projects/` (editor operativo selection-only) + 1 hunk-set en el BFF
`api/src/routes/projects.ts` (cache bypass, archive/restore PUT->POST, forwardQuery, fix `/hard`).
El componente estrella `ProjectEditor.tsx` es enorme (2083 líneas) y NO compila solo: arrastra
medio feature-014 (master-data/customers) + 007 (actor) + 009 (archive).

## Qué está en FE y qué en BE

- **FE (aquí):** `ProjectEditor.tsx`, `projectEditorScope.ts` (+ tests), `SPEC.md`, y hunks de `projects.ts` (BFF).
- **BE (otro repo, mismo feature-010):** project-archive-entidades-bridge + scope/creator; expone
  los endpoints `/projects*`, `/customers/archived`, archive/restore (POST), `/projects/:id/hard`.

## Archivos esenciales

- `ui/src/pages/admin/projects/ProjectEditor.tsx` — editor; revisar imports (líneas 1-75) para
  ver TODAS las deps externas.
- `ui/src/pages/admin/projects/projectEditorScope.ts` — lógica pura de scope; el corazón del filtrado.
- `ui/src/pages/admin/projects/SPEC.md` — leelo entero, gobierna el comportamiento exigido.

## Archivos peligrosos / mezclados

- `api/src/routes/projects.ts` — COMPARTIDO. Existe en develop, conviven hunks de 010 con hunks
  de lot-metrics/tentative-prices YA PORTEADOS (#117/#121/#124). Usar `git restore -p` y
  RECHAZAR los hunks ya porteados.
- `api/src/utils/forwardQuery.ts` — TRAMPA: `projects.ts` lo importa pero NO está en el flist 010
  y NO existe en develop. Sin él, `api/` no compila. Decidir si lo trae 009/013 o este PR.

## Decisiones ya tomadas (en el SOURCE)

- `/admin/projects/new` es selection-only: nunca `POST /projects`, siempre `PUT /projects/:id`.
- Búsqueda fuzzy se aplica DESPUÉS del filtro de contexto (no revelar fuera de scope).
- archive/restore expuestos como POST por el BFF (el backend siempre recibió POST).
- `CustomerEditor` quedó como wrapper `mode="customerOnly"` sobre `ProjectEditor`.

## Dudas abiertas

- ¿`forwardQuery.ts` pertenece a 009 o 013? (verificar flists de ambos).
- ¿Mergear 010 FE y 014 FE en un mismo PR? Hay ACOPLAMIENTO MUTUO: 014 importa `ProjectEditor`
  desde `projects/`, y `ProjectEditor` importa de `master-data/customers/`. Por separado rompen build.
- ¿El `Project` type (con `actor_id`/`archived_at`) lo trae 007 o 009?

## Comandos a mirar primero

```bash
cat /tmp/flists/fe-010.txt
git -C /home/pablocristo/Proyectos/pablo/ponti/web diff fefbe695..3ffcf60 -- api/src/routes/projects.ts
git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:ui/src/pages/admin/projects/SPEC.md
git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:ui/src/pages/admin/projects/projectEditorScope.ts
# verificar deps faltantes en develop:
for f in ui/src/pages/admin/master-data/customers/types.ts ui/src/components/SmartEntityInput/SmartEntityInput.tsx api/src/utils/forwardQuery.ts; do git -C /home/pablocristo/Proyectos/pablo/ponti/web cat-file -e develop:$f 2>/dev/null && echo "$f OK" || echo "$f FALTA"; done
```

## Errores a evitar

- NO usar `develop-problematico` (tip = restore vacío). Usar `develop-problematico~1` (`3ffcf60`).
- NO extraer 010 FE solo: el build de `ui/` se rompe sin 014/007/009.
- NO traer `api/src/routes/projects.ts` entero ni con verbo "checkout" del archivo completo:
  pisarías hunks ya porteados. Solo partial-hunks.
- NO tocar `ui/src/router.tsx` ni `api/src/routes/index.ts` desde 010 (no están en su flist).
- NO olvidar `api/src/utils/forwardQuery.ts` (build de `api/` rompe).

## Camino más seguro

1. Asegurar BE feature-010 (+009) mergeado (BE-first).
2. En FE: train 007 -> 009 -> 014 (+ `forwardQuery` si va por 009) -> 010, idealmente 014+010 juntos.
3. Traer 5 archivos del módulo `projects/` whole-file + `forwardQuery.ts` whole-file (si falta) +
   `projects.ts` por partial-hunks.
4. `yarn --cwd ui tsc --noEmit && yarn --cwd ui test && yarn --cwd ui build && yarn --cwd api build`.

## Qué PR del otro repo va antes/después

- **Antes (BE-first):** PR del repo BE feature-010 (project-archive-entidades-bridge + scope/creator)
  y feature-009 BE (archive surface). Sin ellos, archive/restore/scope del FE no tienen respaldo.
- **Después:** PRs FE que consumen el editor (011 campaign-dto-projectid, 018 data-integrity-admin).
