# validation.md — feature-012 (FE)

## Checklist pre-PR (extracción correcta)
- [ ] `git diff develop-problematico~1 -- api/src/routes/ai.ts api/src/lib/managerChatStreamProxy.ts ui/src/types/aiChat.ts` → **vacío** (extracción idéntica a SOURCE).
- [ ] `git diff --check` → sin marcadores de conflicto ni whitespace roto.
- [ ] `grep -rn "PontiChatResponse\|PontiChatBlock\|PontiChatTextBlock" ui/src` → **0 resultados**.
- [ ] `grep -n "requireTenant\|X-Tenant-Id\|tenantId" api/src/routes/ai.ts` → muestra el guard y el header.
- [ ] `grep -n "tenantId\|X-Tenant-Id" api/src/lib/managerChatStreamProxy.ts` → muestra el campo del type y el header.
- [ ] `grep -n "getTenantId" api/src/requestContext.ts` → existe (aportado por feature-008). Si NO existe, el PR no compila.

## Build / typecheck
- [ ] BFF: `cd api && yarn install && yarn build` (o `yarn tsc --noEmit`) sin errores.
- [ ] UI: `cd ui && yarn install && yarn build` (o `yarn tsc --noEmit`) sin errores.
- [ ] Lint del workspace si está configurado: `yarn lint` (verificar que no se rompió por el import `axios` removido).

## Tests sugeridos
- **FE (no hay en flist; sugeridos como mejora):**
  - Test de integración del router `ai`:
    - `POST /chat` sin user → 401 `Usuario no autenticado`.
    - `POST /chat` sin project (header `x-project-id` ausente) → 400 `Proyecto obligatorio`.
    - `POST /chat` sin tenant (store sin `tenantId`) → 400 `Tenant obligatorio`.
    - `POST /chat` con user+project+tenant → upstream recibe headers `X-API-KEY`, `X-User-Id`, `X-Tenant-Id`, `X-Project-Id`.
  - Test del proxy SSE: `proxyManagerChatStreamPost` con `tenantId` → header `X-Tenant-Id` presente en `opts.headers`.
- **BE (en el otro repo):** `go test ./internal/axis/... ./internal/ai/...` (companion_adapter_test, handler_test, usecases_test, axis/client_test).

## Prueba manual (smoke)
1. Levantar BFF + backend (con BE feature-012). Autenticarse.
2. **Sin tenant:** invocar el chat sin `x-tenant-id` (o con store vacío) → esperar `400 {"message":"Tenant obligatorio"}` y que el BFF NO llame al backend.
3. **Con tenant:** enviar `x-tenant-id` → ver en logs/upstream que el backend recibe `X-Tenant-Id`. La respuesta del asistente debe venir de Companion.
4. **Stream:** `POST /chat/stream` → verificar que llegan eventos SSE (`event`/`data`) y que al cerrar el navegador el upstream se destruye (no quedan sockets colgados).
5. **Conversaciones:** `GET /chat/conversations` y `GET /chat/conversations/:id` con tenant → 200 con datos del backend.

## Casos borde
- `x-tenant-id` presente pero vacío/whitespace → el middleware de 008 lo guarda como string vacío; `getTenantId()` devolvería `""` (falsy) → 400. Confirmar comportamiento esperado con feature-008.
- Múltiples valores del header (array) → `index.ts` solo lo toma si es `string`; array → `undefined` → 400.
- `/chat/stream` con backend lento (LLM tarda minutos): el proxy desactiva timeout de socket (`setTimeout(0)`); verificar que no hay cortes por timeouts intermedios de infra (nginx/ingress).

## Qué revisar en UI / API / DB / env
- **UI:** que `AIAssistant.tsx` (feature-014) compile con el `aiChat.ts` recortado; que no use tipos eliminados.
- **API/BFF:** `configService.apiKey` y `configService.baseManagerApi` definidos en el entorno (vienen de la config existente / feature-005 conceptual). `BFF_VERBOSE_ERRORS` opcional para `devDetails`.
- **DB:** N/A.
- **env:** asegurar que el ingress/cliente propaga `x-tenant-id` al BFF.

## Qué validar en el otro repo (BE feature-012)
- Que el handler `internal/ai/handler.go` lee `X-Tenant-Id` y lo pasa al `companion_adapter`.
- Que `internal/axis/jwt.go` usa el tenant para emitir/seleccionar credenciales.
- `go test ./internal/axis/... ./internal/ai/...` verde.
- Que el contrato de SSE de `/ai/chat/stream` coincide con lo que el proxy FE reenvía.

## Señales de incompletitud / incompatibilidad
- Compila el FE pero el chat siempre da 400 → falta seeding de tenant (feature-008) o el cliente no manda `x-tenant-id`.
- El BE responde 4xx por tenant faltante → orden de merge incorrecto (FE sin BE o viceversa).
- Error TS `Cannot find name 'PontiChatResponse'` en `ui/` → un consumidor viejo (006/014) se portó sin alinear con este `aiChat.ts`.
- Error TS `Property 'getTenantId' does not exist` en `api/` → feature-008 no incluida.
