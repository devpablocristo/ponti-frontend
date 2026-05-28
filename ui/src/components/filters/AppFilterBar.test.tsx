import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppFilterBar } from "./AppFilterBar";

describe("AppFilterBar", () => {
  const baseFilter = {
    type: "search" as const,
    name: "cliente",
    label: "Cliente",
    options: [{ id: 17, name: "el sueño", displayName: "El Sueño" }],
    value: "",
    onChange: vi.fn(),
    setData: vi.fn(),
  };

  it("shows displayName in suggestions while selecting the original option", () => {
    const onChange = vi.fn();
    const setData = vi.fn();

    render(
      <AppFilterBar
        filters={[
          {
            ...baseFilter,
            onChange,
            setData,
          },
        ]}
      />
    );

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("El Sueño"));

    expect(onChange).toHaveBeenCalledWith("El Sueño");
    expect(setData).toHaveBeenCalledWith({
      id: 17,
      name: "el sueño",
      displayName: "El Sueño",
    });
  });

  it("usa z-dropdown por defecto", () => {
    const { container } = render(<AppFilterBar filters={[baseFilter]} />);

    expect(container.firstElementChild).toHaveClass("z-dropdown");
  });

  it("permite que una fila superior use z-popover sin forzar z-dropdown", () => {
    const { container } = render(<AppFilterBar className="z-popover" filters={[baseFilter]} />);

    expect(container.firstElementChild).toHaveClass("z-popover");
    expect(container.firstElementChild).not.toHaveClass("z-dropdown");
  });

  it("permite ubicar acciones debajo de los filtros", () => {
    render(
      <AppFilterBar
        actionsPlacement="below"
        filters={[baseFilter]}
        actions={[{ label: "Nuevo", onClick: vi.fn(), isPrimary: true }]}
      />,
    );

    const actionContainer = screen.getByRole("button", { name: "Nuevo" }).parentElement;

    expect(actionContainer).toHaveClass("w-full");
    expect(actionContainer).toHaveClass("justify-end");
  });
});
