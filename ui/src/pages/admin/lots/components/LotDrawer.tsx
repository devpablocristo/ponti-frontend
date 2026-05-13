import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import SelectField from "../../../../components/Input/SelectField";
import { Crop, LotDate, LotsDataUpdate } from "../../../../hooks/useLots/types";

type SelectOption = { id: number; name: string };
type LotChangeHandler = <K extends keyof LotsDataUpdate>(
  key: K,
  value: LotsDataUpdate[K]
) => void;

type LotDrawerProps = {
  open: boolean;
  lot: LotsDataUpdate | null;
  selectedFieldName?: string;
  crops: Crop[];
  seasons: SelectOption[];
  processing: boolean;
  errorMessage: string;
  successMessage: string;
  onClose: () => void;
  onDismissError: () => void;
  onDismissSuccess: () => void;
  onLotChange: LotChangeHandler;
  onSave: () => void;
};

function upsertDate(
  dates: LotDate[] | undefined,
  index: number,
  field: "sowing_date" | "harvest_date",
  value: string
): LotDate[] {
  const nextDates = [...(dates ?? [])];
  const current = nextDates[index] ?? {
    sowing_date: "",
    harvest_date: "",
    sequence: index + 1,
  };
  nextDates[index] = {
    ...current,
    [field]: value,
    sequence: index + 1,
  };
  return nextDates;
}

export function LotDrawer({
  open,
  lot,
  selectedFieldName,
  crops,
  seasons,
  processing,
  errorMessage,
  successMessage,
  onClose,
  onDismissError,
  onDismissSuccess,
  onLotChange,
  onSave,
}: LotDrawerProps) {
  const title = lot?.id
    ? `${lot.project_name} (${lot.field_name ?? selectedFieldName}: ${lot.lot_name})`
    : "Nuevo lote";

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={title}
      processing={processing}
      errorMessage={errorMessage || null}
      onDismissError={onDismissError}
      successMessage={successMessage || null}
      onDismissSuccess={onDismissSuccess}
      onSubmit={onSave}
    >
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2].map((index) => (
          <div className="contents" key={index}>
            <div className="w-48">
              <InputField
                label={index === 0 ? "Fecha de siembra" : ""}
                name={`sowingDate${index + 1}`}
                type="date"
                value={lot?.dates?.[index]?.sowing_date || ""}
                onChange={(event) =>
                  onLotChange(
                    "dates",
                    upsertDate(
                      lot?.dates,
                      index,
                      "sowing_date",
                      event.target.value
                    )
                  )
                }
                size="sm"
              />
            </div>
            <div className="w-48">
              <InputField
                label={index === 0 ? "Fecha de cosecha" : ""}
                name={`harvestDate${index + 1}`}
                type="date"
                value={lot?.dates?.[index]?.harvest_date || ""}
                onChange={(event) =>
                  onLotChange(
                    "dates",
                    upsertDate(
                      lot?.dates,
                      index,
                      "harvest_date",
                      event.target.value
                    )
                  )
                }
                size="sm"
              />
            </div>
          </div>
        ))}

        <div className="col-span-2">
          <hr />
        </div>

        <InputField
          label="Lote"
          name="lotName"
          type="text"
          value={lot?.lot_name || ""}
          onChange={(event) => onLotChange("lot_name", event.target.value)}
          size="sm"
        />

        <InputField
          label="Hectáreas"
          name="hectares"
          type="number"
          value={lot?.sowed_area || ""}
          onChange={(event) => onLotChange("sowed_area", event.target.value)}
          size="sm"
        />

        <SelectField
          label="Cultivo Anterior"
          placeholder="Seleccione cultivo"
          name="previousCrop"
          options={crops}
          value={String(lot?.previous_crop_id || "")}
          onChange={(event) =>
            onLotChange("previous_crop_id", Number(event.target.value))
          }
          fullWidth
          size="sm"
        />

        <SelectField
          label="Cultivo Actual"
          placeholder="Seleccione cultivo"
          name="currentCrop"
          options={crops}
          value={String(lot?.current_crop_id || "")}
          onChange={(event) =>
            onLotChange("current_crop_id", Number(event.target.value))
          }
          fullWidth
          size="sm"
        />

        <SelectField
          label="Periodo"
          name="season"
          value={lot?.season || ""}
          onChange={(event) => onLotChange("season", event.target.value)}
          options={seasons}
          fullWidth
          size="sm"
        />

        <InputField
          label="Variedad"
          name="variety"
          type="text"
          value={lot?.variety || ""}
          onChange={(event) => onLotChange("variety", event.target.value)}
          size="sm"
        />
      </div>
    </EntityFormDrawer>
  );
}
