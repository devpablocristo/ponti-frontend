# Ponti Frontend

Incluye dos piezas:

- `ui/`: aplicacion React + Vite
- `api/`: BFF Express que valida JWT y proxyea requests al backend/AI

## UI

Dependencias compartidas relevantes:

- `@devpablocristo/core-authn`
- `@devpablocristo/core-browser`
- `@devpablocristo/core-http`
- `@devpablocristo/modules-ai-console`
- `@devpablocristo/modules-ui-data-display`
- `@devpablocristo/modules-ui-filters`
- `@devpablocristo/modules-ui-forms`

La UI consume contratos AI tipados desde OpenAPI generado:

- schema: `ui/src/generated/ponti-ai.openapi.json`
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
# Ponti Frontend

Incluye dos piezas:

- `ui/`: aplicación React + Vite
- `api/`: BFF Express que valida JWT y proxyea requests al backend/AI

## UI

Dependencias compartidas relevantes:

- `@devpablocristo/core-authn`
- `@devpablocristo/core-browser`
- `@devpablocristo/core-http`
- `@devpablocristo/modules-ai-console`
- `@devpablocristo/modules-ui-data-display`
- `@devpablocristo/modules-ui-filters`
- `@devpablocristo/modules-ui-forms`

La UI consume contratos AI tipados desde OpenAPI generado:

- schema: `ui/src/generated/ponti-ai.openapi.json`
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