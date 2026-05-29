# Ponti Frontend UI

Aplicación React + TypeScript + Vite para la consola de Ponti.

## Tooling

- Node fijado en `20.19.0` vía `.nvmrc`.
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

Notas operativas:

- `@material-tailwind/react` quedó actualizado a la línea beta que declara soporte para React `>=18`, alineado con React 19.
- El chunk `vendor-export` sigue siendo pesado porque agrupa dependencias de exportación (`xlsx`, `jspdf`, `html2canvas`, etc.), pero ya no ensucia el build con warning porque quedó particionado y con `chunkSizeWarningLimit` explícito.
