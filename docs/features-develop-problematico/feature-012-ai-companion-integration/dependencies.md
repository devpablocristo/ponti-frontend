# dependencies.md — feature-012 (FE)

## Resumen de grafo
- **Depende de (fuerte, intra-repo):** feature-008 (identity-tenant-context).
- **Depende de (declarada, plan global):** feature-005 (be-config-modularization) — efecto FE indirecto vía `configService`.
- **Depende de (fuerte, cross-repo):** repo BE feature-012 (Axis Companion).
- **Bloquea (débil):** feature-006 y feature-014 en lo que toca a `aiChat.ts` (deben ver el shape recortado).

## Depende-de

### Fuerte — intra-repo: feature-008 (identity-tenant-context)
- **Archivo/API compartido:** `api/src/requestContext.ts`.
  - `ai.ts` llama `requestContext.getTenantId()` (método agregado por 008).
  - El middleware en `api/src/index.ts` (008) hace `requestContext.run({ authorization, tenantId: req.headers["x-tenant-id"], ... })`. Sin ese seeding, `getTenantId()` siempre devuelve `undefined` y **todas** las rutas de chat responden 400.
- **Naturaleza:** compilación (TS) + runtime. Es la dependencia más dura.
- **Acción:** feature-008 debe estar en `develop` antes/junto con este PR. Si no lo está, incluir el hunk de `requestContext.ts` como pre-requisito explícito (no como cambio propio de 012).

### Declarada (plan) — feature-005 (be-config-modularization)
- En el header de la tarea figura `DEPENDE DE: 005`. En el repo FE el efecto es indirecto: `ai.ts`/`managerChatStreamProxy.ts` usan `configService.apiKey` y `configService.baseManagerApi`, que ya existen en base. No hay hunk de 005 en mi flist.
- **Naturaleza:** débil en FE; fuerte conceptualmente del lado BE.

### Fuerte — cross-repo: repo BE feature-012
- **Contrato/API compartido:** headers HTTP del upstream BE
  - `X-API-KEY` (de `configService.apiKey`)
  - `X-User-Id` (de `req.user.userID`)
  - `X-Tenant-Id` (NUEVO — de `requestContext.getTenantId()`)
  - `X-Project-Id` (de header `x-project-id`)
- El BE feature-012 consume `X-Tenant-Id` para autenticar/rutear contra Axis Companion (cliente JWT en `internal/axis/jwt.go`, adapter en `internal/ai/companion_adapter.go`).
- **Orden:** BE-first.

## Bloquea-a

### Débil — feature-006 (fe-design-system) y feature-014 (fe-master-data-pages)
- Ambas modifican consumidores de `ui/src/types/aiChat.ts`:
  - `ui/src/api/aiClient.ts` (006)
  - `ui/src/pages/admin/ai-assistant/AIAssistant.tsx` (014)
- Como 012 **elimina** `PontiChatResponse`/`PontiChatBlock`/`PontiChatTextBlock`, si 006/014 se portaran asumiendo el shape viejo habría error TS. Verificado @3ffcf60 que en el estado final esos consumidores ya NO usan los tipos borrados, así que el orden correcto (012 antes o junto a 006/014) los deja consistentes.
- **Naturaleza:** débil; coordinación de orden, no bloqueo duro.

## Archivos / tipos / config / APIs compartidos
| recurso | compartido con | naturaleza |
|---|---|---|
| `api/src/requestContext.ts` (`getTenantId`) | feature-008 | compilación+runtime, fuerte |
| `api/src/index.ts` (middleware seeding `tenantId`) | feature-008 | runtime, fuerte |
| header `X-Tenant-Id` (contrato HTTP) | repo BE feature-012 | integración, fuerte |
| `ui/src/types/aiChat.ts` (tipos exportados) | feature-006, feature-014 | compilación, débil |
| `configService.apiKey` / `baseManagerApi` | feature-005 (concept.) | config, débil en FE |

## Migraciones compartidas
- Ninguna en FE.

## Recomendación de orden
1. **Repo BE feature-012** (Axis Companion + adapter + providers).
2. **FE feature-008** (requestContext + middleware tenant).
3. **FE feature-012** (este PR).
4. Luego/junto: FE feature-006 y feature-014 (consumidores de `aiChat.ts`), validando typecheck conjunto.
