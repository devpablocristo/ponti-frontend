# risks.md — feature-012 (FE)

## Funcionales
- **R-F1 — Chat siempre 400 si falta el seeding de tenant.** `requireTenant()` lee `requestContext.getTenantId()`, que solo tiene valor si el middleware de feature-008 (`api/src/index.ts`) leyó `x-tenant-id` del request entrante. Si feature-008 no está en `develop` o el cliente no manda `x-tenant-id`, todas las rutas de chat responden `400 Tenant obligatorio`.
  - **Mitigación:** mergear feature-008 antes/junto; confirmar que el front (o el ingress) propaga `x-tenant-id` hacia el BFF.

- **R-F2 — Header tenant sin consumidor.** Si el FE se mergea antes que el BE feature-012, el upstream recibe `X-Tenant-Id` pero el backend viejo (ponti-ai) lo ignora; la integración Companion no existe.
  - **Mitigación:** BE-first estricto. No mergear FE hasta confirmar BE feature-012 en su `develop`.

## Técnicos
- **R-T1 — Error de compilación TS por `getTenantId()` ausente.** `ai.ts` no compila si `requestContext.ts` (feature-008) no expone el método.
  - **Mitigación:** validar `yarn tsc --noEmit` en `api/`. Si falla, traer el hunk de `requestContext.ts` como pre-requisito (marcado de feature-008, no de 012).

- **R-T2 — Referencias colgantes a tipos eliminados.** Se borraron `PontiChatResponse`/`PontiChatBlock`/`PontiChatTextBlock`. Verificado @3ffcf60 que nadie los importa, pero si alguien porta una versión vieja de `aiClient.ts`/`AIAssistant.tsx` que aún los use → error TS en `ui/`.
  - **Mitigación:** `grep -rn "PontiChatResponse\|PontiChatBlock\|PontiChatTextBlock" ui/src` debe dar 0. Coordinar orden con feature-006/014.

## Integración / cross-repo
- **R-I1 — Desalineación de nombres de header.** Si el BE espera `X-Tenant` u otro casing/nombre, el tenant no llega.
  - **Mitigación:** contrastar contra el paquete BE feature-012: headers exactos `X-API-KEY`, `X-User-Id`, `X-Tenant-Id`, `X-Project-Id`.

- **R-I2 — Stream SSE.** El comentario nuevo indica que el backend “puede sintetizar SSE sobre una respuesta síncrona de Companion”. Si Companion responde síncrono y el BE no sintetiza SSE correctamente, `/chat/stream` puede colgarse o cerrar sin eventos. Es riesgo del BE, pero el proxy FE (`managerChatStreamProxy.ts`) solo reenvía streams.
  - **Mitigación:** prueba manual de `/chat/stream` end-to-end tras mergear el BE.

## Datos / migración
- Sin datos ni migraciones en FE. **Sin riesgo.**

## Archivos compartidos
- **R-S1 — `aiChat.ts` consumido por features 006/014.** Cambio de superficie de tipos. Riesgo de pisar o desincronizar si se porta fuera de orden.
  - **Mitigación:** portar 012 antes o junto; typecheck conjunto del workspace `ui/`.
- Los 3 archivos del flist NO son “hot files” de merge (no router/index/lockfiles), así que el riesgo de conflicto de merge es bajo.

## Extracción parcial
- **R-X1 — Traer 006/014 sin sus tipos correctos.** No es riesgo de 012 propiamente, pero si el extractor de 006/014 no toma este `aiChat.ts`, esos PRs romperán. Documentado en `dependencies.md`.
- **R-X2 — Olvidar el pre-req 008.** El más probable. Detectable por fallo de compilación.

## Riesgo de mergear solo este repo / solo el otro
- **Solo FE (sin BE):** chat envía tenant a un backend que no usa Companion → degradación funcional, no crash de build. Aceptable temporalmente pero la feature no funciona.
- **Solo BE (sin FE):** el backend espera `X-Tenant-Id` pero el BFF no lo manda → el BE no puede resolver tenant para Companion → 400/401 desde el BE o fallo de ruteo. **Peor escenario** si el BE valida tenant obligatorio.
  - **Mitigación:** aunque es BE-first, el gap entre ambos merges debe ser corto; idealmente coordinar que el BE acepte ausencia de tenant de forma graceful durante la ventana de transición.
