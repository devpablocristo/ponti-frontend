# notes-for-future-agent.md — feature-012 (FE)

## Resumen corto
Feature FULL-STACK (BE-first). En el repo FE es **chica**: 3 archivos que (1) propagan `X-Tenant-Id` desde el BFF al backend en todas las rutas del asistente y (2) limpian tipos TS muertos. La integración real con Axis Companion (cliente, JWT, adapter, providers) vive en el repo BE.

## Qué está en FE y qué en BE
- **FE (este paquete, flist `fe-012.txt`, 3 archivos `M`):**
  - `api/src/routes/ai.ts` — guard `requireTenant()` + `X-Tenant-Id` en `POST /chat`, `POST /chat/stream`, `GET /chat/conversations`, `GET /chat/conversations/:id`; quita import muerto `axios`.
  - `api/src/lib/managerChatStreamProxy.ts` — `tenantId` en `ManagerChatStreamParams` + header al upstream.
  - `ui/src/types/aiChat.ts` — borra `PontiChatResponse`/`PontiChatBlock`/`PontiChatTextBlock`; `PontiWorkspaceContext` → privado.
- **BE (flist `be-012.txt`):** `internal/axis/*` (client/http/jwt/errors/types/nexus_*), `internal/ai/companion_adapter.go`, `handler.go`/`usecases.go` modificados, `wire/companion_providers.go`, borra `internal/ai/client.go`. Tests incluidos.

## Archivos esenciales
- `api/src/routes/ai.ts` (corazón del cambio FE).
- `api/src/lib/managerChatStreamProxy.ts` (el header tenant también va por el camino SSE).

## Archivos peligrosos / mezclados (NO traer con 012)
- `ui/src/api/aiClient.ts` → **feature-006** (en el rango con +90 líneas; NO es de 012).
- `ui/src/pages/admin/ai-assistant/AIAssistant.tsx` → **feature-014** (en el rango con +73 líneas; NO es de 012).
- `api/src/requestContext.ts`, `api/src/index.ts`, `api/src/routes/authMiddleware.ts` → **feature-008** (proveen `getTenantId()` y el seeding del tenant). Dependencia dura, pero NO son propios de 012.
- `api/src/routes/index.ts` → **feature-014** (el `import ai from "./ai"` ya existe en base; no cambia por 012).

## Decisiones ya tomadas
- Extraer los 3 archivos **enteros** (whole-file): el diff de cada uno es 100% de esta feature, sin hunks ajenos.
- Borrar `PontiChatResponse` & cía. es **seguro**: verificado @3ffcf60 que ningún archivo en `ui/src/**` los importa.
- `PontiWorkspaceContext` solo se usa dentro de `aiChat.ts`; volverlo privado no rompe imports.

## Dudas abiertas
- Estado real del repo BE feature-012 (no auditado desde acá). BE-first: confirmar que está mergeado.
- ¿feature-005 (config) aporta algo concreto al FE? En el diff FE no hay hunk de 005; parece dependencia conceptual del BE. Confirmar.
- ¿`x-tenant-id` lo manda el navegador o lo inyecta un ingress/proxy? Afecta el caso "siempre 400".

## Comandos a mirar primero
```bash
cat /tmp/flists/fe-012.txt
cat /tmp/flists/be-012.txt   # cross-repo
git -C <web> diff fefbe695..3ffcf60 -- api/src/routes/ai.ts api/src/lib/managerChatStreamProxy.ts ui/src/types/aiChat.ts
git -C <web> show 3ffcf60:api/src/requestContext.ts   # ver getTenantId() (de feature-008)
git -C <web> show 3ffcf60:api/src/index.ts | sed -n '40,60p'  # seeding tenantId (feature-008)
grep -rn "PontiChatResponse\|PontiChatBlock" ui/src   # debe dar 0
```

## Errores a evitar
- Mergear FE sin el BE feature-012 (header sin consumidor) o, peor, BE sin FE (BE espera tenant que no llega).
- Portar 012 sin feature-008 → **no compila** (`getTenantId` inexistente) y/o chat siempre 400.
- Portar feature-006/014 con un `aiChat.ts` viejo → referencias rotas a tipos eliminados.
- Confundir `aiClient.ts`/`AIAssistant.tsx`/`index.ts` (otras features) como parte de 012.

## Camino más seguro
1. Confirmar repo **BE feature-012** mergeado (BE-first).
2. Confirmar **FE feature-008** en `develop` (provee `getTenantId()` + seeding tenant).
3. Rama `pr/feature-012-ai-companion-integration-fe` desde `develop`; `git checkout develop-problematico~1 -- <los 3 paths>`.
4. `git diff develop-problematico~1 -- <los 3 paths>` vacío; `yarn tsc --noEmit` en `api/` y `ui/` verde.
5. Smoke del chat: sin tenant → 400; con tenant → `X-Tenant-Id` al backend.

## PR del otro repo: orden
- **ANTES:** PR del repo **BE feature-012** (Axis Companion). BE-first.
- **JUNTO/DESPUÉS (mismo repo FE):** feature-008 antes; feature-006/014 después, alineadas con el `aiChat.ts` recortado.
