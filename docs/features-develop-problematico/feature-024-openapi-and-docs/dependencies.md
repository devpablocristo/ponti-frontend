# dependencies.md — feature-024 · openapi-and-docs (FE)

## Resumen

024-FE es **documentación pura** (3 md de contenido + 3 md de auditoría + 45 png + 7 txt) más 2 READMEs modificados. No tiene dependencias FUERTES de código. Puede mergear independiente. Las únicas relaciones reales son: (a) referencias DÉBILES de los docs a código de otras features, y (b) un overlap de OWNERSHIP en los 2 READMEs con 001/021.

## Depende de

| feature | tipo | fuerza | por qué | bloquea merge? |
|---|---|---|---|---|
| ninguna | — | — | 024-FE es doc; los archivos nuevos no importan ni ejecutan nada | NO |
| 001 be-platform-tenancy-refactor | ownership (READMEs) | débil/incierta | El hunk de `README.md`/`ui/README.md` renombra `@devpablocristo/core-*`→`platform-*`. Ese rename es de 001 | NO si se OMITEN los READMEs |
| 021 build-and-deploy-config | ownership (ui/README) | débil | El hunk de `ui/README.md` retira `xlsx`→`read-excel-file` y `ponti-frontend`→`web` (build/deps) | NO si se omite el README |

## Bloquea a

| feature | por qué | fuerza |
|---|---|---|
| ninguna | Es documentación; nada importa estos `.md`/`.png` | — |

## Referencias DÉBILES (informativas, NO bloquean)

Los docs apuntan a código de otras features. Si ese código aún no está en develop, el doc simplemente describe algo futuro — no se rompe:

| doc | referencia a | feature dueña |
|---|---|---|
| `docs/RESPONSIVE_GUIDELINES.md` | `ui/src/components/layout/*`, `ResponsiveTable`, `BaseModal`, `DrawerShell`, `useBreakpoint`/`useIsMobile`, `tailwind.config.js` | 006 fe-design-system |
| `docs/RESPONSIVE_GUIDELINES.md` | `ui/scripts/lint-responsive-antipatterns.sh` (CI) | 020 ci-workflows |
| `ui/CLAUDE.md` | componentes CRUDAR (`EntityFormDrawer`, `ArchivedDrawer`, `BulkActionBar`), `useEntityCrud` | 006 / 014 fe-master-data-pages |
| `ui/CLAUDE.md` | `useActors`, actors pages, `entry_type.go`, `repository_movement.go` (BE) | 007 actor-system / cross-repo BE |
| `ui/CLAUDE.md` | `@/lib/notify`, `ThemeProvider`, dark-mode tokens | reports-dark-mode (DONE #105 parcial) |
| `ui/CLAUDE.md` | data-integrity, `useWorkspaceFilters` | 018 data-integrity-admin |
| `docs/audit/drawers/*` | `DrawerShell`, `AppButton`, `ToolbarActionButton`, pantallas `CreateItem/CreateOrder/...` | 006 / 014 |
| `PR-92.md` | TODO el big-bang (006,007,010,011,012,014,015,016,017,018,...) | múltiples |

## Cross-repo (FE ↔ BE, mismo feature-024)

| aspecto | dirección | fuerza | nota |
|---|---|---|---|
| contrato OpenAPI | BE produce → FE consume | débil | BE publica `docs/openapi/swagger.yaml` (piloto 2 endpoints). El consumo `yarn codegen:openapi` vive en `ui/` pero **NO está en este flist FE** → sin bloqueo real en 024-FE |
| rename READMEs | ambos repos lo tienen | débil/incierta | El hunk de README aparece en BE y FE; decidir ownership una vez (001/021) |
| no comparten archivos físicos | — | — | FE y BE 024 son disjuntos a nivel de paths |

## Archivos / tipos / config / migraciones / APIs compartidos

- **Archivos compartidos del repo (router.tsx, main.tsx, routes/index.ts, package.json, lockfiles)**: NINGUNO aparece en el flist de 024-FE. Cero superficie de conflicto por archivos compartidos del repo.
- **Compartidos por ownership**: `README.md`, `ui/README.md` (con 001/021).
- **Tipos/config/migraciones/APIs**: ninguno (no se crean ni modifican).

## Recomendación de orden

1. 024-FE puede mergear **en cualquier momento**, independiente (omitiendo los 2 READMEs).
2. Si se quiere consistencia de READMEs, mergear 001 (rename platform) y 021 (build) **antes**, y dejar que ellos sean dueños del rename. 024 nunca toca los READMEs.
3. Para la parte OpenAPI cross-repo: BE-024 antes del consumo `codegen` (pero ese consumo no está en este paquete FE).
