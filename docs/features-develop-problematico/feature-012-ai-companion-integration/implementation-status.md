# implementation-status.md — feature-012 (FE)

## Estado general (FE)
- **Estado:** completa (en su alcance FE) en SOURCE `3ffcf60`.
- **% completitud (FE):** ~100% del alcance de plomería. Es una feature FULL-STACK donde el FE es la porción menor (3 archivos, plumbing del header tenant + limpieza de tipos).
- **Confianza:** alta (diff acotado, leído entero, consumidores verificados).

## Estado en este repo (FE)
| archivo | estado | nota |
|---|---|---|
| `api/src/routes/ai.ts` | completo | `requireTenant()` + `X-Tenant-Id` en las 4 rutas; import muerto `axios` removido |
| `api/src/lib/managerChatStreamProxy.ts` | completo | `tenantId` en params + header al upstream |
| `ui/src/types/aiChat.ts` | completo | tipos muertos eliminados; `PontiWorkspaceContext` privado |

## Estado en el otro repo (BE) — referencia
- Superficie grande y nueva: `internal/axis/` (client/http/jwt/errors/types/nexus_client/nexus_types + tests), `internal/ai/companion_adapter.go` (+ test), `handler.go`/`usecases.go` modificados (+ tests nuevos), `wire/companion_providers.go`, **borra** `internal/ai/client.go`.
- Estado real del BE: **no verificado en este paquete** (es otro repo). Asumir “parcial/desconocido hasta validar” y tratar como pre-requisito BE-first.

## Tests
- **FE:** ninguno en el flist. Sin cobertura automática de estos 3 archivos. Validación = typecheck/build + prueba manual.
- **BE:** sí (varios `_test.go` en el flist BE). La lógica testeable vive allá.

## Pendientes / gaps
- (FE) No hay test que cubra el 400 `Tenant obligatorio` ni la presencia del header `X-Tenant-Id`. Mejora futura: test de integración del router `ai`.

## Bugs / observaciones
- Ninguno funcional detectado en el diff FE.
- Observación: `ai.ts` queda fuertemente acoplado a que feature-008 haya seedeado `tenantId`; si 008 no entra, el chat se rompe con 400 en runtime (no es bug de 012, es dependencia faltante).

## Clasificación de pendientes
### BLOQUEANTE para mergear
- feature-008 (FE) presente en `develop` (provee `getTenantId()` + seeding). Sin esto NO compila / chat siempre 400.
- repo BE feature-012 mergeado primero (BE-first) para que `X-Tenant-Id` tenga consumidor real.

### Mejora futura
- Test de integración del router `ai` (guards user/project/tenant + headers).
- Tipar `apiClient.post<any>` / `get<any>` con los tipos de `aiChat.ts` (hoy usan `any`).

### Deuda aceptable
- Falta de tests FE: la lógica es plumbing simple y está cubierta conceptualmente del lado BE.

### Duda humana
- ¿feature-005 (config) aporta algo concreto al FE de 012 o es solo dependencia conceptual del BE? En el diff FE no aparece hunk de 005; confirmar con el dueño de 005.
- Estado real del repo BE feature-012 (no auditable desde acá).
