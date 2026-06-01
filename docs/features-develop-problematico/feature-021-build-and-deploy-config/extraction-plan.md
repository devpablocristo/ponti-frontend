# extraction-plan.md — feature-021 Build & deploy config (FE)

- **repo:** `/home/pablocristo/Proyectos/pablo/ponti/web` (FE monorepo ui+api)
- **rama base:** `develop` (tip `8c25e88`)
- **SOURCE:** `develop-problematico~1` (SHA `3ffcf60`). **NUNCA** `develop-problematico` (su tip es restore/vacío).
- **rama sugerida:** `pr/feature-021-build-and-deploy-config-fe`

## PR title
`chore(fe): build & deploy config — yarn-only locks, ESLint flat-config, knip, lint guardrails`

## PR description (borrador)
> Porta la config de build/tooling del FE desde `develop-problematico~1`:
> - Bloquea `package-lock.json` (yarn es el manager oficial) y borra los locks de npm espurios (raíz + api).
> - ESLint v9 flat-config en `api/` (reemplaza `.eslintignore`); sube reglas de `ui/` de warn→error.
> - `knip.json` para dead-code; scripts guardrail `lint-notify-leaks.sh` y `lint-responsive-antipatterns.sh`.
> - docker-compose: polling de chokidar (fix ENOSPC en Linux) y simplificación del command de instalación de ui.
>
> **NO incluye** (van en otras PRs): swap de deps core→platform + `yarn.lock` regenerado (platform-migration), darkMode/screens/zIndex de tailwind y cableo de los scripts en `yarn lint` (feature-006), cliente OpenAPI generado (feature-024), header X-Tenant-Id en ApiClient (feature-008).

## Estrategia: dividir en 2 olas

### Ola A — config genuina, mergeable sola (recomendada AHORA)
Archivos enteros / hunks autocontenidos, sin dependencia de platform/006/024:
1. Borrar `package-lock.json` (raíz) y `api/package-lock.json`.
2. `api/eslint.config.js` (nuevo) + borrar `api/.eslintignore`.
3. `ui/knip.json` (nuevo).
4. `ui/scripts/lint-notify-leaks.sh` + `ui/scripts/lint-responsive-antipatterns.sh` (nuevos) — **sin** cablearlos todavía en el target `lint` si 006 no está.
5. `.gitignore`: hunk de bloqueo `**/package-lock.json` (el de playwright puede esperar a 026/006).
6. `docker-compose.yml`: hunks de `CHOKIDAR_USEPOLLING`/`CHOKIDAR_INTERVAL` (el cambio de `command` que enumera paquetes core depende de platform; el cambio de puerto requiere confirmación).

### Ola B — atada a platform-migration / 006 / 024 (DESPUÉS)
7. `ui/package.json` hunks de deps + `resolutions` → con platform-migration.
8. `ui/yarn.lock` → regenerar con `yarn install` tras Ola B.7 (NO copiar de SOURCE).
9. `ui/tailwind.config.js` hunks darkMode/screens/zIndex + quitar `mtConfig` → con 006.
10. `ui/vite.config.ts` manualChunks → con platform/006.
11. `ui/src/api/generated/*` → regenerar con `yarn codegen:openapi` tras 024 BE.
12. Cablear `lint:notify-leaks`/`lint:responsive`/`codegen:openapi` en `ui/package.json` scripts → cuando existan sus módulos.

## Archivos enteros vs parciales
- **Enteros:** `api/eslint.config.js`, `ui/knip.json`, los 2 `.sh`, y los deletes.
- **Parciales (`git restore -p`):** `.gitignore`, `docker-compose.yml`, `ui/package.json`, `ui/tailwind.config.js`, `ui/vite.config.ts`.
- **Regenerados (NO copiar):** `ui/yarn.lock`, `ui/src/api/generated/*`.

## Migraciones / tests a incluir
- Migraciones: ninguna.
- Tests: ninguno nuevo. Esta feature toca gates de CI (lint, knip, playwright ignores).

## Dependencias previas
- Ola A: ninguna. Mergeable sobre `develop` sin riesgo de runtime.
- Ola B: requiere platform-migration mergeada (deps `@devpablocristo/platform-*` resueltas), 006 (módulos notify/theme/useBreakpoint), 024 BE (swagger.yaml).

## Coordinación con el otro repo (BE)
- **Orden sugerido:** BE-first SOLO para el codegen (024 BE debe publicar `core/docs/openapi/swagger.yaml`). Para la config pura, FE y BE 021 son independientes y pueden ir en paralelo.
- El BE 021 debe excluir los bumps go-jose/x/net (#124).
- Confirmar puerto: si compose BE expone el backend Go en 8080, el FE BFF apunta a `host.docker.internal:8080`. El cambio de puerto del BFF (3001) es interno al FE.

## Comandos git SUGERIDOS (para un humano — NO ejecutar aquí)
```bash
# 0) partir desde develop
git checkout develop
git checkout -b pr/feature-021-build-and-deploy-config-fe

# 1) archivos/deletes enteros (Ola A)
git checkout develop-problematico~1 -- api/eslint.config.js ui/knip.json \
  ui/scripts/lint-notify-leaks.sh ui/scripts/lint-responsive-antipatterns.sh
git rm api/.eslintignore package-lock.json api/package-lock.json

# 2) hunks parciales selectivos (Ola A)
git restore -p --source=develop-problematico~1 -- .gitignore        # tomar SOLO bloqueo package-lock.json
git restore -p --source=develop-problematico~1 -- docker-compose.yml # tomar SOLO CHOKIDAR_*; confirmar puerto

# 3) verificar que no quedaron locks ni conflict markers
git diff --check
find . -name package-lock.json -not -path '*/node_modules/*'

# 4) (Ola B, otra PR) deps + lock — NO copiar yarn.lock; regenerar:
#   git restore -p --source=develop-problematico~1 -- ui/package.json   # hunks deps/resolutions
#   cd ui && yarn install   # regenera yarn.lock localmente
```

## Qué NO traer
- `api/src/clients/ApiClient.ts` (→ 008).
- `ui/yarn.lock` literal de SOURCE (regenerar).
- `ui/src/api/generated/*` (→ 024, regenerar).
- Hunks deps/resolutions de package.json y darkMode/screens/zIndex de tailwind en la PR de config pura.

## Qué podría romperse
- Si se cablean `lint:notify-leaks`/`lint:responsive` en el target `lint` sin que existan los módulos referenciados, `yarn lint` no rompe (los scripts solo hacen grep y exit 0 si no hay hits), pero el guardrail sería inútil hasta que llegue 006.
- Si se trae `package.json` deps platform sin la migración, `yarn install` falla (paquetes inexistentes en registry).
- Subir reglas eslint de ui a `error` puede romper `yarn lint` si el código actual de develop tiene `any`/unused — verificar.

## Cómo detectar extracción incompleta
- `grep -rn '@material-tailwind\|@heroicons\|flowbite\|"xlsx"' ui/` debe dar 0 tras Ola B.
- `find . -name package-lock.json -not -path '*/node_modules/*'` debe dar 0.
- `git grep -n 'mtConfig' ui/tailwind.config.js` debe dar 0 tras Ola B.

## Qué validar antes del PR
- `yarn install --frozen-lockfile` (ui) OK.
- `eslint .` en api/ y ui/ corren con flat-config sin crash de config.
- `docker compose config` parsea el compose editado.
- ver validation.md.

## Qué hacer después de mergear
- Coordinar Ola B con platform-migration / 006 / 024.
- Avisar al equipo del cambio de puerto BFF si se aplicó.
- Verificar que CI corre los nuevos scripts de lint.
