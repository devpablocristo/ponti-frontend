import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import { apiClient } from "@/api/client";
import Button from "../../../../components/Button/Button";
import { DrawerShell, DrawerSection } from "../../../../components/Drawer/DrawerShell";
import InputField from "../../../../components/Input/InputField";
import SmartEntityInput from "../../../../components/SmartEntityInput/SmartEntityInput";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import type { LotsData } from "../../../../hooks/useLots/types";
import { formatError } from "../../../../lib/format";
import { notify } from "../../../../lib/notify";
import { collapseInternalSpaces, formatEntityDisplayName } from "../../../../lib/properName";

type FieldOption = {
  id: number;
  name: string;
};

export type LotBasicDrawerProps = {
  open: boolean;
  mode: "create" | "edit";
  lot: LotsData | null;
  fieldId?: number | null;
  fields?: FieldOption[];
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
};

function decimalString(value: unknown, fallback = "0") {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  return normalized || fallback;
}

function numericId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function buildLotPayload(input: { name: string; fieldId: number; lot?: LotsData | null }) {
  const lot = input.lot;
  const sowedArea = decimalString(lot?.sowed_area ?? lot?.hectares);

  return {
    name: input.name,
    lot_name: input.name,
    field_id: input.fieldId,
    hectares: sowedArea,
    sowed_area: sowedArea,
    previous_crop_id: numericId(lot?.previous_crop_id),
    current_crop_id: numericId(lot?.current_crop_id),
    season: lot?.season ?? "",
    variety: lot?.variety ?? "",
    dates: lot?.dates ?? [],
    updated_at: lot?.updated_at,
  };
}

export default function LotBasicDrawer({
  open,
  mode,
  lot,
  fieldId,
  fields = [],
  onClose,
  onSaved,
}: LotBasicDrawerProps) {
  const [lotName, setLotName] = useState(lot?.lot_name ?? "");
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(
    lot?.field_id ?? fieldId ?? null
  );
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;
  const title = mode === "edit" ? "Editar Lote" : "Nuevo Lote";

  useEffect(() => {
    if (!open) return;
    setLotName(lot?.lot_name ?? "");
    setSelectedFieldId(lot?.field_id ?? fieldId ?? null);
    setWarning(null);
  }, [fieldId, lot?.field_id, lot?.lot_name, open]);

  const setWarningAndNotify = (message: string) => {
    setWarning(message);
    notify.error(message);
  };

  const handleSave = async () => {
    const name = collapseInternalSpaces(lotName);
    setWarning(null);

    if (!name) {
      setWarningAndNotify("Lote: ingresá un nombre.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "edit") {
        if (!lot?.id || !lot.field_id) {
          setWarningAndNotify("No se encontró el lote completo para guardar.");
          return;
        }
        await apiClient.put(
          `/lots/${lot.id}`,
          buildLotPayload({ name, fieldId: lot.field_id, lot })
        );
        notify.success("Lote actualizado.");
      } else {
        if (!selectedFieldId) {
          setWarningAndNotify("Seleccioná un campo antes de crear el lote.");
          return;
        }
        await apiClient.post("/lots", buildLotPayload({ name, fieldId: selectedFieldId }));
        notify.success("Lote creado.");
      }

      await onSaved?.();
      onClose();
    } catch (error) {
      const message = formatError(error, { fallback: "No se pudo guardar el lote." });
      setWarning(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Save className="h-4 w-4" />}
            onClick={handleSave}
            disabled={saving}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <div className="relative">
        <LoadingOverlay show={saving} />
        <DrawerSection title="Lote">
          <div className="space-y-3">
            {warning ? (
              <div
                role="alert"
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
              >
                {warning}
              </div>
            ) : null}
            {mode === "edit" ? (
              <InputField
                label="Campo"
                name="lot-field-context"
                value={formatEntityDisplayName(lot?.field_name ?? "")}
                onChange={() => undefined}
                disabled
                fullWidth
              />
            ) : (
              <SmartEntityInput<FieldOption>
                label="Campo"
                name="lot-basic-field"
                value={selectedField?.name ?? ""}
                options={fields}
                entityLabel="Campo"
                selectionOnly
                required
                placeholder="Seleccionar campo"
                onChange={() => undefined}
                onSelectExisting={(option) => setSelectedFieldId(option.id)}
              />
            )}
            <InputField
              label="Nombre del lote"
              name="lot-basic-name"
              value={lotName}
              onChange={(event) => setLotName(event.target.value)}
              required
              fullWidth
            />
          </div>
        </DrawerSection>
      </div>
    </DrawerShell>
  );
}
