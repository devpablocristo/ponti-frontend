const titles = new Map<string, string>([
  ["/admin/dashboard", "Dashboard"],
  ["/admin/customers", "Proyectos"],
  ["/admin/lots", "Lotes"],
  ["/admin/work-orders", "Órdenes de Trabajo"],
  ["/admin/tasks", "Labores"],
  ["/admin/products", "Insumos"],
  ["/admin/stock", "Stock"],
  ["/admin/database/data-integrity", "Integridad de Datos"],
  ["/admin/informes/aportes", "Aportes por Inversor"],
  ["/admin/informes/campo", "Por Campo o Cultivo"],
  ["/admin/informes/resumen", "Resumen de Resultados"],
  ["/admin/database/customers", "Administrar Clientes"],
  ["/admin/database/customers/archived", "Clientes Archivados"],
  ["/admin/database/projects/archived", "Proyectos Archivados"],
  ["/admin/database/tasks", "Crear Labor"],
  ["/admin/database/tasks/list", "Administrar Labores"],
  ["/admin/database/items", "Crear Insumo"],
  ["/admin/database/items/list", "Administrar Insumos"],
  ["/admin/database/dollar", "Cargar Dólar Promedio"],
  ["/admin/database/commerce", "Cargar Comercialización"],
  ["/admin/access", "Accesos"],
  ["/admin/ai-assistant", "Asistente"],
  ["/admin/notifications", "Notificaciones"],
]);

export function getSidebarTitle(pathname: string) {
  if (titles.has(pathname)) {
    return titles.get(pathname) ?? "Dashboard";
  }

  if (pathname.startsWith("/admin/database/customers/")) {
    return "Editar";
  }

  return "Dashboard";
}

