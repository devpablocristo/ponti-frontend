import { describe, expect, it } from "vitest";

import { getSidebarTitle } from "./sidebarTitle";

describe("getSidebarTitle", () => {
  it("usa los nombres del menu general sobre rutas existentes de develop", () => {
    expect(getSidebarTitle("/admin/customers")).toBe("Proyectos");
    expect(getSidebarTitle("/admin/products")).toBe("Insumos");
    expect(getSidebarTitle("/admin/database/data-integrity")).toBe("Integridad de Datos");
    expect(getSidebarTitle("/admin/ai-assistant")).toBe("Asistente");
  });

  it("mantiene titulos utiles para rutas de detalle", () => {
    expect(getSidebarTitle("/admin/database/customers/15")).toBe("Editar");
  });
});
