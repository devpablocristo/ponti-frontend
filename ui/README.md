# Ponti Frontend UI

Aplicación React + TypeScript + Vite para la consola de Ponti.

## Tooling

- Node fijado en `20.19.0` vía `.nvmrc`.
- Package manager: Yarn 1 (`yarn.lock` versionado).
- El flujo habitual en contenedores usa `web/docker-compose.yml`.

## Módulos compartidos

La UI consume paquetes publicados desde `platform`:

- `@devpablocristo/platform-authn`
- `@devpablocristo/platform-browser`
- `@devpablocristo/platform-http`
- `@devpablocristo/platform-ui-data-display`

No usa ya una copia local de `src/modules/ai-console`.

## Tipos OpenAPI del asistente

Archivos relevantes:

- `src/generated/ponti-ai.openapi.json`
- `src/generated/ponti-ai.openapi.ts`
- `src/types/ai.ts`

El nombre de archivo conserva `ponti-ai` por compatibilidad con el contrato del
BFF. El backend Go ya adapta esas rutas hacia Axis Companion.

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

- El chunk `vendor-export` agrupa dependencias de exportación/importación (`read-excel-file`, `jspdf`, `html2canvas`, etc.) para aislar peso fuera del chunk principal.
- Las importaciones aceptan `.xlsx` y `.csv`. Se retiró soporte `.xls` binario legacy junto con `xlsx` para evitar dependencias sin parche de seguridad.
