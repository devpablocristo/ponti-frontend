# file-list.md — feature-012 (FE)

Fuente de verdad del flist: `/tmp/flists/fe-012.txt` (3 paths, todos `M`).
Rango diff: `fefbe695..3ffcf60`. SOURCE de extracción: `develop-problematico~1` (SHA `3ffcf60`).

Leyenda extracción: `whole-file` = traer el archivo completo desde SOURCE; `partial-hunks` = solo algunos hunks (archivo compartido); `manual-port` = aplicar a mano; `do-not-extract-yet` = no traer aún.

## Propios (de esta feature)
| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `api/src/routes/ai.ts` | M | BFF route (Express router) | Agrega `requireTenant()` y propaga `X-Tenant-Id` en chat/stream/conversations; quita import muerto `axios`; actualiza comentario de arquitectura | whole-file | Todo el diff del archivo es de esta feature; ningún hunk pertenece a otra intención | medio (compila solo si feature-008 aportó `getTenantId()`) | alta |
| `api/src/lib/managerChatStreamProxy.ts` | M | BFF lib (proxy SSE) | Agrega `tenantId` a `ManagerChatStreamParams` y emite header `X-Tenant-Id` al upstream | whole-file | Diff acotado (2 hunks) y 100% de esta feature | bajo | alta |
| `ui/src/types/aiChat.ts` | M | Tipos TS (contratos chat) | Borra `PontiChatResponse`/`PontiChatBlock`/`PontiChatTextBlock`; vuelve privado `PontiWorkspaceContext`; actualiza comentarios | whole-file | Limpieza de contratos muertos; ningún consumidor externo de los tipos borrados | bajo | alta |

## Compartidos (partial) — en este paquete NO hay
Ninguno de los 3 archivos del flist es de los “hot files” compartidos (no son `router.tsx`, `main.tsx`, `routes/index.ts`, `index.ts`, `package.json`, `yarn.lock`). Los 3 se extraen enteros sin riesgo de pisar otra feature.

## Requeridos por dependencia (NO en este flist — referencia)
| path | status (en rango) | dueño | rol respecto a 012 | acción |
|---|---|---|---|---|
| `api/src/requestContext.ts` | M (+14) | feature-008 | Provee `getTenantId()` que usa `ai.ts`; también seedea `tenantId`/`userId` en el store | NO extraer acá; debe venir con feature-008 antes/junto |
| `api/src/index.ts` | M (línea ~50) | feature-008 | Middleware que lee `x-tenant-id` y lo mete en `requestContext.run(...)` | NO extraer acá; feature-008 |
| `api/src/routes/authMiddleware.ts` | M (línea ~127) | feature-008 | `requestContext.setUserId(...)` | NO extraer acá; feature-008 |
| `api/src/routes/index.ts` | M | feature-014 | `import ai from "./ai"` (registro de la ruta; ya existe en base, no cambia por 012) | NO extraer acá |

## Dudosos
| path | duda | resolución |
|---|---|---|
| (ninguno) | El flist FE-012 es chico y limpio; no hay archivos ambiguos | — |

## NO traer todavía (en el rango pero de otras features)
| path | status (en rango) | dueño | por qué aparece cerca de 012 |
|---|---|---|---|
| `ui/src/api/aiClient.ts` | M (+90 líneas aprox.) | feature-006 (fe-design-system) | Consume tipos de `aiChat.ts` pero su rediseño no es de 012 |
| `ui/src/pages/admin/ai-assistant/AIAssistant.tsx` | M (+73 líneas aprox.) | feature-014 (fe-master-data-pages) | UI del asistente; cambios de 014, no de 012 |

## Notas de verificación
- Confirmado que **nadie** importa `PontiChatResponse`/`PontiChatBlock`/`PontiChatTextBlock` fuera de `aiChat.ts` (grep en `ui/src/**` @3ffcf60). Borrarlos es seguro.
- `PontiWorkspaceContext` solo se usa dentro de `aiChat.ts` (`PontiChatRequest.workspace`); volverlo `type` privado no rompe imports.
- `aiClient.ts` (006) y `AIAssistant.tsx` (014) consumen `aiChat.ts`: al portar 012 antes que ellos, esos archivos verán el shape nuevo. Si se portan 006/014 sin 012, podrían referenciar tipos viejos → coordinar.
