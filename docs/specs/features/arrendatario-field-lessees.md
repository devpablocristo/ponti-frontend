# Plan — Arrendatario con tabla dedicada (`field_lessees`)

## Resumen ejecutivo

Hasta ahora, el sistema guardaba los arrendatarios de cada campo mezclados con los inversores en la misma tabla (`field_investors`), porque el formulario de campo usaba el selector de inversores para cargar arrendatarios. Esto significaba que crear un actor con rol "Arrendatario" en el registro no servía de nada: no aparecía en el formulario.

Se creó una tabla propia para los arrendatarios de campo (`field_lessees`) y se reconectó el formulario para que el selector "Arrendatario" consuma actores reales con ese rol y guarde en la tabla correcta. Los 21 arrendatarios que ya estaban cargados en el sistema se migraron automáticamente sin pérdida de datos.

**Resultado:** los arrendatarios ahora tienen su propio espacio en el sistema, separado de los inversores. Se puede crear un actor con rol "Arrendatario" en el registro y asignarlo a un campo con su porcentaje. Los inversores a nivel proyecto siguen funcionando igual que antes.

## Context

Hoy el selector **"Arrendatario"** del formulario de campo (`Fields.tsx:414-432`) es un
engaño: toma sus opciones del pool de **inversores** (`investorList` / `/investors`),
guarda lo seleccionado en `field.investors` con porcentaje, y persiste en la tabla
`field_investors` del backend. Resultado: si creás un actor con rol `lessee` (arrendatario)
**no aparece** en ese selector, y los arrendatarios quedan guardados como inversores.

El rol `lessee` ya existe en el backend (`actor_roles`, `identity/resolver.go:24`) y hay
fuente de datos lista (`searchRegistry({type:"lessee"})`, `ui/src/api/registry.ts:33`), pero
**no existe** ninguna relación campo→arrendatario en el modelo.

**Objetivo:** crear una tabla dedicada `field_lessees(field_id, actor_id, percentage)`,
cablear el selector "Arrendatario" para que consuma **actores con rol arrendatario** y
guarde en esa tabla. El campo deja de tener inversores en el formulario.

### Decisiones tomadas (con el usuario)
- **Cardinalidad:** varios arrendatarios por campo, cada uno con su **porcentaje**
  (mismo modelo que inversores). Tabla `field_lessees(field_id, actor_id, percentage)`.
- **Migración de datos:** **migrar los arrendatarios existentes** desde `field_investors`
  hacia `field_lessees`. El sistema está en producción y muchos campos ya tienen su
  arrendatario cargado (mal etiquetado como inversor a nivel campo); empezar limpio los
  haría desaparecer del formulario. Ver paso 1b. (Antes de codear: correr el conteo de la
  sección "Pre-chequeo de datos" para dimensionar filas con/ sin `actor_id`.)
- **Inversor a nivel campo:** se elimina del formulario. El campo solo tendrá arrendatarios.
  Los inversores siguen existiendo solo a nivel **proyecto** (`project.investors` /
  `admin_cost_investors`, intactos). `field_investors` queda sin uso desde el form.

### Diferencia clave de modelo vs. inversores
- `field_investors.investor_id` apunta a la tabla `investors` (con `ensureInvestor`
  resolve-or-create por nombre).
- `field_lessees.actor_id` apunta **directo a `actors(id)`**. El actor **ya existe** (se creó
  en el registry), así que **no hay `ensure`/create**: solo se inserta `actor_id + percentage`.

---

## Backend (`ponti-backend`)

### 1. Migración — nueva tabla
`migrations_v4/000248_field_lessees.up.sql` (última aplicada = `000247_actor_taxid_trgm`) + `.down.sql`.

```sql
-- up
CREATE TABLE public.field_lessees (
    field_id   bigint  NOT NULL REFERENCES public.fields(id)  ON DELETE CASCADE,
    actor_id   bigint  NOT NULL REFERENCES public.actors(id)  ON DELETE CASCADE,
    percentage integer NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (field_id, actor_id)
);
-- down: DROP TABLE IF EXISTS public.field_lessees;
```
Espejar tipos/columnas de auditoría de `field_investors` (ver
`migrations_v4/000070_investors_commercialization_tables.up.sql`).

### 1b. Datos existentes — script post-backfill (NO va en la migración)
**Implementado:** `scripts/db/field_investors_to_lessees.sql` (BE). Va **separado** de la
migración de schema porque depende de que el backfill (`cmd/backfill-actors`) ya haya sellado
`investors.actor_id`; las migraciones corren en el deploy **antes** del backfill, así que un
`INSERT` embebido en `000248` migraría 0 filas. Orden de deploy: migrar → backfill → correr
este script. Validado sobre datos de prod: 22/22 filas, 11 actores con rol lessee, 0 sin cobertura.

Copia los arrendatarios ya cargados. Todo `field_investors` es, en la práctica, un
arrendatario: el único escritor de esa tabla es el selector mal etiquetado de campo (no existe
selector de inversor real a nivel campo).

**Puente directo** (cuando el inversor ya tiene actor vinculado — `investors.actor_id`,
sellado por `internal/investor/repository.go:74` con Identity Gate activo):
```sql
INSERT INTO field_lessees (field_id, actor_id, percentage, created_by, updated_by)
SELECT fi.field_id, i.actor_id, fi.percentage, fi.created_by, fi.updated_by
FROM field_investors fi
JOIN investors i ON i.id = fi.investor_id
WHERE i.actor_id IS NOT NULL
ON CONFLICT (field_id, actor_id) DO NOTHING;
```

**Fallback por nombre** (inversores creados antes de Identity Gate → `actor_id` NULL): no
hay backfill masivo en migraciones, el `actor_id` se sella por escritura. Para esas filas
hay que resolver el actor por nombre normalizado contra `actor_keys` (key_type `LEGAL_NAME`
/ `PERSON_NAME` / `ALIAS`) y, si no existe, crearlo (resolve-or-create del registry). El
volumen exacto se mide en el Pre-chequeo; si es bajo, puede resolverse manualmente.

**Sellar rol `lessee` (OBLIGATORIO — confirmado en el relevamiento):** el backfill crea los
actores con rol `investor` y **cero** con rol `lessee`. Sin este paso, los datos migran pero
**no aparecen en el selector** (que filtra por `lessee`). Agregar el rol:
```sql
INSERT INTO actor_roles (actor_id, role)
SELECT DISTINCT actor_id, 'lessee' FROM field_lessees
ON CONFLICT (actor_id, role) DO NOTHING;
```

> `field_investors` **no se borra**: queda como respaldo histórico. Solo se deja de leer/escribir
> desde el form. Una limpieza posterior es decisión separada.

### 2. Modelos GORM — `internal/field/repository/models/field.go`
- Agregar struct `FieldLessee { FieldID, ActorID (primaryKey), Percentage int; Actor actormod.Actor gorm:"foreignKey:ActorID;references:ID" }` espejando `FieldInvestor` (`field.go:25-37`), pero la asociación es a **Actor** (para resolver el nombre), no a Investor.
- Agregar `FieldLessees []FieldLessee gorm:"foreignKey:FieldID;references:ID"` al struct `Field`.

### 3. Dominio — `internal/field/usecases/domain/field.go`
- Agregar tipo `Lessee { ActorID int64; Name string; Percentage int }`.
- Agregar `Lessees []Lessee` al struct `Field` (junto a `Investors`).

### 4. DTO — `internal/project/handler/dto/project.go`
- Struct `Field` DTO (`:68-78`): agregar `Lessees []Lessee `json:"lessees"``.
  (no `binding:"required"` para no romper payloads sin arrendatarios.)
- Nuevo DTO `Lessee { ID int64 `json:"id"`; Name string `json:"name"`; Percentage int `json:"percentage"` }` — `id` = actor_id (encaja con el `BaseItem {id}` del FE).
- `ToDomain` (`:239-252`): recorrer `f.Lessees` → `fld.Lessees = append(... Lessee{ActorID: li.ID, Name: li.Name, Percentage: li.Percentage})`.
- `FromDomain` (`:308-338`): recorrer `fld.Lessees` → DTO `Lessee{ID: l.ActorID, Name, Percentage}`.

### 5. Mapeo modelo↔dominio — `internal/project/repository/models/project.go`
- `FromDomain`: construir `FieldLessees` desde `domain.Field.Lessees` para que el `tx.Create` del proyecto **cascadee** el insert (igual que hace hoy con `FieldInvestors`).
- `ToDomain` (~`:239-240`): mapear `FieldLessees` → `domain.Field.Lessees`, tomando el nombre de `fl.Actor.DisplayName`.

### 6. Repositorio — `internal/project/repository.go`
- **Create:** el insert cascada vía `models.FromDomain` (paso 5). A diferencia de inversores (loop `ensureInvestor`, `:149-162`), **no** agregar loop de ensure: el `actor_id` ya viene resuelto del FE.
- **Update:** agregar `relinkFieldLessees(tx, existing, d)` espejando `relinkFieldInvestors` (`:1527-1597`), pero:
  - keyear por `actor_id` (no `investor_id`),
  - **sin** `ensureInvestor` (el actor existe),
  - INSERT/UPDATE/DELETE sobre `field_lessees`.
  Llamarla junto a `relinkFieldInvestors` en `UpdateProject` (~`:601`).
- **Get:** agregar `Preload("Fields.FieldLessees.Actor")` donde hoy se hace `Preload("Fields.FieldInvestors.Investor")` (~`:440`, `:510`).

> `field_investors` y su lógica quedan intactos (proyecto-level no se toca; field-level
> simplemente deja de recibir datos del form). No se borra para no romper datos viejos.

---

## BFF (`ponti-frontend/api`)
- **Verificar** que las rutas de proyecto (`api/src/routes/`, buscar `projects`) hagan
  passthrough del payload sin filtrar propiedades de `fields[]`. Si reshapean/whitelistean
  campos, agregar `lessees`. (Probable passthrough directo — confirmar antes de codear FE.)

---

## Frontend (`ponti-frontend/ui`)

### 7. Tipo de campo del form — `ui/src/pages/admin/database/customers/Fields.tsx`
- En `type Field` (`:19-31`): reemplazar `investors: {...}[]` por
  `lessees: { id: number; name: string; percentage: number }[]` (`id` = actor_id).
- `addField` (`:160-182`) y `handleFieldChange` (`:148-158`): cambiar la key `investors` → `lessees`.
- `AutocompleteSelect` (`:414-432`):
  - `options={lesseeList}` (nueva prop, ver paso 8) en vez de `investorList`.
  - `selectedItems={field.lessees}`, `setItems` y `handleFieldChange(key,"lessees",...)`.
  - Mantener el modal de porcentaje (`handleSaveInvestment`/`handleInvestorSuggestionClick`,
    `:282-329`) — solo renombrar a contexto arrendatario; la lógica de % se conserva tal cual.
  - Quitar la dependencia de `investorList` / `Investor` si ya no se usa.

### 8. Fuente de datos arrendatarios
- Nueva prop `lesseeList` a `Fields`. Cargarla en `Customers.tsx` con
  `searchRegistry({ type: "lessee", perPage: 1000 })` (`ui/src/api/registry.ts`), mapeando
  `RegistryRow` → `{ id, name, percentage: 0 }`. (Reusar el patrón de carga de opciones ya
  existente; envolver en el hook/efecto que corresponda según cómo se cargan hoy las options.)

### 9. Estado y payload — `ui/src/pages/admin/database/customers/Customers.tsx`
- `convertFields` (`:131-163`): mapear `field.lessees` del server (en vez de / además de
  `field.investors`); inicializar `lessees: Array.isArray(field.lessees) ? field.lessees : []`.
- `handlePreSave` / construcción de `mappedFields`: pasar `lessees`.

### 10. Mapeo de payload — `ui/src/pages/admin/database/customers/projectPayload.ts`
- En `mapProjectFieldsPayload` (`:62-84`): reemplazar `investors: ...` por
  `lessees: Array.isArray(field.lessees) ? field.lessees : []`.
- `parseProjectFieldErrorMessage` (`:98-103`): agregar label `lessees: "arrendatarios"`.

### 11. Tipos del proyecto — `ui/src/hooks/useDatabase/projects/types.ts`
- `type Field` (`:34-47`): reemplazar `investors` por
  `lessees: { id: number; name: string; percentage: number }[]`.

---

## Hallazgos del relevamiento (datos reales de PROD, 2026-06-16)
Se bajó PROD a una DB local y se midió:
- **22** filas en `field_investors` (= arrendatarios), sobre 32 `fields`, apuntando a **11 nombres
  distintos** (`agro lajitas, Ana, BIANCHI, CONRADO, CORYSUR, EL SUEÑO SRL, HUMBERTO ALVAREZ,
  LAS CASUARINAS SRL, OLEGA SA, SAVINO, SOALEN SRL`).
- En PROD el **registry de actores está vacío** (prod aún no tiene las migraciones `241-247`);
  `investors.actor_id` todo NULL. → Sin backfill, el puente directo cubre **0/22**.
- Tras correr el backfill oficial (`go run ./cmd/backfill-actors`, reusa
  `identity.ResolveOrCreateIdentity`): **22/22 (100%)** de los arrendatarios quedan con actor;
  `sin_actor = 0`. **No hace falta el fallback por nombre.**
- El backfill crea los actores con rol **`investor`**, no `lessee` → la migración de datos
  **debe sellar el rol `lessee`** (paso ya previsto), si no, no aparecen en el selector.

**Dependencia de orden (crítica):** desplegar registry → correr backfill (que sella
`investors.actor_id`) → recién ahí migrar `field_investors → field_lessees`. Todo viaja junto
en `dedup-entidades`; es cuestión de secuenciar el deploy.

> Nota de entorno: el reset local fallaba porque la imagen local es **Postgres 16**
> (`pgvector:pg16`) y el dump de prod trae `SET transaction_timeout` (PG17+); con
> `pg_restore --exit-on-error` aborta todo. Workaround: imagen local PG17 / quitar
> `--exit-on-error` / stripear esa línea. Es infra, ajeno a esta feature.

## Pre-chequeo de datos (antes de migrar, sobre prod ya con backfill corrido)
Confirmar que el backfill dejó `sin_actor = 0`:
```sql
SELECT
  COUNT(*)                                       AS total_filas,
  COUNT(*) FILTER (WHERE i.actor_id IS NOT NULL) AS con_actor,   -- migran con el puente directo
  COUNT(*) FILTER (WHERE i.actor_id IS NULL)     AS sin_actor    -- requieren fallback por nombre
FROM field_investors fi
JOIN investors i ON i.id = fi.investor_id;
```
- `sin_actor = 0` → alcanza con el puente directo; el fallback no hace falta.
- `sin_actor > 0` → definir fallback por nombre (automático en migración) o resolución manual.

## Criterios de aceptación
- [ ] Existe tabla `field_lessees(field_id, actor_id, percentage)` con FKs a `fields` y `actors`.
- [ ] Los campos que ya tenían arrendatario (en `field_investors`) lo siguen mostrando tras migrar.
- [ ] Crear un actor con rol "Arrendatario" en el registry → aparece en el selector "Arrendatario" del campo.
- [ ] Guardar un proyecto con arrendatarios + % persiste filas en `field_lessees` con el `actor_id` correcto.
- [ ] Reabrir el proyecto precarga los arrendatarios con su nombre y % (vía `Preload(...Actor)`).
- [ ] Editar (agregar/cambiar %/quitar) un arrendatario hace INSERT/UPDATE/DELETE en `field_lessees`.
- [ ] El selector ya **no** muestra inversores; los inversores a nivel proyecto siguen funcionando igual.
- [ ] La suma de % de arrendatarios sigue validando ≤ 100 (lógica de `handleSaveInvestment`).

## Riesgos
- **Cobertura de la migración:** las filas con `investors.actor_id` NULL no migran con el puente
  directo y necesitan fallback por nombre; si no se resuelven, esos campos pierden su arrendatario.
  Mitigación: Pre-chequeo de datos + fallback contra `actor_keys`.
- **Doble identidad / nombre ambiguo:** el fallback por nombre puede matchear el actor equivocado
  si hay nombres duplicados. Mitigación: normalizar y, ante ambigüedad, resolución manual.
- **Rol del actor migrado:** sin el `INSERT` de rol `lessee`, el actor migrado figura solo como
  inversor y podría no listarse en el selector. Mitigación: paso de sellado de rol.
- **Nombre del arrendatario en Get:** depende de `Preload(...Actor)` y `Actor.DisplayName`;
  si falta el preload, los tags salen sin nombre.
- **BFF passthrough:** si el proxy filtra props de `fields[]`, `lessees` se perdería silenciosamente
  (mitigado por el paso de verificación del BFF).
- **Orden de migración:** correr la migración antes de desplegar el código que la usa.

## Decisiones de diseño
- `field_lessees.actor_id` apunta a `actors` directo (no a una tabla intermedia tipo `investors`)
  porque el arrendatario **es** un actor con rol; evita duplicar identidades y el `ensure`.
- Se espeja deliberadamente el patrón `field_investors` (modelo, relink, preload) para mantener
  consistencia y bajar el riesgo, en vez de inventar un mecanismo nuevo.
- No se borra `field_investors` ni su código: desacopla el cambio del form de una limpieza de datos
  y deja un respaldo histórico de los arrendatarios migrados.
- Se migran datos en vez de empezar limpio porque el sistema está en producción con arrendatarios
  ya cargados; perderlos del formulario no es aceptable.

## Verificación end-to-end
0. Correr el Pre-chequeo de datos y decidir si hace falta fallback por nombre.
1. BE: correr migración (`migrate up`) y `go build ./...` + tests del paquete project.
1b. Verificar que `field_lessees` quedó poblada (`SELECT count(*) FROM field_lessees;`) y que un
    proyecto preexistente con arrendatario lo sigue mostrando al reabrirlo.
2. Levantar BE + BFF + `yarn workspace ui dev`.
3. En el registry, crear actor con rol Arrendatario.
4. En un proyecto, agregar campo → seleccionar ese arrendatario + % → guardar.
5. Verificar fila en `field_lessees` (psql) y que reabrir el proyecto lo muestre.
6. Editar % y quitar arrendatario → verificar UPDATE/DELETE en la tabla.
7. `yarn workspace ui build` y `yarn workspace ui test`.
