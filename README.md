# Ponti Frontend

Incluye dos piezas:

- `ui/`: aplicación React + Vite
- `api/`: BFF Express que valida JWT y proxyea requests al backend/AI

## Tooling

- `ui/` fija Node `20.19.0` vía `.nvmrc`.
- `ui/` usa Yarn 1 con `yarn.lock` versionado.
- `docker-compose.yml` usa imágenes `node:20.19.0` para UI y BFF, alineadas con el tooling local.

## UI

Dependencias compartidas relevantes:

- `@devpablocristo/platform-authn`
- `@devpablocristo/platform-browser`
- `@devpablocristo/platform-http`
- `@devpablocristo/platform-ui-data-display`

La UI mantiene el shape legacy `ponti-ai.*` para compatibilidad del BFF, aunque el backend Go ya traduce esas llamadas hacia Axis Companion:

- schema legacy: `ui/src/generated/ponti-ai.openapi.json`
- tipos generados: `ui/src/generated/ponti-ai.openapi.ts`
- alias tipados para la app: `ui/src/types/ai.ts`

Regenerar tipos:

```bash
cd ui
node ./scripts/generate-ai-types.mjs
```

## BFF local

```bash
cd api
$env:NODE_ENV = "local"; nodemon --ext ts --exec ts-node src/index.ts
```

## Deploys

- Versionado, trazabilidad y rollback: `doc/VERSIONADO_DEPLOYS.md`.
