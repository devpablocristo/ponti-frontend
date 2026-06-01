# notes-for-future-agent — feature-022 · lefthook-git-hooks (FE)

## Resumen corto
Feature trivial de tooling local: **un solo archivo**, `lefthook.yml`, en la raíz del monorepo FE. Configura git hooks (pre-commit: eslint + tsc; pre-push: vitest) scopeados a `ui/`. Add limpio, no existe en develop, sin impacto en runtime/CI/build/datos. **Decisión: extraer tal cual.**

## Qué está en FE y qué en BE
- **FE (este repo)**: `lefthook.yml` con comandos `cd ui && yarn eslint/tsc/vitest`.
- **BE (core)**: su propio `lefthook.yml` (feature-022 BE) con comandos Go. Archivo independiente, sin contrato compartido. Se mergean por separado, cualquier orden.

## Archivos esenciales / peligrosos / mezclados
- **Esencial**: `lefthook.yml` (único). Whole-file.
- **Peligrosos**: ninguno.
- **Mezclados (partial-hunks)**: ninguno. NO toca `package.json`, `ui/yarn.lock`, `ui/src/router.tsx`, `ui/src/main.tsx`, `api/src/routes/index.ts`, `api/src/index.ts`.

## Decisiones ya tomadas
- Portar entero, PR aislado, rama `pr/feature-022-lefthook-git-hooks-fe`.
- NO agregar `lefthook` como dependencia en este PR (se mantiene la instalación a nivel sistema que asume el header del YAML). Eso queda como mejora futura.

## Dudas abiertas (para humano)
- ¿Gestionar lefthook como devDependency + `prepare` script, o dejarlo manual? (afecta adopción).
- ¿`tsc -b` en cada commit es aceptable en tiempo?
- ¿Extender hooks a `api/` además de `ui/`?

## Comandos a mirar primero
```bash
cat /tmp/flists/fe-022.txt                                      # confirma: solo lefthook.yml
git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:lefthook.yml
git -C /home/pablocristo/Proyectos/pablo/ponti/web ls-tree 8c25e88 -- lefthook.yml   # vacío = no existe en develop
git -C /home/pablocristo/Proyectos/pablo/ponti/web grep -i lefthook 3ffcf60 -- package.json ui/package.json api/package.json  # vacío = no es dep
```

## Errores a evitar
- NO usar `develop-problematico` (tip restore/vacío). Usar SOURCE `develop-problematico~1` (3ffcf60).
- NO arrastrar cambios de `package.json`/`yarn.lock` al PR (no son parte de la feature).
- NO confundir con el `lefthook.yml` de `core` (otro repo, otro contenido).
- NO asumir que los hooks corren para todos: dependen de `lefthook install` por dev.

## Camino más seguro
`git checkout develop-problematico~1 -- lefthook.yml` → `git diff --check` → diff vacío contra `3ffcf60:lefthook.yml` → commit → PR. Sin restore parcial (no hay hunks mixtos).

## Orden de PR cross-repo
- Indistinto. FE-022 y BE-022 son independientes. Recomendado (no obligatorio) mergearlos en ventana cercana para anunciar el setup de hooks a los devs una sola vez. Ninguno bloquea al otro.
