# Ponti Frontend UI

Aplicación React + TypeScript + Vite para la consola de Ponti.

## Tooling

- Node fijado en `20.17.0` vía `.nvmrc`.
- Package manager: Yarn 1 (`yarn.lock` versionado).
- El flujo habitual en contenedores usa `ponti-frontend/docker-compose.yml`.

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

Warnings conocidos hoy:

- `@material-tailwind/react@2.1.10` declara peer deps para React 18, mientras la app corre con React 19. El build actual funciona, pero conviene migrar o reemplazar esa librería en un paso aparte.
- El chunk `vendor-export` sigue siendo pesado porque agrupa dependencias de exportación (`xlsx`, `jspdf`, `html2canvas`, etc.). El warning de Vite quedó mitigado con partición de vendors y un `chunkSizeWarningLimit` explícito.
