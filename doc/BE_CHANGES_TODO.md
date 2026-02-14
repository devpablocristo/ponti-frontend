# Cambios en Backend (ponti-backend)

> Generado: 2026-02-14
> Actualizado: 2026-02-14
> Estos cambios complementan el refactor del FE y mejoran el alineamiento BE↔FE.

---

## Completados

### 1. ~~Normalizar key de lista en respuestas paginadas~~ ✅ HECHO

**Archivos modificados:**
- [x] `internal/project/handler/dto/list_projects.go` — `"data"` → `"items"` en `ProjectsResponse` y `ListProjectsResponse`
- [x] `internal/customer/handler/dto/list_customers.go` — `"data"` → `"items"` en `ListCustomersResponse`
- [x] BFF `api/src/routes/projects.ts` — actualizado para leer `items` del BE
- [x] BFF `api/src/routes/customers.ts` — actualizado para leer `items` del BE

> Ahora TODOS los endpoints de lista usan `"items"` como key del array.

### 2. ~~Normalizar parámetro de paginación~~ ✅ HECHO

**Archivos modificados:**
- [x] `internal/shared/handlers/pagination.go` — acepta `per_page` y `page_size` como fallback
- [x] `internal/lot/handler.go` — ListLots y ExportLots usan `ParsePaginationParams()` en vez de parsear manualmente

> Ahora TODOS los endpoints aceptan `per_page` (y `page_size` como fallback).

### 3. ~~Normalizar respuesta de create~~ ✅ HECHO

**Archivos modificados:**
- [x] `internal/project/handler/dto/create_project.go` — `"project"` → `"id"`
- [x] `internal/project/handler.go` — `ProjectID: pID` → `ID: pID`
- [x] `internal/customer/handler/dto/create_customer.go` — `"customer_id"` → `"id"`
- [x] `internal/customer/handler.go` — `CustomerID: newID` → `ID: newID`

> Ahora TODOS los endpoints de create retornan `{ "message": "...", "id": N }`.

### 4. ~~Preservar error type/context en BFF~~ ✅ HECHO

**Archivos modificados:**
- [x] `ponti-frontend/api/src/clients/ApiClient.ts` — `handleErrorResponse` preserva `type`, `code`, `message`, `details`, `context`

### 8. ~~PageInfo duplicación~~ ✅ HECHO

**Archivos modificados:**
- [x] `internal/project/handler/dto/list_projects.go` — eliminada `PageInfo` local, usa `types.PageInfo` + `types.NewPageInfo()`
- [x] `internal/customer/handler/dto/list_customers.go` — eliminada `PageInfo` local, usa `types.PageInfo` + `types.NewPageInfo()`
- [x] `internal/project/handler.go` — `ListProjectsByName` usa `types.NewPageInfo()` en vez de construir `dto.PageInfo` manual

---

### 5. ~~Normalizar respuesta de update/delete (200 vs 204)~~ ✅ HECHO

**Archivos modificados:**
- [x] `internal/project/handler.go` — Update/Delete/Archive/Restore/HardDelete: 200 → 204 (5 endpoints)
- [x] `internal/customer/handler.go` — Update/Delete/Archive/Restore/HardDelete: 200 → 204 (5 endpoints)
- [x] `internal/supply/handler.go` — Update/Delete/BulkUpdate/UpdateMovement/DeleteMovement: 200 → 204 (5 endpoints)

> Ahora TODOS los endpoints de update/delete retornan `204 No Content`.

---

## Pendientes (baja prioridad)

### 6. Consistencia en error handling pattern

**Prioridad**: BAJA | **Esfuerzo**: 1h

Cada handler usa un pattern distinto. Unificar a `HandleDomainError` o `NewAPIError`.

### 7. Decimal serialization docs

**Prioridad**: BAJA | **Esfuerzo**: 1h

Documentar convención de precisión decimal por tipo de dato.

### 9. CORS

**Prioridad**: BAJA | Solo agregar si el FE necesita llamar directo al BE.

### 10. OpenAPI/Swagger

**Prioridad**: BAJA | Solo implementar cuando se sume un segundo consumer.

---

## Resumen

| # | Cambio | Estado |
|---|--------|--------|
| 1 | Normalizar `"items"` key en listas | ✅ HECHO |
| 2 | Normalizar `per_page` param | ✅ HECHO |
| 3 | Normalizar `"id"` en creates | ✅ HECHO |
| 4 | Preservar error type/context en BFF | ✅ HECHO |
| 8 | PageInfo duplicación | ✅ HECHO |
| 5 | Normalizar 204 en updates/deletes | ✅ HECHO |
| 6 | Consistencia error handling | Pendiente (baja) |
| 7 | Decimal serialization docs | Pendiente (baja) |
