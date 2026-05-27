import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppFilterBar } from "./AppFilterBar";

describe("AppFilterBar", () => {
  it("muestra el nombre de la opcion seleccionada en filtros select", () => {
    render(
      <AppFilterBar
        filters={[
          {
            type: "select",
            name: "campaña",
            label: "Campaña",
            placeholder: "Seleccione campaña",
            value: 2,
            options: [
              { id: 1, name: "2024-2025" },
              { id: 2, name: "2025-2026" },
            ],
            onChange: vi.fn(),
            setData: vi.fn(),
          },
          {
            type: "select",
            name: "campo",
            label: "Campo",
            placeholder: "Seleccione campo",
            value: 0,
            options: [
              { id: 0, name: "Todos los campos" },
              { id: 7, name: "Campo Alegre" },
            ],
            onChange: vi.fn(),
            setData: vi.fn(),
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("Campaña")).toHaveValue("2025-2026");
    expect(screen.getByLabelText("Campo")).toHaveValue("Todos los campos");
  });

  it("prefiere displayName para no mostrar valores canonicos o ids internos", () => {
    render(
      <AppFilterBar
        filters={[
          {
            type: "select",
            name: "cliente",
            label: "Cliente",
            placeholder: "Buscar",
            value: 10,
            options: [
              { id: 10, name: "agro lajitas 25", displayName: "Agro Lajitas 25" },
            ],
            onChange: vi.fn(),
            setData: vi.fn(),
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("Cliente")).toHaveValue("Agro Lajitas 25");
  });
});
