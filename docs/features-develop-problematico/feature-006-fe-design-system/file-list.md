# file-list.md — feature-006 fe-design-system

Fuente: `/tmp/flists/fe-006.txt` (133 paths). Status: A=created, M=modified, D=deleted, R=renamed.
Diff de verdad: `fefbe695..3ffcf60` en repo `web`. SOURCE de extracción = `develop-problematico~1` (3ffcf60).

Leyenda extracción: **whole-file** = traer archivo completo desde SOURCE; **partial-hunks** = `git restore -p` solo los hunks de esta feature; **manual-port** = recrear/revisar a mano; **do-not-extract-yet** = pertenece a otra feature o requiere dependencia.

---

## 1) Propios (núcleo design-system — whole-file, riesgo bajo)

### feedback/
| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/components/feedback/Notification.tsx | A | componente | base de notify + banner inline | whole-file | base de toda la feature | bajo | alta |
| ui/src/components/feedback/EmptyState.tsx | A | componente | estado vacío | whole-file | primitivo | bajo | alta |
| ui/src/components/feedback/FieldError.tsx | A | componente | error de campo de form | whole-file | primitivo | bajo | alta |
| ui/src/components/feedback/InlineSpinner.tsx | A | componente | spinner inline | whole-file | primitivo | bajo | alta |
| ui/src/components/feedback/LoadingOverlay.tsx | A | componente | overlay de carga | whole-file | primitivo | bajo | alta |
| ui/src/components/feedback/Skeleton/Skeleton.tsx | A | componente | skeleton base | whole-file | primitivo | bajo | alta |
| ui/src/components/feedback/Skeleton/CardSkeleton.tsx | A | componente | skeleton card | whole-file | primitivo | bajo | alta |
| ui/src/components/feedback/Skeleton/FormSkeleton.tsx | A | componente | skeleton form | whole-file | primitivo | bajo | alta |
| ui/src/components/feedback/Skeleton/TableSkeleton.tsx | A | componente | skeleton table | whole-file | primitivo | bajo | alta |
| ui/src/components/feedback/Skeleton/index.ts | A | barrel | export skeletons | whole-file | primitivo | bajo | alta |

### Button / Drawer / Input / Modal / Card
| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/components/Button/AppButton.tsx | A | componente | botón base | whole-file | primitivo | bajo | alta |
| ui/src/components/Button/DrawerButton.tsx | A | componente | botón de drawer | whole-file | primitivo | bajo | alta |
| ui/src/components/Button/IconActionButton.tsx | A | componente | botón icono | whole-file | primitivo | bajo | alta |
| ui/src/components/Button/ToolbarActionButton.tsx | A | componente | botón toolbar | whole-file | primitivo | bajo | alta |
| ui/src/components/Button/Button.tsx | M | componente | botón legacy adaptado | whole-file | cambio acotado al primitivo | bajo | alta |
| ui/src/components/Drawer/DrawerShell.tsx | A | componente | shell base de drawers | whole-file | base CRUD | bajo | alta |
| ui/src/components/Drawer/DrawerFormActions.tsx | A | componente | footer de acciones | whole-file | primitivo | bajo | alta |
| ui/src/components/Drawer/Drawer.tsx | M | componente | drawer legacy adaptado | whole-file | acotado | bajo | media |
| ui/src/components/Drawer/SPEC.md | A | spec | contrato z-index drawer | whole-file | doc | bajo | alta |
| ui/src/components/Input/Checkbox.tsx | A | componente | input checkbox | whole-file | primitivo | bajo | alta |
| ui/src/components/Input/InputField.tsx | M | componente | input texto | whole-file | acotado | bajo | alta |
| ui/src/components/Input/Search.tsx | M | componente | input búsqueda | whole-file | acotado | bajo | alta |
| ui/src/components/Input/SelectField.tsx | M | componente | select | whole-file | acotado | bajo | alta |
| ui/src/components/Modal/BaseModal.tsx | M | componente | modal base | whole-file | acotado | bajo | media |
| ui/src/components/Modal/copy.ts | A | copy | textos de modales | whole-file | copy de confirmaciones | bajo | alta |
| ui/src/components/Card/IndicatorCard.tsx | M | componente | card indicador | whole-file | acotado | bajo | media |

### filters / layout
| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/components/filters/AppFilterBar.tsx | A | componente | barra de filtros | whole-file | primitivo (rige filters/SPEC) | bajo | alta |
| ui/src/components/filters/SPEC.md | A | spec | contrato z-index filtros | whole-file | doc | bajo | alta |
| ui/src/components/layout/Cluster.tsx | A | componente layout | whole-file | primitivo | bajo | alta |
| ui/src/components/layout/Container.tsx | A | componente layout | whole-file | primitivo | bajo | alta |
| ui/src/components/layout/FormSection.tsx | A | componente layout | whole-file | primitivo | bajo | alta |
| ui/src/components/layout/Grid.tsx | A | componente layout | whole-file | primitivo | bajo | alta |
| ui/src/components/layout/PageShell.tsx | A | componente layout | whole-file | primitivo | bajo | alta |
| ui/src/components/layout/Stack.tsx | A | componente layout | whole-file | primitivo | bajo | alta |
| ui/src/components/layout/index.ts | A | barrel | export layout | whole-file | primitivo | bajo | alta |

### copy/ (UX-writing centralizado)
| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/copy/actions.ts | A | copy | verbos de acción | whole-file | base copy | bajo | alta |
| ui/src/copy/entities.ts | A | copy | nombres de entidades | whole-file | base copy | bajo | alta |
| ui/src/copy/feedback.ts | A | copy | plantillas feedback | whole-file | base copy | bajo | alta |
| ui/src/copy/http.ts | A | copy | mapping HTTP→ES | whole-file | usado por client/fetchErrorAdapter | bajo | alta |
| ui/src/copy/notifications.ts | A | copy | duraciones por severidad | whole-file | usado por notify | bajo | alta |
| ui/src/copy/validation.ts | A | copy | mensajes validación | whole-file | base copy | bajo | alta |
| ui/src/copy/index.ts | A | barrel | export copy | whole-file | barrel | bajo | alta |
| ui/src/copy/README.md | A | doc | guía UX-writing | whole-file | doc | bajo | alta |

### lib/ (helpers)
| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/lib/notify.ts | A | helper | API de notificaciones | whole-file | núcleo | bajo | alta |
| ui/src/lib/notify.md | A | doc | contrato notify | whole-file | doc | bajo | alta |
| ui/src/lib/translateBackendError.ts | A | helper | traduce errores BE | whole-file | núcleo errores | bajo | alta |
| ui/src/lib/format/formatError.ts | A | helper | pipeline de error | whole-file | núcleo | bajo | alta |
| ui/src/lib/format/formatEmpty.ts | A | helper | formato vacío | whole-file | núcleo | bajo | alta |
| ui/src/lib/format/formatLoading.ts | A | helper | formato loading | whole-file | núcleo | bajo | alta |
| ui/src/lib/format/formatValidation.ts | A | helper | formato validación | whole-file | núcleo | bajo | alta |
| ui/src/lib/format/index.ts | A | barrel | export format | whole-file | barrel | bajo | alta |
| ui/src/lib/theme/ThemeProvider.tsx | A | provider | dark mode | whole-file | núcleo | bajo | alta |
| ui/src/lib/theme/ThemeContext.ts | A | context | tipos/contexto tema | whole-file | núcleo | bajo | alta |
| ui/src/lib/theme/useTheme.ts | A | hook | hook de tema | whole-file | núcleo | bajo | alta |
| ui/src/lib/theme/index.ts | A | barrel | export theme | whole-file | barrel | bajo | alta |
| ui/src/lib/lifecycle/filterActive.ts | A | helper | filtra activos | whole-file | núcleo CRUD | bajo | alta |
| ui/src/lib/categoryTypes.ts | A | tipos | tipos categoría | whole-file | tipos compartidos | bajo | media |
| ui/src/lib/leaseTypes.ts | A | tipos | tipos arrendamiento | whole-file | tipos compartidos | bajo | media |
| ui/src/lib/dataDisplay.ts | M | helper | DataTable / display | whole-file | usado por ArchivedListPage | medio | media |
| ui/src/lib/fuzzySearch.ts | A | helper | búsqueda difusa | whole-file | usado por filtros | bajo | media |
| ui/src/lib/tableFilters.ts | A | helper | filtros de tabla | whole-file | OJO solapa con table-select-filters (#104 DONE) | medio | media |
| ui/src/lib/workspaceQuery.ts | A | helper | query workspace | whole-file | filtros workspace | medio | media |
| ui/src/lib/workspaceActionGuards.ts | A | helper | guards de acción | whole-file | filtros workspace | medio | media |
| ui/src/lib/importHelpers.ts | M | helper | normalize headers CSV | whole-file | agrega normalizeHeader | bajo | media |

### crud/ (primitivos CRUD reusables)
| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/components/crud/EntityFormDrawer.tsx | A | componente | drawer de form genérico | whole-file | base CRUD | bajo | alta |
| ui/src/components/crud/ConfirmModal.tsx | A | componente | modal confirmación | whole-file | base CRUD | bajo | alta |
| ui/src/components/crud/BulkActionBar.tsx | A | componente | barra acciones masivas | whole-file | base CRUD | bajo | alta |
| ui/src/components/crud/BulkSelectionPanel.tsx | A | componente | panel selección | whole-file | base CRUD | bajo | alta |
| ui/src/components/crud/ColumnConfigHeader.tsx | A | componente | config columnas | whole-file | base CRUD | bajo | media |
| ui/src/components/crud/ArchivedDrawer.tsx | A | componente | drawer archivados | whole-file | base CRUD | bajo | media |
| ui/src/components/crud/MobileDataCards.tsx | A | componente | cards mobile | whole-file | base CRUD | bajo | media |
| ui/src/components/crud/ResponsiveTable.tsx | A | componente | tabla responsive | whole-file | base CRUD | bajo | media |
| ui/src/components/crud/ScrollableTable.tsx | A | componente | tabla scroll | whole-file | base CRUD | bajo | media |
| ui/src/components/crud/makeSelectColumn.tsx | A | helper | columna de selección | whole-file | base CRUD | bajo | media |
| ui/src/components/crud/CreateSupplyInline.tsx | A | componente | crear insumo inline | whole-file | OJO acoplado a insumos (useCategories) | medio | media |
| ui/src/components/crud/SupplyItemsTable.tsx | A | componente | tabla items insumo | whole-file | OJO acoplado a insumos | medio | media |
| ui/src/components/AppToaster.tsx | A | componente | host de toasts | whole-file | usado por main.tsx | bajo | alta |

### hooks/ (transversales)
| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/hooks/useConfirmDialog/ConfirmDialogProvider.tsx | A | provider | diálogo confirmación | whole-file | usado por main.tsx | bajo | alta |
| ui/src/hooks/useConfirmDialog/context.ts | A | context | whole-file | núcleo | bajo | alta |
| ui/src/hooks/useConfirmDialog/useConfirmDialog.ts | A | hook | whole-file | núcleo | bajo | alta |
| ui/src/hooks/useConfirmDialog/index.ts | A | barrel | whole-file | barrel | bajo | alta |
| ui/src/hooks/useBreakpoint.ts | A | hook | responsive | whole-file | usado por ProtectedLayout/Sidebar | bajo | alta |
| ui/src/hooks/useEntityCrud/index.ts | A | hook | CRUD genérico | whole-file | base CRUD | bajo | media |
| ui/src/hooks/useEntityFormDrawer/index.ts | A | hook | drawer de form | whole-file | base CRUD | bajo | media |
| ui/src/hooks/useBulkSelection/index.ts | A | hook | selección masiva | whole-file | base CRUD | bajo | media |
| ui/src/hooks/useBulkActions/index.ts | A | hook | acciones masivas | whole-file | base CRUD | bajo | media |
| ui/src/hooks/useArchiveActions/index.ts | A | hook | archivar/restaurar | whole-file | base CRUD | bajo | media |
| ui/src/hooks/useWorkspaceFilters.ts | M | hook | filtros workspace | whole-file | OJO solapa #104 (DONE) | medio | media |
| ui/src/hooks/useDollar/index.ts | M | hook | dólar (usa formatError) | partial-hunks | solo el cambio a formatError es de 006; lógica dollar es de 017 | medio | media |

---

## 2) Compartidos (partial-hunks — MEZCLADOS con otras features)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/router.tsx | M | shell | tabla de rutas | partial-hunks | MEZCLA 006 (lazy/Suspense, ThemeProvider no) + 007 actors + 008 tenant + 010 projects + 014 master-data + 016 notifications + 017 dollar/commerce | ALTO | alta |
| ui/src/main.tsx | M | shell | bootstrap React | partial-hunks | MEZCLA 006 (ThemeProvider, AppToaster, ConfirmDialogProvider, ErrorBoundary) — el grueso es de 006, pero depende de archivos creados | medio | alta |
| ui/src/layout/ProtectedLayout.tsx | M | shell | layout protegido | partial-hunks | MEZCLA 006 (InlineSpinner/Suspense, useBreakpoint, sidebarTitle) + 008 (TenantProvider) | ALTO | alta |
| ui/src/layout/Sidebar/Sidebar.tsx | M | shell | navegación | partial-hunks | MEZCLA 006 (toggle de tema useTheme, useIsMobile) + 014/016 (nuevos ítems de menú master-data/notifications) | ALTO | media |
| ui/src/layout/Sidebar/sidebarTitle.ts | A | helper | título por ruta | whole-file | soporte de Sidebar; títulos incluyen rutas de 014 → revisar tras 014 | medio | media |
| ui/src/api/client.ts | M | api | cliente axios | partial-hunks | MEZCLA 006 (platform-authn, authStorage, httpErrorCopy, envelope {success,data}) + 008 (interceptor X-Tenant-Id) | ALTO | alta |
| ui/src/index.css | M | estilos | tokens + dark | partial-hunks | 699 add/308 del; mayoría dark-mode (006) pero puede traer estilos de páginas de 014/015 | medio | media |

---

## 3) Requeridos por dependencia (de OTRA feature, pero el shell los referencia)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| (páginas master-data) ui/src/pages/admin/master-data/* | A | páginas | consumidas por router.tsx | do-not-extract-yet | son de feature-014; sin ellas router.tsx no compila | ALTO | alta |
| ui/src/pages/login/context/TenantContext (TenantProvider) | — | provider | importado por ProtectedLayout | do-not-extract-yet | feature-008 | ALTO | alta |

---

## 4) Eliminaciones (D) — incluir en el PR como parte del refactor

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/lib/toast.ts | D | helper | reemplazado por lib/notify | whole-file (delete) | obsoleto; verificar 0 referencias | medio | alta |
| ui/src/components/Form/FormButtons.tsx | D | componente | reemplazado por DrawerFormActions | whole-file (delete) | obsoleto | medio | media |
| ui/src/components/Card/Card.tsx | D | componente | reemplazado | whole-file (delete) | obsoleto | medio | media |
| ui/src/components/Input/TextAreaField.tsx | D | componente | reemplazado | whole-file (delete) | obsoleto | medio | media |
| ui/src/api/schemas.ts | D | tipos | esquemas viejos | whole-file (delete) | reemplazado por types.ts | medio | media |
| ui/src/hooks/useSupplyMovement/index.ts | D | hook | reemplazado | whole-file (delete) | obsoleto; OJO consumidores en supply-movements (014/legacy) | ALTO | media |
| ui/src/layout/Footer/Footer.tsx | D | componente | footer eliminado | whole-file (delete) | obsoleto | medio | media |
| ui/src/pages/login/context/useLocalStorage.ts | R→ | rename | → lib/authStorage.ts | whole-file (rename) | RENOMBRADO a lib/authStorage.ts | medio | alta |

---

## 5) Dudosos / revisar antes de traer

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/lib/authStorage.ts | R | rename de useLocalStorage | manual-port | depende de `@devpablocristo/platform-authn/browser/storage` publicado | medio | alta |
| ui/src/lib/tableFilters.ts | A | helper | partial/whole | SOLAPA con table-select-filters #104 (DONE en develop). Verificar que no duplique/conflicte con lo ya porteado | ALTO | media |
| ui/src/hooks/useWorkspaceFilters.ts | M | hook | partial-hunks | mismo solape con #104 | ALTO | media |
| ui/src/lib/properName.ts | A | helper | whole-file | relacionado a shared-text-propername (feature-004 BE); en FE es helper de display | medio | media |
| ui/src/lib/entityNameMatcher.ts | A | helper | whole-file | idem propername; revisar contra 004 | medio | media |
| ui/src/config/dockerComposeGuard.test.ts | M | test | do-not-extract-yet | es config/build → feature-021; NO traer en 006 | medio | media |
| ui/src/api/aiClient.ts | M | api | partial-hunks | cambio para fetchErrorAdapter es de 006; lógica AI es de feature-012 | medio | media |
| ui/src/api/insightsClient.ts | M | api | partial-hunks | idem: fetchErrorAdapter (006) vs insights (015) | medio | media |
| ui/src/api/hooks/useApiCall.ts | M | api | whole-file | extractErrorMessage/Status — núcleo de errores (006) | medio | media |
| ui/src/api/types.ts | M | tipos | whole-file | reducción de tipos; base | medio | media |
| ui/src/components/Dropdown/SupplyDropdown.tsx | M | componente | whole-file | acoplado a insumos; revisar vs 014 | medio | baja |
| ui/src/hooks/useInvestors/index.ts | A | hook | whole-file | hook de entidad investors → ¿006 base o 014? | medio | baja |
| ui/src/hooks/useManagers/index.ts | A | hook | whole-file | idem managers → ¿006 o 014? | medio | baja |

---

## 6) Tests del flist

| path | status | cubre |
|---|---|---|
| ui/src/lib/notify.test.ts | A | notify |
| ui/src/lib/format/formatError.test.ts | A | formatError |
| ui/src/components/filters/AppFilterBar.test.tsx | A | AppFilterBar (SDD del SPEC) |
| ui/src/components/Drawer/DrawerShell.test.tsx | A | DrawerShell (SDD del SPEC) |
| ui/src/components/ArchivedListPage/ArchivedListPage.test.tsx | A | ArchivedListPage |
| ui/src/copy/entities.test.ts | A | copy entities |
| ui/src/copy/http.test.ts | A | copy http |
| ui/src/lib/lifecycle/filterActive.test.ts | A | filterActive |
| ui/src/lib/properName.test.ts | A | properName |
| ui/src/lib/entityNameMatcher.test.ts | A | entityNameMatcher |
| ui/src/lib/tableFilters.test.ts | A | tableFilters (OJO #104) |
| ui/src/lib/workspaceActionGuards.test.ts | A | workspaceActionGuards |
| ui/src/lib/workspaceQuery.test.ts | A | workspaceQuery |
| ui/src/lib/dataDisplay.test.tsx | A | dataDisplay |
| ui/src/hooks/useWorkspaceFilters.test.ts | A | useWorkspaceFilters (OJO #104) |
| ui/src/api/fetchErrorAdapter.test.ts | A | fetchErrorAdapter |
| ui/src/components/ArchivedListPage/ArchivedListPage.test.tsx | A | (listado arriba) |

> Nota: `ui/src/components/ArchivedListPage/ArchivedListPage.tsx` y `ui/src/lib/dataDisplay.ts` (M) son **propios** del núcleo aunque consumen tipos de `pages/admin/types`.

---

## Inventario adicional (completitud)

Paths fuente reales que faltaban en las tablas anteriores. Clasificados muestreando el diff `fefbe695..3ffcf60` (SOURCE = `develop-problematico~1`, 3ffcf60).

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/api/fetchErrorAdapter.ts | A | helper api | normaliza errores de fetch (no-axios) hacia el pipeline `formatError` | whole-file | núcleo de errores 006: define `FetchApiError` (mimicka shape de `AxiosError`: `response.data`+`response.status`+`userMessage`) y `wrapFetchResponse`; usa `HTTP_COPY` de `copy/http.ts` y lo consumen `aiClient.ts`/`insightsClient.ts` (que van partial-hunks en §5). Su test `fetchErrorAdapter.test.ts` ya figura en §6 | bajo | alta |
| ui/src/components/LoadingScreen/LoadingScreen.tsx | M | componente | pantalla de carga full-screen | whole-file | cambio puro de dark-mode (006): agrega `dark:bg-slate-900`, `dark:text-slate-200`, `dark:text-slate-400`. El diff se ve grande sólo por normalización de fin de línea (CRLF→LF); el cambio funcional son esas 3 variantes `dark:`. Sin mezcla con otras features | bajo | alta |
