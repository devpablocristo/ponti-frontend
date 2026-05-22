const primaryTitles = new Map<string, string>([
  ["/admin/dashboard", "Dashboard"],
  ["/admin/master-data/customers/list", "Clientes y Proyectos"],
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
  ["/admin/master-data/data-integrity", "Integridad de Datos"],
  ["/admin/informes/aportes", "Aportes por Inversor"],
  ["/admin/informes/campo", "Por Campo o Cultivo"],
  ["/admin/informes/resumen", "Resumen de Resultados"],
  ["/admin/master-data/actors", "Todos"],
  ["/admin/master-data/actors/clientes", "Clientes"],
  ["/admin/master-data/actors/inversores", "Inversores"],
  ["/admin/master-data/actors/responsables", "Responsables"],
  ["/admin/master-data/actors/proveedores", "Proveedores"],
  ["/admin/master-data/actors/contratistas", "Contratistas"],
  ["/admin/master-data/actors/duplicates", "Duplicados"],
  ["/admin/master-data/actors/archived", "Archivados"],
  ["/admin/master-data/customers/editor", "Editar"],
  ["/admin/master-data/customers/archived", "Archivados"],
  ["/admin/master-data/projects/archived", "Archivados"],
  ["/admin/master-data/labors", "Crear"],
  ["/admin/master-data/labors/list", "Editar"],
  ["/admin/master-data/labors/archived", "Archivados"],
  ["/admin/master-data/supplies", "Crear"],
  ["/admin/master-data/supplies/list", "Editar"],
  ["/admin/master-data/supplies/archived", "Archivados"],
  ["/admin/supply-movements/archived", "Movimientos Archivados"],
  ["/admin/master-data/investors/create", "Crear"],
  ["/admin/master-data/investors", "Editar"],
  ["/admin/master-data/investors/archived", "Archivados"],
  ["/admin/master-data/managers/create", "Crear"],
  ["/admin/master-data/managers", "Editar"],
  ["/admin/master-data/managers/archived", "Archivados"],
  ["/admin/master-data/campaigns/create", "Crear"],
  ["/admin/master-data/campaigns", "Editar"],
  ["/admin/master-data/campaigns/archived", "Archivados"],
  ["/admin/master-data/lots/archived", "Lotes Archivados"],
  ["/admin/master-data/fields/archived", "Campos Archivados"],
  ["/admin/master-data/work-orders/archived", "Archivados"],
  ["/admin/master-data/dollar", "Cargar Dólar Promedio"],
  ["/admin/master-data/commerce", "Cargar Comercialización"],
]);

export function getSidebarTitle(pathname: string) {
  if (primaryTitles.has(pathname)) {
    return primaryTitles.get(pathname) ?? "Dashboard";
  }

  if (secondaryTitles.has(pathname)) {
    return secondaryTitles.get(pathname) ?? "Dashboard";
  }

  if (pathname.startsWith("/admin/master-data/customers/")) {
    return "Editar";
  }

  return "Dashboard";
}
