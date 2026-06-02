# risks.md — feature-021 Build & deploy config (FE)

## Funcionales
- **Cambio de puerto BFF `3000→3001` (`docker-compose.yml`).** Riesgo medio: docs, `.env`, scripts o el otro repo pueden asumir 3000. *Mitigación:* confirmar con el equipo; si no hay confirmación, dejar `3000:3000`. Buscar referencias: `grep -rn '3000' docker-compose.yml api/ ui/.env*`.
- **`yarn lint` ahora encadena `lint:notify-leaks` y `lint:responsive`.** Si se cablean en `lint` y el código actual tiene `z-[N]` o `JSON.stringify(error)`, CI rompe. *Mitigación:* correr los scripts a mano contra `develop` antes de cablearlos; cablear solo tras 006.

## Técnicos
- **Reglas ESLint ui warn→error.** `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `prefer-const`, etc. pasan a `error`. Si el código de develop tiene violaciones, `yarn lint` falla. *Mitigación:* `cd ui && yarn lint` antes del PR; arreglar o degradar puntualmente.
- **Borrar `package-lock.json` + bloquearlo.** Bajo riesgo, pero si alguien corre `npm install` por costumbre, regenera el lock bloqueado → confusión. *Mitigación:* el `.gitignore` lo cubre; comunicar yarn-only.
- **`ui/yarn.lock` regenerado (+980/-334).** Refleja el swap platform. Copiarlo literal sin la migración deja deps inexistentes. *Mitigación:* NO copiar; regenerar con `yarn install` tras fijar `package.json` (Ola B).
- **Cambios masivos de line-ending (CRLF↔LF)** en `.gitignore`, `docker-compose.yml`, `ui/eslint.config.js`, `ui/tailwind.config.js`: el diff toca casi todas las líneas. *Mitigación:* extraer con `git restore -p` tomando solo hunks reales; `git diff --check`; considerar `.gitattributes`/`git add --renormalize`.

## Integración
- **`api/eslint.config.js` flat-config** asume `@typescript-eslint/parser` y `eslint-plugin` instalados en `api/`. Verificar que estén en `api/package.json` (no listado en el flist como modificado → confirmar). *Mitigación:* `cd api && npx eslint --print-config src/index.ts`.

## Cross-repo
- **Codegen depende de `core/docs/openapi/swagger.yaml` (024 BE).** Si el FE trae `generated/*` sin el BE, el codegen no es reproducible y los tipos pueden divergir del runtime. *Mitigación:* regenerar tras 024; no extraer literal.
- **Mergear solo FE 021:** seguro para Ola A (config aislada). Mergear Ola B sin platform-migration rompe `yarn install`.
- **Mergear solo BE 021:** seguro; el BE compose/Dockerfile no depende del FE. Cuidar de no re-introducir bumps go-jose/x/net (#124).

## Datos / migración
- Ninguno. 021 no toca DB ni migraciones.

## Archivos compartidos
- `ui/package.json`, `ui/tailwind.config.js`, `ui/vite.config.ts`, `docker-compose.yml`, `.gitignore`: editados por varias features. *Mitigación:* `git restore -p` por hunk; documentar en cada PR qué hunk pertenece a qué feature; rebasar antes de mergear para evitar conflictos.

## Extracción parcial
- **Riesgo de traer `mtConfig` removal sin quitar la dep de material-tailwind** (o viceversa) → build roto. *Mitigación:* el removal de `mtConfig` en tailwind y la dep en package.json deben viajar JUNTOS (ambos en Ola B / platform-migration).
- **Traer los scripts `.sh` sin marcarlos ejecutables** o sin `bash` en PATH del runner. *Mitigación:* los scripts usan `bash scripts/...` en package.json (no dependen del bit +x), pero verificar permisos al `git checkout`.
- **Detectar incompletitud:** `grep -rn '@material-tailwind\|"xlsx"\|flowbite\|@heroicons' ui/` debe dar 0 tras Ola B; `find . -name package-lock.json -not -path '*/node_modules/*'` debe dar 0.

## Resumen de riesgo por escenario de merge
| escenario | riesgo |
|-----------|--------|
| FE 021 Ola A sola sobre develop | bajo |
| FE 021 Ola B sin platform-migration | **alto** (install roto) |
| BE 021 solo | bajo (cuidar #124) |
| FE+BE 021 coordinados, sin 024 | medio (codegen no reproducible) |
