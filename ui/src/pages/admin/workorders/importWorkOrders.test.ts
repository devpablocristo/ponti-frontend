import { describe, expect, it, vi } from "vitest";

import { importWorkOrdersFromCsv } from "./importWorkOrders";

vi.mock("@/api/client", () => {
  // Mockeamos las respuestas reales del BFF para cada endpoint del catálogo.
  // Shapes verificadas con curl contra /api/v1/* el 2026-05-21:
  //   - /fields?project_id=X        → {success, data: {data: [...], total}}
  //   - /lots?project_id=X          → {success, data: {data: [...], page_info}}
  //   - /crops?per_page=N           → {success, data: [...]}
  //   - /projects/X/labors?per_page → {success, data: [...]}
  //   - /investors?per_page=N       → {success, data: {data: [...], total}}
  const responses: Record<string, unknown> = {
    "/fields": {
      success: true,
      data: {
        data: [
          { id: 39, name: "SJDD", project_id: 30 },
          { id: 40, name: "CAMPO ALEGRE", project_id: 30 },
        ],
        total: 2,
      },
    },
    "/lots": {
      success: true,
      data: {
        data: [
          { id: 102, lot_name: "LOTE 54", field_name: "SJDD" },
          { id: 100, lot_name: "LOTE 1", field_name: "CAMPO ALEGRE" },
          { id: 98, lot_name: "LOTE 15B", field_name: "SJDD" },
        ],
        page_info: { total: 3 },
      },
    },
    "/crops": {
      success: true,
      data: [
        { id: 8, name: "Poroto rojo" },
        { id: 9, name: "Poroto Mung" },
        { id: 23, name: "Poroto Alubia" },
      ],
    },
    "/projects/30/labors": {
      success: true,
      data: [
        { id: 137, name: "GESTION DE AGROQ. Y SEMILLAS", category_id: 11 },
        { id: 200, name: "PULVERIZACION TEZ 6.5", category_id: 11 },
      ],
    },
    "/investors": {
      success: true,
      data: {
        data: [
          { id: 1, name: "E.VEDOYA" },
          { id: 2, name: "OLEGA SA" },
        ],
        total: 2,
      },
    },
  };

  const findResponse = (path: string) => {
    const base = path.split("?")[0];
    if (responses[base]) return responses[base];
    if (base.startsWith("/projects/") && base.endsWith("/labors")) {
      return responses["/projects/30/labors"];
    }
    return { success: false };
  };

  return {
    apiClient: {
      get: vi.fn(async (path: string) => findResponse(path)),
      post: vi.fn(async () => ({ success: true })),
    },
  };
});

// CSV con la shape real del export de /admin/work-orders. Headers de 18 cols
// con separador `;` y prefijo `sep=;` BOM (como lo emite el BE).
const CSV_CONTENT = `﻿sep=;
NUMERO DE ORDEN;PROYECTO;CAMPO;LOTE;FECHA;CULTIVO;LABOR;TIPO/CLASE;CONTRATISTA;INVERSOR;SUPERFICIE;INSUMO;CONSUMO;RUBRO;DOSIS;COST U$/HA;PRECIO UNIDAD;TOTAL COSTO
1885.19;JUJUY (MEALLA/ACHERAL);SJDD;LOTE 54;21/04/2026;Poroto rojo;GESTION DE AGROQ. Y SEMILLAS;Labor;VEDOYA;E.VEDOYA;77.00;GESTION DE AGROQ. Y SEMILLAS;0.00;Otras Labores;0.00;0.65;0.65;50.05
1885.18;JUJUY (MEALLA/ACHERAL);SJDD;LOTE 15B;21/04/2026;Poroto Alubia;GESTION DE AGROQ. Y SEMILLAS;Labor;VEDOYA;E.VEDOYA;8.00;GESTION DE AGROQ. Y SEMILLAS;0.00;Otras Labores;0.00;0.65;0.65;5.20
TOTAL;;;;;;;;;;77.00;;0.00;;0.00;0.00;0.00;55.25
`;

describe("importWorkOrdersFromCsv (round-trip /admin/work-orders)", () => {
  it("resuelve nombres del CSV contra catálogos del BFF", async () => {
    const file = { text: () => Promise.resolve(CSV_CONTENT) } as unknown as File;

    const result = await importWorkOrdersFromCsv({
      file,
      projectId: 30,
    });

    // 2 filas válidas + 1 fila TOTAL ignorada → 2 imports exitosos, 0 errores.
    expect(result.errors).toEqual([]);
    expect(result.imported).toBe(2);
  });

  it("reporta diagnóstico claro cuando un catálogo viene vacío", async () => {
    // Mismo CSV pero con un lote que NO existe en el catálogo: debe fallar
    // con el nombre exacto del valor leído (no error genérico).
    const badCsv = `﻿sep=;
NUMERO DE ORDEN;PROYECTO;CAMPO;LOTE;FECHA;CULTIVO;LABOR;TIPO/CLASE;CONTRATISTA;INVERSOR;SUPERFICIE;INSUMO;CONSUMO;RUBRO;DOSIS;COST U$/HA;PRECIO UNIDAD;TOTAL COSTO
1999;PROYECTO X;SJDD;LOTE INEXISTENTE;21/04/2026;Poroto rojo;GESTION DE AGROQ. Y SEMILLAS;Labor;VEDOYA;E.VEDOYA;10.00;;0.00;;0.00;0.65;0.65;6.50
`;
    const file = { text: () => Promise.resolve(badCsv) } as unknown as File;
    const result = await importWorkOrdersFromCsv({ file, projectId: 30 });

    expect(result.imported).toBe(0);
    expect(result.errors.some((e) => e.includes("LOTE INEXISTENTE"))).toBe(true);
  });
});
