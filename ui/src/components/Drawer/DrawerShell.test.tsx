import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DrawerShell } from "./DrawerShell";

describe("DrawerShell", () => {
  it("renderiza el drawer en capa modal por encima de dropdowns de fondo", () => {
    render(
      <DrawerShell open onClose={vi.fn()} title="Drawer Test">
        <div>Contenido</div>
      </DrawerShell>,
    );

    const drawer = screen.getByRole("dialog").parentElement;

    expect(drawer).toHaveClass("drawer-root");
    expect(drawer).toHaveClass("z-tooltip");
  });
});
