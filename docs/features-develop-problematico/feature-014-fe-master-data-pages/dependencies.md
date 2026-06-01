# dependencies.md — feature-014 FE master-data pages

## Resumen
Solo-FE. **Depende fuertemente** de 006/007/008/009 (componentes, hooks y contexto que NO están en la flist de 014 pero que sus archivos importan). **Bloquea** la consolidación del dashboard (015), las superficies de acceso/notificaciones (016) y los forms dólar/commerce (017) en cuanto comparten la zona `/admin/master-data`. Sin cambios BE a portar; sí hay dependencia de runtime con contratos BE.

## Depende de (intra-repo FE)

### Fuertes (sin esto no compila/funciona)
| dep | qué aporta | evidencia (imports en archivos de 014, NO en flist) |
|---|---|---|
| **006-fe-design-system** | `components/crud/{ResponsiveTable,ArchivedDrawer,BulkSelectionPanel,makeSelectColumn}`, `components/filters/AppFilterBar`, `components/Modal/copy` (`EntityCopy`) | `ManagersList.tsx`, `SupplyMovements.tsx`, `GeneralEntities.tsx` |
| **007-actor-system** | `hooks/useActors` (`Actor`,`ActorRole`,`ActorPayloadInput`), `master-data/actors/ActorFormDrawer`, `actorCrudarRouting`, `ArchivedActorsByRole`, `@/copy` (`ENTITIES_BY_KEY`), hooks `useInvestors`/`useManagers`/`useCampaigns`; ruta BFF `/actors`,`/me` | `GeneralEntities.tsx` (imports `useActors`, `ActorFormDrawer`, `useInvestors`, `useManagers`, `useCampaigns`), `entities.ts` (`@/copy`) |
| **008-identity-tenant-context** | `hooks/useWorkspaceFilters`, `lib/workspaceQuery` (`withQuery`,`buildWorkspaceQuery`); en BFF `requestContext` (cache scoped por tenant+user), `configService.bffRequireTenant`, paths `/me` tenant-optional | `SupplyMovements.tsx` (`useWorkspaceFilters`, `buildWorkspaceQuery`), `useLabors/queries.ts` (`withQuery`), `api/src/routes/index.ts` (hunks de cache scoped) |
| **009-crudar-archive-surface** | patrón Archived/restore (drawer de archivados, crudar lifecycle en UI) | todas las `Archived*.tsx` |

### Débiles (mejor antes, pero degradable)
| dep | qué aporta | nota |
|---|---|---|
| **004-shared-text-propername (FE)** | `lib/properName` (`formatProperName`/`formatEntityDisplayName`) | usado por entities/filtros; si falta, romper display-names |
| **010-projects (FE)** | `hooks/useDatabase/projects` (`useProjects`, tipo `Project`) | usado por `GeneralEntities.tsx` y drawers básicos |

## Bloquea a (intra-repo FE)
| feature | por qué |
|---|---|
| **015-fe-dashboard-consolidation** | consolida vistas que apuntan a las nuevas pantallas master-data |
| **016-fe-access-notifications** | superficies de acceso sobre `/admin/*` reorganizado |
| **017-fe-dollar-commerce-forms** | `DollarForm`/`CommerceForm` se reubican a `master-data/*` aquí; 017 edita su lógica de forms |
| **018-data-integrity-admin** | `Integrity.tsx` se reubica aquí; 018 trae su lógica |

## Cross-repo

### Dependencia de extracción BE
**Ninguna.** feature-014 no tiene contraparte de código BE. En el cross-repo-map del BE: **"feature-014: sin cambios BE"**.

### Dependencia de runtime BE (incierta → verificar contra el BE desplegado)
| contrato | dónde lo consume el BFF | aporta (probable) |
|---|---|---|
| `GET /investors`, `/investors/archived` (+CRUD) | `api/src/routes/investors.ts` | 007 (actores por rol) en BE |
| `GET /managers`, `/managers/archived` (+CRUD) | `api/src/routes/managers.ts` | 007 en BE |
| `GET /customers?page&per_page&status` | `api/src/routes/customers.ts` | 003/009 (status archivado) en BE |
| query `customer_id`/`campaign_id`/`project_id`/`field_id` | `utils/queryParams.ts`, rutas fields/lots/crops/etc. | 010/011 (projectId/campaign) en BE |
| header `X-Tenant-Id` / `X-User-Id` requerido | `routes/index.ts` (bffRequireTenant) | 001/008 (tenancy) en BE |

## Archivos / tipos / config / migraciones / APIs compartidos
- **Compartido FE (partial-hunks):** `ui/src/router.tsx`, `ui/src/main.tsx` (no en flist 014; dueños 006/007/009/010), `ui/src/pages/admin/{types,utils,colors}.ts`.
- **Compartido BFF (partial-hunks):** `api/src/routes/index.ts` (014 + 007 + 008).
- **Tipos compartidos:** `EntityCopy` (006), `Actor`/`ActorRole` (007), `Project` (010).
- **Config:** ninguna nueva propia (la flist no incluye `package.json`/`yarn.lock`/env). `configService.bffRequireTenant` viene de 008.
- **Migraciones:** ninguna.

## Recomendación de orden
1. **BE runtime primero:** desplegar BE con `/investors`,`/managers`,`customers?status`,`campaign_id` (features BE 007/008/010).
2. **FE deps:** 006 → 007 → 008 → 009 (→ 004 FE, 010 FE) en `develop`.
3. **feature-014 por entidad:** hojas (crops/campaigns/supplies/stock/labors/supply-movements) → actor-linked (investors/managers/customers/fields) → lots/workorders (excluyendo DONE) → **entities al final**.
4. Después: 015/016/017/018 que dependen de la zona master-data.

## Notas de incertidumbre
- **Confianza alta:** las dependencias FE (006/007/008/009) están confirmadas por imports reales en archivos de la flist que apuntan a paths fuera de la flist.
- **Confianza media:** que el BE desplegado ya exponga `/investors`,`/managers`,`status`,`campaign_id`. Verificar con `git -C <core> log --oneline | grep -i "investor\|manager\|status"` o probando los endpoints.
- **Confianza media:** el alcance exacto de hunks DONE en lots/workorders (#104/#117) — revisar `git log` de esos archivos en develop.
