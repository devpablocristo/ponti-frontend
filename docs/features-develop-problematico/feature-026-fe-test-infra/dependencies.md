# dependencies.md — feature-026 · fe-test-infra

## Resumen

Esta feature es **consumidora**: testea/mockea código de producción de otras features. No bloquea funcionalidad de nadie, pero **depende fuerte** de varias features de producción FE. Sin cambios BE.

## Depende de (intra-repo FE)

| feature | fuerza | qué aporta que 026 necesita | evidencia en el diff |
|---|---|---|---|
| 006 fe-design-system | **fuerte** | base de componentes/estilos que renderizan los specs (`customer-editor-responsive`) | declarado "DEPENDE DE: 006" |
| 007 actor-system | **fuerte** | UI/stores de actores (roles cliente/responsable/inversor) | `actors-archive-crudar.spec.ts`, `customer-editor-smart-entity.spec.ts` usan `roles: ["cliente"...]` |
| 008 identity-tenant-context | **fuerte** | `GET /api/v1/me/context`, `tenant_id`, `configService`, `authMiddleware` | `auth.ts` (fetch /me/context + tenant_id); `configService.test.js`, `authMiddleware.test.js` |
| 010 projects | **fuerte** | `CustomerEditor` unificado (editor de project/customer/lot) | `lots.spec.ts` ahora espera heading "Editar Proyecto"; todos los `customer-editor-*` |
| 011 campaign-dto-projectid | **fuerte** | customer_id/campaign_id en queries, `buildForwardQuery` | `lotsRoute.test.js`, `workOrdersRoute.test.js` |
| 014 fe-master-data-pages | media | páginas admin (customers/fields/lots) que los specs navegan | rutas `/admin/lots`, `/admin/stock` |
| 018 data-integrity-admin | media | drawers admin / archive surface | `drawer-audit.spec.ts`, `project-responsibles-admin-drawer.spec.ts` |

## Depende de (cross-repo BE)

**Ninguna dura.** Los contratos mockeados (`/me/context`, lots/work-orders con customer/campaign) los implementa el BE en 008/010/011, pero 026 **no mergea BE** y los tests usan mocks/E2E contra el FE. → en `cross-repo-map` del BE: **"sin cambios BE"**.

## Bloquea a

Nada. Ninguna feature depende de la infra de tests para compilar/correr en prod. (Es deseable que el resto de FE tenga tests, pero no es bloqueante.)

## Clasificación de incertidumbre

- **Fuertes (seguras):** 008 y 011 → si faltan, `api/test` NO compila (`require("../dist/...")`). 010 → si falta, e2e fallan (heading "Editar Proyecto").
- **Débiles:** 014/018 → afectan algunos specs e2e, no la compilación.
- **Inciertas:** orden exacto entre 007 y 010 para `customer-editor-smart-entity` (usa ambos). Confianza media: revisar `git show 3ffcf60:ui/e2e/customer-editor-smart-entity.spec.ts`.

## Archivos / tipos / config / APIs compartidos

| recurso compartido | con quién | nota |
|---|---|---|
| `ui/e2e/helpers/auth.ts` | TODOS los specs e2e + 008 (multitenant) | export pasa de `workspace` (privado) a `e2eWorkspace` (público) + param `selectedWorkspace`; cambio de identidad 17/30 → 14/29 |
| `api/src/mocks/handlers.ts` | varios dominios; 008 (quita login/JWT) | reindent masivo; revisar por hunks |
| `api/test/lotsRoute.test.js`, `workOrdersRoute.test.js` | lot-metrics (DONE), 011 | contrato customer/campaign + cache keys |
| `api/dist/configService.js`, `dist/routes/authMiddleware.js`, `dist/utils/forwardQuery.js` | 008/005, 011 | **artefactos de build**: deben existir tras `npm run build` con el source de esas features |
| APIs `/me/context`, `/lots`, `/stock`, `/work-orders` | 008/010/011 | solo referenciadas, no definidas acá |

## Migraciones compartidas

Ninguna.

## Recomendación de orden

```
006 → 007 → 008 → 010 → 011 → 014 → 018 → 026
                                          ├─ 026a (cleanup .vite-smoke)  ← se puede mergear AISLADO, sin gate
                                          ├─ 026b (api unit)  ← requiere 008 + 011
                                          └─ 026c (e2e)       ← requiere 007 + 008 + 010 (+014/018)
```

- 026a se puede adelantar en cualquier momento (no depende de nada).
- No mergear 026b/026c antes que sus dependencias o la CI queda roja.
- Sin acción en el repo BE.
