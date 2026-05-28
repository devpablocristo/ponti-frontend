import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LotsData, LotsDataUpdate } from "../../../../hooks/useLots/types";
import LotEditDrawer from "./LotEditDrawer";

const hookState = vi.hoisted(() => ({
  crops: [
    { id: 1, name: "Maiz" },
    { id: 2, name: "Soja" },
  ],
  getCrops: vi.fn(),
  createLot: vi.fn(),
  updateLot: vi.fn(),
  updateLotError: null as string | null,
  result: null as string | null,
  processing: false,
}));

vi.mock("../../../../hooks/useLots", () => ({
  default: () => hookState,
}));

vi.mock("../../lots/components/LegacyLotDrawer", () => ({
  LegacyLotDrawer: ({
    open,
    lot,
    onSave,
  }: {
    open: boolean;
    lot: LotsDataUpdate | null;
    onSave: () => void;
  }) =>
    open ? (
      <div data-testid="legacy-lot-drawer">
        {lot?.id === 0 ? "Nuevo lote" : "Editar lote"}
        <button type="button" onClick={onSave}>
          Guardar
        </button>
      </div>
    ) : null,
}));

const newLot: LotsDataUpdate = {
  id: 0,
  field_id: 30,
  project_name: "Proyecto A",
  field_name: "Campo Norte",
  lot_name: "Lote Nuevo",
  previous_crop_id: 1,
  current_crop_id: 2,
  variety: "Mungo",
  sowed_area: "25",
  dates: [],
  season: "Verano",
};

const existingLot: LotsData = {
  id: 40,
  project_id: 10,
  field_id: 30,
  project_name: "Proyecto A",
  field_name: "Campo Norte",
  lot_name: "Lote 1",
  previous_crop: "Maiz",
  previous_crop_id: 1,
  current_crop: "Soja",
  current_crop_id: 2,
  variety: "",
  hectares: "10",
  sowed_area: "10",
  harvested_area: "0",
  dates: [],
  tons: "0",
  yield_tn_per_ha: "0",
  income_net_per_ha: "0",
  cost_usd_per_ha: "0",
  rent_per_ha: "0",
  admin_cost: "0",
  active_total_per_ha: "0",
  operating_result_per_ha: "0",
  season: "Verano",
};

describe("LotEditDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.updateLotError = null;
    hookState.result = null;
    hookState.processing = false;
  });

  it("crea lotes con el drawer real cuando recibe initialLot", async () => {
    render(
      <LotEditDrawer
        open
        lot={null}
        initialLot={newLot}
        seasons={[{ id: 1, name: "Verano" }]}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(hookState.createLot).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 0,
          field_id: 30,
          field_name: "Campo Norte",
          lot_name: "Lote Nuevo",
          previous_crop_id: 1,
          current_crop_id: 2,
          sowed_area: "25",
          season: "Verano",
        }),
      );
      expect(hookState.updateLot).not.toHaveBeenCalled();
    });
  });

  it("edita lotes existentes con el mismo drawer", async () => {
    render(
      <LotEditDrawer
        open
        lot={existingLot}
        seasons={[{ id: 1, name: "Verano" }]}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(hookState.updateLot).toHaveBeenCalledWith(
        expect.objectContaining({ id: 40, lot_name: "Lote 1" }),
      );
      expect(hookState.createLot).not.toHaveBeenCalled();
    });
  });
});
