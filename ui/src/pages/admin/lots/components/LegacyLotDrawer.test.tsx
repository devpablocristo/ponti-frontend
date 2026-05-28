import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LotsDataUpdate } from "../../../../hooks/useLots/types";
import { LegacyLotDrawer } from "./LegacyLotDrawer";

const newLot: LotsDataUpdate = {
  id: 0,
  field_id: 30,
  project_name: "Proyecto A",
  field_name: "Campo Alegre",
  lot_name: "",
  previous_crop_id: 0,
  current_crop_id: 0,
  variety: "",
  sowed_area: "",
  dates: [],
  season: "",
};

const crops = [
  { id: 1, name: "Poroto Rojo" },
  { id: 2, name: "Poroto Mung" },
  { id: 3, name: "Maiz" },
];

function renderDrawer(overrides?: {
  lot?: LotsDataUpdate;
  onLotChange?: ReturnType<typeof vi.fn>;
  seasons?: Array<{ id: number; name: string }>;
}) {
  const onLotChange = overrides?.onLotChange ?? vi.fn();
  const view = render(
    <LegacyLotDrawer
      open
      lot={overrides?.lot ?? newLot}
      selectedFieldName="Campo Alegre"
      crops={crops}
      seasons={overrides?.seasons ?? []}
      processing={false}
      errorMessage=""
      successMessage=""
      onClose={vi.fn()}
      onDismissError={vi.fn()}
      onDismissSuccess={vi.fn()}
      onLotChange={onLotChange}
      onSave={vi.fn()}
    />,
  );
  return { ...view, onLotChange };
}

describe("LegacyLotDrawer", () => {
  it("muestra Nuevo Lote sin contexto al crear", () => {
    renderDrawer();

    expect(screen.getByText("Nuevo Lote")).toBeInTheDocument();
    expect(screen.queryByText(/Campo Alegre/i)).not.toBeInTheDocument();
  });

  it("busca y selecciona cultivo anterior por id", async () => {
    const onLotChange = vi.fn();
    renderDrawer({ onLotChange });

    const previousCrop = screen.getByLabelText("Cultivo Anterior");
    fireEvent.focus(previousCrop);
    fireEvent.change(previousCrop, { target: { value: "mung" } });
    fireEvent.click(await screen.findByText("Poroto Mung"));

    expect(onLotChange).toHaveBeenCalledWith("previous_crop_id", 2);
  });

  it("busca y selecciona cultivo actual por id", async () => {
    const onLotChange = vi.fn();
    renderDrawer({ onLotChange });

    const currentCrop = screen.getByLabelText("Cultivo Actual");
    fireEvent.focus(currentCrop);
    fireEvent.change(currentCrop, { target: { value: "roj" } });
    fireEvent.click(await screen.findByText("Poroto Rojo"));

    expect(onLotChange).toHaveBeenCalledWith("current_crop_id", 1);
  });

  it("al cambiar periodo pide confirmacion antes de rotar cultivos", () => {
    const onLotChange = vi.fn();
    const { container } = renderDrawer({
      onLotChange,
      seasons: [
        { id: 1, name: "Otoño" },
        { id: 4, name: "Verano" },
      ],
      lot: {
        ...newLot,
        previous_crop_id: 1,
        current_crop_id: 2,
        season: "4",
      },
    });

    const period = container.querySelector<HTMLSelectElement>('select[name="season"]');
    if (!period) throw new Error("No se encontró el selector de periodo.");
    fireEvent.change(period, { target: { value: "1" } });

    expect(screen.getByText("Confirmar cambio de período")).toBeInTheDocument();
    expect(onLotChange).not.toHaveBeenCalled();

    const modal = screen.getByText("Confirmar cambio de período").closest("#popup-modal");
    if (!modal) throw new Error("No se encontró el modal de confirmación.");
    fireEvent.click(within(modal as HTMLElement).getByRole("button", { name: "Cancelar" }));

    expect(onLotChange).not.toHaveBeenCalled();
  });

  it("confirmar cambio de periodo rota cultivos y permite deshacer", () => {
    const onLotChange = vi.fn();
    const { container } = renderDrawer({
      onLotChange,
      seasons: [
        { id: 1, name: "Otoño" },
        { id: 4, name: "Verano" },
      ],
      lot: {
        ...newLot,
        previous_crop_id: 1,
        current_crop_id: 2,
        season: "4",
      },
    });

    const period = container.querySelector<HTMLSelectElement>('select[name="season"]');
    if (!period) throw new Error("No se encontró el selector de periodo.");
    fireEvent.change(period, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onLotChange).toHaveBeenNthCalledWith(1, "previous_crop_id", 2);
    expect(onLotChange).toHaveBeenNthCalledWith(2, "current_crop_id", 0);
    expect(onLotChange).toHaveBeenNthCalledWith(3, "season", "1");

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(onLotChange).toHaveBeenNthCalledWith(4, "previous_crop_id", 1);
    expect(onLotChange).toHaveBeenNthCalledWith(5, "current_crop_id", 2);
    expect(onLotChange).toHaveBeenNthCalledWith(6, "season", "4");
  });
});
