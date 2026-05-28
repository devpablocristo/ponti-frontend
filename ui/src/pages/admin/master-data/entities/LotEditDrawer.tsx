import { useCallback, useEffect, useState } from "react";

import useLots from "../../../../hooks/useLots";
import type { LotDate, LotsData, LotsDataUpdate } from "../../../../hooks/useLots/types";
import { LegacyLotDrawer } from "../../lots/components/LegacyLotDrawer";

type LotEditDrawerProps = {
  open: boolean;
  lot: LotsData | null;
  initialLot?: LotsDataUpdate | null;
  seasons: { id: number; name: string }[];
  selectedFieldName?: string;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
};

function toEditableLot(lot: LotsData | LotsDataUpdate | null): LotsDataUpdate | null {
  if (!lot) return null;
  return {
    id: lot.id,
    field_id: lot.field_id,
    project_name: lot.project_name,
    field_name: lot.field_name,
    lot_name: lot.lot_name,
    previous_crop_id: lot.previous_crop_id,
    current_crop_id: lot.current_crop_id,
    variety: lot.variety,
    sowed_area: lot.sowed_area ?? ("hectares" in lot ? lot.hectares : "") ?? "",
    dates: lot.dates,
    season: lot.season,
    updated_at: lot.updated_at ?? new Date().toISOString(),
  };
}

function hasPositiveDecimal(value: string | null | undefined) {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0;
}

export default function LotEditDrawer({
  open,
  lot,
  initialLot = null,
  seasons,
  selectedFieldName,
  onClose,
  onSaved,
}: LotEditDrawerProps) {
  const {
    crops,
    getCrops,
    createLot,
    updateLot,
    updateLotError,
    result,
    processing,
  } = useLots();
  const [editableLot, setEditableLot] = useState<LotsDataUpdate | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setEditableLot(toEditableLot(lot ?? initialLot));
    setErrorMessage("");
    setSuccessMessage("");
    void getCrops();
  }, [getCrops, initialLot, lot, open]);

  useEffect(() => {
    if (updateLotError) {
      setErrorMessage(updateLotError);
      setSuccessMessage("");
    }
  }, [updateLotError]);

  useEffect(() => {
    if (!result) return;
    setSuccessMessage(result);
    setErrorMessage("");
    void onSaved?.();
  }, [onSaved, result]);

  const handleLotChange = useCallback(
    <K extends keyof LotsDataUpdate>(key: K, value: LotsDataUpdate[K]) => {
      setEditableLot((previousLot) => ({
        ...previousLot,
        id: previousLot?.id || 0,
        lot_name: previousLot?.lot_name || "",
        field_id: previousLot?.field_id || 0,
        previous_crop_id: previousLot?.previous_crop_id || 0,
        current_crop_id: previousLot?.current_crop_id || 0,
        variety: previousLot?.variety || "",
        sowed_area: previousLot?.sowed_area || "",
        dates: previousLot?.dates || [],
        season: previousLot?.season || "",
        [key]: value,
        updated_at: previousLot?.updated_at || new Date().toISOString(),
      }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!editableLot) return;

    const invalidDate = editableLot.dates?.find(
      (date: LotDate) =>
        date?.harvest_date && (!date.sowing_date || date.sowing_date === ""),
    );
    if (invalidDate) {
      setErrorMessage("Si hay fecha de cosecha, debe cargar también la fecha de siembra.");
      return;
    }

    if (!editableLot.lot_name.trim()) {
      setErrorMessage("Nombre de lote obligatorio.");
      return;
    }

    if (!editableLot.field_id) {
      setErrorMessage("Seleccione un campo para guardar el lote.");
      return;
    }

    if (!hasPositiveDecimal(editableLot.sowed_area)) {
      setErrorMessage("Hectáreas obligatorias.");
      return;
    }

    if (!editableLot.previous_crop_id) {
      setErrorMessage("Cultivo anterior obligatorio.");
      return;
    }

    if (!editableLot.current_crop_id) {
      setErrorMessage("Cultivo actual obligatorio.");
      return;
    }

    if (!editableLot.season) {
      setErrorMessage("Periodo obligatorio.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    if (editableLot.id > 0) {
      void updateLot({ ...editableLot });
      return;
    }
    void createLot({ ...editableLot });
  }, [createLot, editableLot, updateLot]);

  return (
    <LegacyLotDrawer
      open={open}
      lot={editableLot}
      selectedFieldName={selectedFieldName}
      crops={crops}
      seasons={seasons}
      processing={processing}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onClose={onClose}
      onDismissError={() => setErrorMessage("")}
      onDismissSuccess={() => setSuccessMessage("")}
      onLotChange={handleLotChange}
      onSave={handleSave}
    />
  );
}
