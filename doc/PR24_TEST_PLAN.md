# PR #24 — Test Plan

**PR:** https://github.com/devpablocristo/ponti-frontend/pull/24  
**Branch:** `feature/stock-supplies-inputs` → `develop`  
**Título:** Importación Excel/CSV + mejoras UI en archivados y formularios

---

## Resumen de cambios

### 1. Importación de insumos desde archivo (Excel/CSV)
**Archivo:** `ui/src/pages/admin/database/products/Items.tsx`

Se agregó la capacidad de importar insumos masivamente desde archivos Excel (.xlsx, .xls) y CSV.

**Qué probar:**
- [ ] Ir a **Base de Datos → Insumos** (`/admin/database/items`)
- [ ] Verificar que aparece un botón de importación (además del botón existente "Agregar insumos")
- [ ] Importar un archivo **Excel (.xlsx)** con columnas: Insumo, Unidad, Precio, Rubro, Tipo
- [ ] Importar un archivo **CSV** con las mismas columnas
- [ ] Verificar que los datos aparecen en la tabla de previsualización
- [ ] Verificar que las columnas se mapean correctamente (acepta aliases: "insumo"/"nombre"/"name", "unidad"/"unit", "precio"/"usd", "rubro"/"categoria", "tipo"/"clase")
- [ ] Verificar que se detectan duplicados (insumos con el mismo nombre)
- [ ] Probar con un archivo con headers en español y otro en inglés
- [ ] Probar con un archivo vacío → debería mostrar error
- [ ] Probar con un archivo con formato incorrecto → debería mostrar error
- [ ] Guardar los insumos importados y verificar que se crean en el backend

### 2. Importación de labores desde archivo (Excel/CSV)
**Archivo:** `ui/src/pages/admin/database/tasks/TasksForm.tsx`

Se agregó la misma funcionalidad de importación para labores.

**Qué probar:**
- [ ] Ir a **Base de Datos → Labores** (`/admin/database/tasks`)
- [ ] Verificar que aparece un botón de importación
- [ ] Importar un archivo **Excel (.xlsx)** con columnas: Labor, Contratista
- [ ] Importar un archivo **CSV** con las mismas columnas
- [ ] Verificar que los datos aparecen en la tabla de previsualización
- [ ] Verificar aliases de headers: "labor"/"nombre"/"name", "contratista"/"contractor"
- [ ] Probar con archivo vacío → error
- [ ] Probar con archivo con formato incorrecto → error
- [ ] Guardar las labores importadas y verificar creación en backend

### 3. Sidebar — Renombrado de menú
**Archivo:** `ui/src/layout/Sidebar/Sidebar.tsx`

**Qué probar:**
- [ ] En el sidebar, bajo **Base de Datos**, verificar que dice **"Clientes Archivados"** (antes decía "Clientes")
- [ ] Verificar que dice **"Proyectos Archivados"** (antes decía "Proyectos")
- [ ] Verificar que ambos links siguen navegando a las rutas correctas

### 4. Clientes Archivados — Mejora de layout
**Archivo:** `ui/src/pages/admin/database/customers/ArchivedCustomers.tsx`

**Qué probar:**
- [ ] Ir a **Base de Datos → Clientes Archivados** (`/admin/database/customers/archived`)
- [ ] Verificar que el subtítulo dice *"Restaurar o eliminar clientes de forma definitiva"*
- [ ] Verificar que la columna **Acciones** está cerca de los nombres (no al extremo derecho)
- [ ] Verificar que los botones de restaurar (verde) y eliminar (rojo) funcionan
- [ ] Probar restaurar un cliente → debe volver a la lista de clientes activos
- [ ] Probar eliminar definitivamente un cliente → debe pedir confirmación

### 5. Proyectos Archivados — Mejora de layout
**Archivo:** `ui/src/pages/admin/database/projects/ArchivedProjects.tsx`

**Qué probar:**
- [ ] Ir a **Base de Datos → Proyectos Archivados** (`/admin/database/projects/archived`)
- [ ] Verificar que el subtítulo dice *"Restaurar o eliminar proyectos de forma definitiva"*
- [ ] Verificar que la columna Acciones está centrada
- [ ] Probar restaurar y eliminar un proyecto

### 6. DataTable — Soporte de anchos en headers
**Archivo:** `ui/src/components/Table/DataTable.tsx`

**Qué probar:**
- [ ] Verificar que las tablas en general siguen viéndose bien (no se rompió ninguna)
- [ ] Verificar específicamente: Lotes, Órdenes de trabajo, Labores, Insumos, Stock
- [ ] Los anchos de columna se respetan tanto en el header como en las celdas

### 7. Crear Insumo — Mejoras en formulario
**Archivo:** `ui/src/pages/admin/products/CreateItem.tsx`

**Qué probar:**
- [ ] Ir a **Insumos** → click **"+ Nuevo insumo"** para abrir el drawer
- [ ] Verificar que el formulario funciona correctamente
- [ ] Verificar que se muestran errores por fila si el backend rechaza algún movimiento
- [ ] Verificar que se removió la dependencia de stock (ya no se carga stock innecesariamente)

### 8. Crear Stock Item — Mejoras
**Archivo:** `ui/src/pages/admin/stock/CreateStockItem.tsx`

**Qué probar:**
- [ ] Ir a **Stock** → crear un nuevo item de stock
- [ ] Verificar que el formulario funciona correctamente
- [ ] Verificar manejo de errores por fila

### 9. Crear/Editar Orden de Trabajo — Mejoras
**Archivos:** `ui/src/pages/admin/workorders/CreateOrder.tsx`, `UpdateOrder.tsx`

**Qué probar:**
- [ ] Ir a **Órdenes de trabajo** → crear una nueva orden
- [ ] Verificar que el formulario de creación funciona
- [ ] Editar una orden existente → verificar que carga los datos correctamente
- [ ] En edición: verificar que se pueden agregar/quitar insumos
- [ ] Guardar cambios y verificar que se reflejan en la lista

### 10. Dependencia nueva: xlsx
**Archivo:** `ui/package.json`

**Qué probar:**
- [ ] Verificar que `yarn install` no falla
- [ ] Verificar que el build de producción (`yarn build`) completa sin errores

---

## Formatos de archivo soportados

La importación acepta **Excel (.xlsx, .xls)** y **CSV (.csv)**. Internamente usa la librería `xlsx` que parsea ambos formatos.

### Archivos de prueba sugeridos

**Opción 1 — CSV** (`items.csv`):
```csv
Insumo,Unidad,Precio,Rubro,Tipo
Glifosato,Lt,15.5,Herbicidas,Herbicida
Urea granulada,Kg,0.45,Fertilizantes,Fertilizante
Aceite mineral,Lt,3.2,Coadyuvantes,Coadyuvante
```

**Opción 2 — Excel** (`items.xlsx`):
Crear un archivo Excel con las mismas columnas en la primera hoja. Los headers pueden estar en español o inglés (se mapean automáticamente por aliases).

**Para labores** (`labores.csv` o `labores.xlsx`):
```csv
Labor,Contratista
Pulverización,Leo Gomez
Siembra,Parra
Cosecha,Itines
```

### Probar ambos formatos
- [ ] Importar insumos desde un **.xlsx** → debe parsear correctamente
- [ ] Importar insumos desde un **.csv** → debe parsear correctamente
- [ ] Importar labores desde un **.xlsx** → debe parsear correctamente
- [ ] Importar labores desde un **.csv** → debe parsear correctamente
- [ ] Intentar importar un **.pdf** u otro formato no soportado → debe mostrar error

---

## Regresión — verificar que no se rompió

- [ ] Dashboard carga correctamente
- [ ] Lotes — tabla y métricas se ven bien
- [ ] Órdenes de trabajo — tabla y métricas se ven bien
- [ ] Labores — tabla y métricas se ven bien
- [ ] Insumos — tabla y métricas se ven bien
- [ ] Stock — tabla y métricas se ven bien
- [ ] Clientes y sociedades — funciona normalmente
- [ ] Navegación del sidebar funciona en todas las secciones
