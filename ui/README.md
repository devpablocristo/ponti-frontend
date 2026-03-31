# Ponti Frontend UI

Aplicacion React + TypeScript + Vite para la consola de Ponti.

## Modulos compartidos

La UI consume paquetes publicados desde `core` y `modules`:

- `@devpablocristo/core-authn`
- `@devpablocristo/core-browser`
- `@devpablocristo/core-http`
- `@devpablocristo/modules-ai-console`
- `@devpablocristo/modules-ui-data-display`
- `@devpablocristo/modules-ui-filters`
- `@devpablocristo/modules-ui-forms`

No usa ya una copia local de `src/modules/ai-console`.

## Tipos OpenAPI de Ponti AI

Archivos relevantes:

- `src/generated/ponti-ai.openapi.json`
- `src/generated/ponti-ai.openapi.ts`
- `src/types/ai.ts`

Regeneracion:

```bash
node ./scripts/generate-ai-types.mjs
```

El script intenta primero descargar `http://localhost:8090/openapi.json`. Si el
servicio no esta arriba, usa el export local desde `ponti-ai/scripts/export_openapi.py`.

## Build local

```bash
yarn install
yarn build
```

En Docker, el flujo habitual usa `ponti-frontend/docker-compose.yml`.
# Ponti Frontend UI

Aplicación React + TypeScript + Vite para la consola de Ponti.

## Módulos compartidos

La UI consume paquetes publicados desde `core` y `modules`:

- `@devpablocristo/core-authn`
- `@devpablocristo/core-browser`
- `@devpablocristo/core-http`
- `@devpablocristo/modules-ai-console`
- `@devpablocristo/modules-ui-data-display`
- `@devpablocristo/modules-ui-filters`
- `@devpablocristo/modules-ui-forms`

No usa ya una copia local de `src/modules/ai-console`.

## Tipos OpenAPI de Ponti AI

Archivos relevantes:

- `src/generated/ponti-ai.openapi.json`
- `src/generated/ponti-ai.openapi.ts`
- `src/types/ai.ts`

Regeneración:

```bash
node ./scripts/generate-ai-types.mjs
```

El script intenta primero descargar `http://localhost:8090/openapi.json`. Si el
servicio no está arriba, usa el export local desde `ponti-ai/scripts/export_openapi.py`.

## Build local

```bash
yarn install
yarn build
```

En Docker, el flujo habitual usa `ponti-frontend/docker-compose.yml`.
