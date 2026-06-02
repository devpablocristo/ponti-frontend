# extraction-plan.md — feature-012 (FE)

## Datos base
- **Repo:** `ponti/web` (monorepo `ui/` + `api/`, yarn).
- **Rama base (destino):** `develop` (tip `8c25e88`).
- **SOURCE de extracción:** `develop-problematico~1` (SHA `3ffcf60`). **NUNCA** usar `develop-problematico` (su tip es un restore vacío).
- **Rango fuente-de-verdad (diff):** `fefbe695..3ffcf60`.
- **Rama sugerida:** `pr/feature-012-ai-companion-integration-fe`.

## PR
- **Title:** `feat(bff): propagar X-Tenant-Id al backend para integración Axis Companion (feature-012 FE)`
- **Description (sugerida):**
  > Parte FE de la integración del asistente con Axis Companion (FULL-STACK, BE-first).
  > - BFF (`api/`): nuevo guard `requireTenant()` y propagación del header `X-Tenant-Id` en `POST /chat`, `POST /chat/stream`, `GET /chat/conversations`, `GET /chat/conversations/:id`.
  > - Proxy SSE: `ManagerChatStreamParams.tenantId` + header `X-Tenant-Id` al upstream.
  > - Tipos (`ui/`): se eliminan contratos muertos `PontiChatResponse`/`PontiChatBlock`/`PontiChatTextBlock`; `PontiWorkspaceContext` pasa a privado.
  >
  > Depende de feature-008 (`requestContext.getTenantId()` + seeding de `tenantId` en `api/src/index.ts`). Requiere que el PR BE feature-012 (internal/axis + companion adapter) esté mergeado primero.

## Archivos: enteros vs parciales
- **Enteros (whole-file):** los 3 del flist
  - `api/src/routes/ai.ts`
  - `api/src/lib/managerChatStreamProxy.ts`
  - `ui/src/types/aiChat.ts`
- **Parciales:** ninguno propio.
- **De dependencia (NO en este PR salvo que falten):** `api/src/requestContext.ts`, `api/src/index.ts`, `api/src/routes/authMiddleware.ts` (todos de feature-008).

## Migraciones / tests a incluir
- Migraciones: ninguna (FE).
- Tests: ninguno en el flist FE. Validación = typecheck + build + prueba manual del chat (ver `validation.md`). Los tests reales son del repo BE.

## Dependencias previas (orden)
1. **Repo BE feature-012** mergeado (BE-first): `internal/axis/*`, `internal/ai/companion_adapter.go`, `wire/companion_providers.go`, etc.
2. **FE feature-008** (identity-tenant-context) incluida/mergeada antes o en el mismo tren: aporta `requestContext.getTenantId()` y el middleware que seedea `tenantId`. **Sin esto `ai.ts` no compila.**
3. Recién entonces este PR.

## Coordinación cross-repo
- **Orden:** BE-first. El BE debe estar listo para recibir y usar `X-Tenant-Id` y hablar con Companion. El FE solo agrega el header; si llega antes que el BE, el header es ignorado (benigno) pero el chat no usará Companion.
- Confirmar con el paquete BE feature-012 que los nombres de headers coinciden: `X-API-KEY`, `X-User-Id`, `X-Tenant-Id`, `X-Project-Id`.

## Comandos git SUGERIDOS (para un humano; este agente NO los ejecuta)
```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web

# 1) Partir desde develop
git checkout develop
git checkout -b pr/feature-012-ai-companion-integration-fe

# 2) Traer los 3 archivos enteros desde SOURCE (dp~1 = 3ffcf60)
git checkout develop-problematico~1 -- \
  api/src/routes/ai.ts \
  api/src/lib/managerChatStreamProxy.ts \
  ui/src/types/aiChat.ts

# 3) PRE-REQUISITO feature-008 (si aún no está en develop) — NO es de esta feature,
#    traer SOLO si compila falla por getTenantId. Idealmente lo aporta el PR de 008.
#    git checkout develop-problematico~1 -- api/src/requestContext.ts api/src/index.ts api/src/routes/authMiddleware.ts

# 4) Revisar que no quedó basura de conflicto / whitespace
git diff --check
git diff --staged

# 5) Verificar contra SOURCE que la extracción quedó idéntica
git diff develop-problematico~1 -- \
  api/src/routes/ai.ts \
  api/src/lib/managerChatStreamProxy.ts \
  ui/src/types/aiChat.ts   # debe salir vacío
```

## Qué NO traer
- `ui/src/api/aiClient.ts` (feature-006).
- `ui/src/pages/admin/ai-assistant/AIAssistant.tsx` (feature-014).
- `api/src/routes/index.ts` (feature-014; el `import ai` ya existe en base).
- Los archivos de `requestContext`/`index.ts`/`authMiddleware.ts` salvo que el typecheck obligue (entonces marcarlos como pre-req de 008, no como propios).

## Qué podría romperse
- **TS compile error** en `api/` si `requestContext.getTenantId()` no existe (feature-008 ausente).
- Si se porta 006/014 (que usan `aiChat.ts`) sin este PR, podrían quedar referencias al tipo viejo `PontiChatResponse` → error TS en `ui/`.

## Cómo detectar extracción incompleta
- `git diff develop-problematico~1 -- <los 3 paths>` debe ser **vacío**.
- `grep -rn "PontiChatResponse\|PontiChatBlock\|PontiChatTextBlock" ui/src` debe dar **0** resultados.
- `grep -n "X-Tenant-Id\|requireTenant\|tenantId" api/src/routes/ai.ts api/src/lib/managerChatStreamProxy.ts` debe mostrar las nuevas líneas.

## Qué validar antes del PR
- `cd api && yarn build` (o `yarn tsc --noEmit`) sin errores.
- `cd ui && yarn build` (o `yarn tsc --noEmit`) sin errores.
- Smoke manual: request de chat sin tenant → 400 `Tenant obligatorio`; con tenant → header `X-Tenant-Id` presente en el upstream.

## Qué hacer después de mergear
- Avisar al equipo BE que el FE ya manda `X-Tenant-Id` (verificar que Companion lo usa para resolver credenciales/tenant).
- Coordinar el merge de feature-006/014 para que `aiClient.ts`/`AIAssistant.tsx` queden alineados con el `aiChat.ts` ya recortado.
