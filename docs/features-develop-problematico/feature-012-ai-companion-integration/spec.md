# spec.md — feature-012 · AI / Companion (axis) integration (FE)

## Identidad
- **id:** feature-012
- **slug:** ai-companion-integration
- **nombre:** AI / Companion (axis) integration
- **tipo:** feature
- **repo (este paquete):** Frontend monorepo `ponti/web` (`ui/` React + `api/` BFF NodeJS, yarn)
- **existe-en-FE:** Sí (este paquete — superficie chica: BFF + tipos)
- **existe-en-BE:** Sí (paquete BE feature-012 — superficie grande: `internal/axis/*`, `internal/ai/*`, `wire/companion_providers.go`)
- **merge:** BE-first (cross-repo)

## Resumen
La feature integra el asistente conversacional Ponti con **Axis Companion** como proveedor de IA del backend. En el monorepo FE el cambio es **mínimo y de plomería**: el BFF (`api/`) propaga el identificador de tenant (`X-Tenant-Id`) hacia el backend en todas las rutas de chat, y los tipos del front (`ui/`) se limpian de contratos muertos (la respuesta síncrona `PontiChatResponse` ya no se modela en FE porque el backend ahora adapta/streamea Companion). La inteligencia real (cliente Companion, JWT, adapter, providers) vive en el repo BE.

## Objetivo
- Que el BFF envíe **tenant** además de user y project al backend, para que el backend pueda resolver credenciales/ruteo de Companion por tenant.
- Alinear los comentarios y tipos del FE con la nueva arquitectura: `BFF -> ponti-backend -> Axis Companion` (antes era `BFF -> ponti-backend -> ponti-ai`).
- Eliminar tipos TS que ya no se consumen (`PontiChatResponse`, `PontiChatBlock`, `PontiChatTextBlock`) y reducir visibilidad de `PontiWorkspaceContext` a interna.

## Problema
El asistente antes apuntaba a un servicio interno `ponti-ai` con un contrato de respuesta síncrona (`PontiChatResponse`). Al migrar a Axis Companion (multi-tenant, JWT, posible respuesta síncrona sintetizada como SSE), el backend necesita el **tenant** del request para autenticar/rutear, y el FE arrastraba tipos de un contrato que ya no se usa.

## Alcance en este repo (FE)
Solo 3 archivos modificados (ver `file-list.md`):
1. `api/src/routes/ai.ts` — agrega helper `requireTenant()`, lo aplica en `POST /chat`, `POST /chat/stream`, `GET /chat/conversations`, `GET /chat/conversations/:conversation_id`; pasa `tenantId` a `buildHeaders()` y al proxy de stream; quita import muerto `axios` (deja `isAxiosError`); actualiza comentario de arquitectura.
2. `api/src/lib/managerChatStreamProxy.ts` — agrega `tenantId` al type `ManagerChatStreamParams` y emite el header `X-Tenant-Id` al upstream.
3. `ui/src/types/aiChat.ts` — borra `PontiChatResponse`/`PontiChatBlock`/`PontiChatTextBlock`, hace `PontiWorkspaceContext` privado (`type` en vez de `export type`), actualiza comentarios.

## Alcance en el otro repo (BE) — referencia, NO se porta acá
Paquete BE feature-012 (ver `/tmp/flists/be-012.txt`):
- **Nuevo** `internal/axis/`: `client.go`, `http.go`, `jwt.go`, `errors.go`, `types.go`, `nexus_client.go`, `nexus_types.go` (+ tests) — cliente HTTP a Companion con autenticación JWT.
- `internal/ai/`: **borra** `client.go` (viejo ponti-ai), **agrega** `companion_adapter.go` (+ test), modifica `handler.go` y `usecases/usecases.go` (+ tests nuevos).
- `wire/companion_providers.go` — DI de los providers Companion.
- El backend es quien **consume** los headers `X-Tenant-Id` / `X-User-Id` / `X-Project-Id` / `X-API-KEY` que envía este FE.

## Fuera de alcance (FE)
- UI del asistente (`ui/src/pages/admin/ai-assistant/AIAssistant.tsx`) — está en el rango pero pertenece a **feature-014** (fe-master-data-pages).
- Cliente front del chat (`ui/src/api/aiClient.ts`) — en el rango pero pertenece a **feature-006** (fe-design-system).
- Seeding del `tenantId` en el store de request (`api/src/index.ts` middleware) y `getTenantId()` en `api/src/requestContext.ts` y `setUserId` en `authMiddleware.ts` — pertenecen a **feature-008** (identity-tenant-context). Esta feature **depende** de ese código pero no lo porta.
- Registro de la ruta `ai` (`api/src/routes/index.ts`) — pertenece a feature-014; la línea `import ai from "./ai"` ya existe en base, no requiere cambio.

## Comportamiento esperado
- Toda request del asistente que llega al BFF y no tenga tenant resoluble responde **400 `{"message":"Tenant obligatorio"}`** antes de llamar al backend.
- Cuando hay tenant, el BFF agrega el header `X-Tenant-Id` al request hacia `configService.baseManagerApi` (en chat síncrono, en conversaciones GET y en el proxy SSE de `/chat/stream`).
- El front sigue tipando `PontiChatRequest`, `PontiConversationSummary/Detail`, `PontiChatStreamSseEvent`; ya no expone tipos de respuesta síncrona.

## Estado en dp~1 (SHA 3ffcf60)
- **Completo y consistente** en los 3 archivos del FE. El código compila contra el `requestContext.getTenantId()` que provee feature-008 (presente en 3ffcf60).
- No hay tests FE específicos de estos archivos en el flist.

## Criterios de aceptación
- [ ] Los 3 archivos quedan idénticos a 3ffcf60.
- [ ] `api/src/requestContext.ts` (de feature-008) expone `getTenantId()` antes/junto a este merge; si no, `ai.ts` no compila.
- [ ] El BFF responde 400 sin tenant y propaga `X-Tenant-Id` con tenant.
- [ ] `yarn` typecheck/build del workspace `api/` y `ui/` pasa (no quedan referencias a `PontiChatResponse`).
- [ ] Backend (repo BE) feature-012 mergeado **antes** (BE-first) para que el header tenga consumidor real.

## Endpoints / rutas afectadas (BFF, prefijo del router `ai`)
| Método | Ruta (router ai) | Cambio |
|---|---|---|
| POST | `/chat` | + `requireTenant` + `X-Tenant-Id` |
| POST | `/chat/stream` | + `requireTenant` + `tenantId` al proxy SSE |
| GET | `/chat/conversations` | + `requireTenant` + `X-Tenant-Id` |
| GET | `/chat/conversations/:conversation_id` | + `requireTenant` + `X-Tenant-Id` |

Upstream BE consumido: `POST /ai/chat`, `POST /ai/chat/stream`, `GET /ai/chat/conversations`, `GET /ai/chat/conversations/{id}`.

## Modelos / tipos afectados (`ui/src/types/aiChat.ts`)
- **Eliminados:** `PontiChatTextBlock`, `PontiChatBlock`, `PontiChatResponse`.
- **Cambio de visibilidad:** `PontiWorkspaceContext` pasa de `export type` a `type` (privado al módulo).
- **Conservados:** `PontiRouteHint`, `PontiChatRequest`, `PontiConversationSummary`, `PontiConversationMessage`, `PontiConversationDetail`, `PontiChatStreamSseEvent`.

## UI afectada
- Ninguna directa en este paquete. La página `AIAssistant.tsx` y `aiClient.ts` cambian pero son de otras features (014/006).

## DB / migraciones
- Ninguna en FE.

## Tests afectados
- Ninguno en el flist FE. Los tests viven en el BE (companion_adapter_test.go, handler_test.go, axis/*_test.go, usecases_test.go).

## Dependencias
- **Intra-repo (fuerte):** feature-008 (identity-tenant-context) — `requestContext.getTenantId()`, seeding de `tenantId` en `api/src/index.ts`. Sin esto `ai.ts` no compila.
- **Intra-repo (débil):** feature-005 (be-config-modularization) — declarada como `DEPENDE DE` a nivel de plan general; en FE el efecto se ve vía `configService` (apiKey/baseManagerApi) que ya existe en base.
- **Cross-repo (fuerte):** repo BE feature-012 — provee el consumidor del header `X-Tenant-Id` y la integración Companion. BE-first.

## Riesgos
- **Funcional:** si el backend BE feature-012 no está mergeado, el FE manda `X-Tenant-Id` a un backend que aún espera `ponti-ai`; el header extra es benigno pero la integración Companion no existe → el chat puede fallar/no rutear.
- **Técnico:** `ai.ts` referencia `requestContext.getTenantId()`. Si feature-008 no se porta primero, **error de compilación TS**.
- **Extracción parcial:** los consumidores de `aiClient.ts`/`AIAssistant.tsx` están en el mismo rango pero son de otras features; no traerlos no rompe estos 3 archivos (no hay re-export roto: nadie importaba los tipos eliminados).

## DECISIÓN recomendada
**Extraer tal cual** (whole-file los 3 archivos), pero con guardia de orden:
1. Mergear primero el repo **BE** feature-012.
2. Asegurar que **feature-008** (FE) esté mergeada/incluida antes o junto con esta (provee `getTenantId()`); si no, incluir el hunk de `requestContext.ts` como pre-requisito documentado (no como propio).
3. No tocar `aiClient.ts`/`AIAssistant.tsx`/`index.ts`/`routes/index.ts` (de otras features).
