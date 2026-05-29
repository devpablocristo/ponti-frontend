import { AlertCircle, CheckCircle, LoaderCircle, X } from "lucide-react";
import type { ReactNode } from "react";

import Button from "../../../../components/Button/Button";
import Drawer from "../../../../components/Drawer/Drawer";
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

function AlertMessage({
  tone,
  children,
  onDismiss,
}: {
  tone: "error" | "success";
  children: ReactNode;
  onDismiss: () => void;
}) {
  const isError = tone === "error";
  const className = isError
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";
  const iconClassName = isError ? "text-red-500" : "text-emerald-500";
  const buttonClassName = isError
    ? "text-red-400 hover:text-red-600"
    : "text-emerald-400 hover:text-emerald-600";

  return (
    <div
      className={`mb-4 flex items-center gap-3 rounded-xl border p-4 text-sm ${className}`}
      role="alert"
    >
      {isError ? (
        <AlertCircle className={`h-5 w-5 flex-shrink-0 ${iconClassName}`} />
      ) : (
        <CheckCircle className={`h-5 w-5 flex-shrink-0 ${iconClassName}`} />
      )}
      <div className="flex-1">{children}</div>
      <button
        type="button"
        className={`transition-colors ${buttonClassName}`}
        aria-label="Cerrar mensaje"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

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
  return (
    <Drawer open={open} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex h-full flex-col">
        <h2 className="mb-4 text-lg font-semibold">
          {lot?.project_name} ({lot?.field_name ?? selectedFieldName}:{" "}
          {lot?.lot_name})
        </h2>
        {processing ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm">
            <LoaderCircle className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <form className="flex-1 space-y-4">
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
                  onChange={(event) =>
                    onLotChange("lot_name", event.target.value)
                  }
                  size="sm"
                />

                <InputField
                  label="Hectáreas"
                  name="hectares"
                  type="number"
                  value={lot?.sowed_area || ""}
                  onChange={(event) =>
                    onLotChange("sowed_area", event.target.value)
                  }
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
                  onChange={(event) =>
                    onLotChange("variety", event.target.value)
                  }
                  size="sm"
                />
              </div>

              {errorMessage ? (
                <AlertMessage tone="error" onDismiss={onDismissError}>
                  <span className="font-semibold">Error:</span> {errorMessage}
                </AlertMessage>
              ) : null}

              {successMessage ? (
                <AlertMessage tone="success" onDismiss={onDismissSuccess}>
                  <span className="font-semibold">{successMessage}</span>
                </AlertMessage>
              ) : null}
            </form>

            <div className="mt-auto flex justify-end gap-2 bg-white pt-6">
              <Button
                variant="primary"
                className="text-base font-medium"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="text-base font-medium"
                onClick={onSave}
              >
                Guardar
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
