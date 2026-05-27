# Ponti Web UI

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

## Tipos OpenAPI de Axis Companion

Archivos relevantes:

- `src/generated/axis-companion.openapi.yaml`
- `src/generated/axis-companion.openapi.ts`
- `src/types/ai.ts`

Regeneración:

```bash
node ./scripts/generate-ai-types.mjs
```

El script intenta primero descargar el OpenAPI configurado por
`AXIS_COMPANION_OPENAPI_URL`, `COMPANION_OPENAPI_URL` o `COMPANION_BASE_URL`.
Si Axis no está arriba, usa `../axis/companion/openapi.yaml`.

## Build local

```bash
yarn install
yarn build
```

Notas operativas:

- `@material-tailwind/react` quedó actualizado a la línea beta que declara soporte para React `>=18`, alineado con React 19.
- El chunk `vendor-export` sigue siendo pesado porque agrupa dependencias de exportación (`xlsx`, `jspdf`, `html2canvas`, etc.), pero ya no ensucia el build con warning porque quedó particionado y con `chunkSizeWarningLimit` explícito.
