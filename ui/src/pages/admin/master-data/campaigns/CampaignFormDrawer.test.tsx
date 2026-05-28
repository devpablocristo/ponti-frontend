import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CampaignFormDrawer from "./CampaignFormDrawer";

const mockNotify = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("../../../../lib/notify", () => ({
  notify: mockNotify,
}));

describe("CampaignFormDrawer", () => {
  it("muestra Periodo como label visible y no Nombre", () => {
    render(
      <CampaignFormDrawer
        open
        campaign={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Periodo")).toBeInTheDocument();
    expect(screen.queryByText("Nombre")).not.toBeInTheDocument();
  });

  it("envia el periodo como name tecnico", async () => {
    const onSubmit = vi.fn();
    render(
      <CampaignFormDrawer
        open
        campaign={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "2026-2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear campaña" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: "2026-2027" });
    });
  });

  it("valida periodo obligatorio", async () => {
    const onSubmit = vi.fn();
    render(
      <CampaignFormDrawer
        open
        campaign={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Crear campaña" }));

    await waitFor(() => {
      expect(mockNotify.error).toHaveBeenCalledWith("El periodo es obligatorio.");
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
