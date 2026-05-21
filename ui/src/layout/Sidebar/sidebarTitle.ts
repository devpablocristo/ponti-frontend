const primaryTitles = new Map<string, string>([
  ["/admin/dashboard", "Dashboard"],
  ["/admin/database/customers/list", "Clientes y Proyectos"],
  ["/admin/lots", "Lotes"],
  ["/admin/work-orders", "Órdenes de Trabajo"],
  ["/admin/tasks", "Labores"],
  ["/admin/supply-movements", "Insumos"],
  ["/admin/stock", "Stock"],
  ["/admin/ai-assistant", "Asistente"],
  ["/admin/notifications", "Notificaciones"],
  ["/admin/access", "Accesos"],
]);

const secondaryTitles = new Map<string, string>([
  ["/admin/database/data-integrity", "Integridad de Datos"],
  ["/admin/informes/aportes", "Aportes por Inversor"],
  ["/admin/informes/campo", "Por Campo o Cultivo"],
  ["/admin/informes/resumen", "Resumen de Resultados"],
  ["/admin/database/actors", "Todos"],
  ["/admin/database/actors/clientes", "Clientes"],
  ["/admin/database/actors/inversores", "Inversores"],
  ["/admin/database/actors/responsables", "Responsables"],
  ["/admin/database/actors/proveedores", "Proveedores"],
  ["/admin/database/actors/contratistas", "Contratistas"],
  ["/admin/database/actors/duplicates", "Duplicados"],
  ["/admin/database/actors/archived", "Archivados"],
  ["/admin/database/customers/editor", "Editar"],
  ["/admin/database/customers/archived", "Archivados"],
  ["/admin/database/projects/archived", "Archivados"],
  ["/admin/database/labors", "Crear"],
  ["/admin/database/labors/list", "Editar"],
  ["/admin/database/labors/archived", "Archivados"],
  ["/admin/database/supplies", "Crear"],
  ["/admin/database/supplies/list", "Editar"],
  ["/admin/database/supplies/archived", "Archivados"],
  ["/admin/supply-movements/archived", "Movimientos Archivados"],
  ["/admin/database/investors/create", "Crear"],
  ["/admin/database/investors", "Editar"],
  ["/admin/database/investors/archived", "Archivados"],
  ["/admin/database/managers/create", "Crear"],
  ["/admin/database/managers", "Editar"],
  ["/admin/database/managers/archived", "Archivados"],
  ["/admin/database/campaigns/create", "Crear"],
  ["/admin/database/campaigns", "Editar"],
  ["/admin/database/campaigns/archived", "Archivados"],
  ["/admin/database/lots/archived", "Lotes Archivados"],
  ["/admin/database/fields/archived", "Campos Archivados"],
  ["/admin/database/work-orders/archived", "Archivados"],
  ["/admin/database/dollar", "Cargar Dólar Promedio"],
  ["/admin/database/commerce", "Cargar Comercialización"],
]);

export function getSidebarTitle(pathname: string) {
  if (primaryTitles.has(pathname)) {
    return primaryTitles.get(pathname) ?? "Dashboard";
  }

  if (secondaryTitles.has(pathname)) {
    return secondaryTitles.get(pathname) ?? "Dashboard";
  }

  if (pathname.startsWith("/admin/database/customers/")) {
    return "Editar";
  }

  return "Dashboard";
}
