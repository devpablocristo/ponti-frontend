---
description: Recupera UNA feature FE de develop-problematico como spec definitivo en docs/specs/features/ (re-baselineado vs develop), sin escribir código de la app.
argument-hint: <id o slug de la feature, ej. 006  |  master-data-pages>
allowed-tools: Bash(git*), Bash(ls*), Bash(find*), Read, Grep, Glob, Write, Edit, Agent
---

Sos el ejecutor del proceso de **recuperación controlada** de `develop-problematico` en el **frontend**
(`web` = `ui/` + BFF `api/`), feature por feature, **a nivel SPEC** (NO se implementa código).
Recuperás la feature indicada en `$ARGUMENTS`.

## Objetivo de esta corrida

Tomar UNA feature documentada en `docs/features-develop-problematico/`, analizarla contra el estado
REAL de `develop`, y **destilar un único spec definitivo** en `docs/specs/features/<slug>.md`. Luego
**borrar** su carpeta del backlog para trackear que ya fue tratada. **No** escribís código de la app,
**no** creás ramas, **no** mergeás.

## Contexto fijo (verificado — NO re-derivar)

- Repo FE: `/home/pablocristo/Proyectos/pablo/ponti/web`. Destino: rama `develop`.
- Fuente del trabajo: `3ffcf60` (= `develop-problematico~1`, el "pico"; el tip `ac5dd2e` es un restore vacío).
  Rango fuente: `fefbe695..3ffcf60` (~582 archivos). Toda extracción/lectura parte de `3ffcf60`, nunca del tip.
- **DONE en `develop` (excluir, no re-portear):** #104 table-select-filters (`ui/src/lib/tableFilters.ts`),
  #105 reports dark-mode, #117 lot-metrics / `TentativePricesChip`, #121 tentative-prices. (Porteados vía PR #120.)
- **NO hay migraciones en FE.** Las dependencias relevantes son: el **contrato del backend** (`core`) que la
  feature consume, el **design-system** (feature-006, raíz del FE), el BFF (`api/src/routes/*`), pages y hooks.
- **Naming de specs (fijo):** archivo suelto, sin número, sin sufijo: `docs/specs/features/<slug>.md`.
  `<slug>` = nombre de la carpeta de la feature **sin** el prefijo `feature-<NNN>-` **ni** un `fe-` inicial
  (ej.: `feature-006-fe-design-system` → `design-system`; `feature-014-fe-master-data-pages` → `master-data-pages`;
  `feature-007-actor-system` → `actor-system`).
- Features en el backlog FE: 006, 007, 008, 010, 011, 012, 014, 015, 016, 017, 018, 020, 021, 022, 024, 026
  (FE puras + las caras FE de las full-stack). 015/016/017/026 ya pueden existir parcialmente en `develop` → verificar.

## Pasos

1. **Resolver la feature.** Interpretá `$ARGUMENTS` como id (`006`) o slug. Encontrá la carpeta exacta:
   `ls -d docs/features-develop-problematico/feature-*<arg>* 2>/dev/null`. Si hay 0 o >1 coincidencias,
   listá las opciones y pedí precisión (no adivines). Si la carpeta ya no existe pero el spec ya está en
   `docs/specs/features/`, avisá que la feature ya fue tratada y frená.

2. **Leer todo lo de esa feature** (spec.md, file-list.md, dependencies.md, risks.md, validation.md,
   extraction-plan.md, notes-for-future-agent.md, implementation-status.md) + los orquestadores
   (`index.md`, `global-summary.md`, `dependency-map.md`, `shared-files.md`, `cross-repo-map.md`).

3. **Re-baselinear contra `develop` REAL (solo lectura).** Verificá afirmación por afirmación con
   `git -C <repo> show develop:<path>`, `git -C <repo> grep <pat> develop -- <glob>`,
   `git -C <repo> ls-tree -r --name-only develop -- <dir>`, comparando con `3ffcf60`. Determiná:
   - **Estado en develop:** ¿la feature ya está (total/parcial)? ¿qué existe y qué falta? (ojo: 006 puede estar
     mayormente en paquetes npm `@devpablocristo/platform-ui-*`; 015/016/017/026 pueden existir parcialmente.)
   - **Diff REAL a aplicar** (no el que asume el spec viejo).
   - **Solape con DONE** (excluir lo ya porteado: #104/#105/#117/#121).
   - **Archivos:** whole-file vs partial-hunks; **mezclados** (ej. `ui/src/router.tsx`, `ui/src/main.tsx` son
     shell compartido entre varias features); qué excluir.
   - **Contrato BE (cross-repo):** ¿esta feature consume endpoints/DTOs del backend? ¿están ya en `develop` de
     `core`? Marcar **BE-first** si la cara FE depende de un contrato no mergeado aún.

4. **Escribir el spec definitivo** en `docs/specs/features/<slug>.md` con estas secciones:
   1. **Propósito** (1 frase).
   2. **Estado vs `develop`** — el diff real re-baselineado: qué ya está, qué falta.
   3. **Alcance / archivos** — whole-file vs partial-hunks, compartidos (router/main), qué excluir.
   4. **Dependencias** — design-system (006), contrato BE (BE-first si aplica), otras features FE; qué desbloquea.
   5. **Plan de implementación** — pasos concretos, sin ejecutar.
   6. **Validación** — `tsc`/`vite build`, `eslint`, `vitest` (unit), `playwright` (e2e).
   7. **Riesgos y decisiones pendientes.**
   Cada afirmación de hecho debe ser verificable (incluí el comando/evidencia clave cuando aporte).

5. **Tracking — borrar del backlog.** Una vez escrito el spec, `git rm -r
   docs/features-develop-problematico/feature-<NNN>-<...>/` (la carpeta de ESA feature). NO toques las
   carpetas de otras features ni los docs orquestadores.

6. **Reportar:** ruta del spec creado, resumen del diff real (qué falta vs qué ya está), lo excluido (DONE),
   dependencia BE-first si aplica, riesgos/decisiones, y confirmación del `git rm`. NO se implementó código.

## Reglas duras

- **Solo lectura** sobre el código de la app; las únicas escrituras permitidas son: crear
  `docs/specs/features/<slug>.md` y borrar la carpeta tratada de `docs/features-develop-problematico/`.
- **No** crear ramas, **no** mergear, **no** modificar `ui/src/**`, `api/src/**`, `package.json`, lockfiles, etc.
- Re-baselinear SIEMPRE contra `develop` actual; marcar como STALE lo que el spec viejo asuma de más.
- Si algo es ambiguo (slug, alcance, qué excluir, contrato BE), preguntar antes de escribir.
