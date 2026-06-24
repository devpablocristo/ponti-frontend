import { CirclePlus, CopyIcon, Trash } from "lucide-react";
import InputField from "../../../../components/Input/InputField";
import SupplyDropdown from "../../../../components/Dropdown/SupplyDropdown";
import Button from "../../../../components/Button/Button";
import { Entity } from "../../../../hooks/useDatabase/options/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import AutocompleteSelect from "./AutocompleteSelect";
import CatalogNameSelect from "./CatalogNameSelect";

export type Plot = {
  id: number;
  name: string;
  hectares: number;
  previousCrop: { id: number; name: string };
  currentCrop: { id: number; name: string };
  season: string;
};

type Lessee = {
  id: number;
  name: string;
  percentage: number;
};

export type Field = {
  id: number;
  name: string;
  leaseType: string;
  leaseTypePercent: number | "";
  leaseTypeValue: number | "";
  lessees: Lessee[];
  plots: Plot[];
};

type Props = {
  fields: Field[];
  lesseeList: Lessee[] | undefined;
  crops: Entity[] | undefined;
  seasons: { name: string; id: number }[];
  rentTypes: Entity[] | undefined;
  setFields: React.Dispatch<React.SetStateAction<Field[]>>;
};

export default function Fields({
  fields,
  lesseeList,
  setFields,
  crops,
  seasons,
  rentTypes,
}: Props) {
  const [showCropModal, setShowCropModal] = useState(false);
  const inputCropRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (showCropModal) {
      setTimeout(() => inputCropRef.current?.focus(), 0);
    }
  }, [showCropModal]);
  const [customCropValue, setCustomCropValue] = useState("");
  const [pendingCropChange, setPendingCropChange] = useState<{
    fieldIndex: number;
    plotIndex: number;
    key: keyof Plot;
  } | null>(null);

  const cropOptions = useMemo(() => {
    const baseOptions =
      crops?.map((crop) => ({
        id: crop.id,
        name: crop.name,
      })) || [];
    return [...baseOptions, { id: -1, name: "No disponible + " }];
  }, [crops]);

  const rentTypesOptions = useMemo(() => {
    return (
      rentTypes?.map((rent) => ({
        id: rent.id,
        name: rent.name,
      })) || []
    );
  }, [rentTypes]);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalLesseeOpen, setModalLesseeOpen] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [modalOpen]);

  const inputLesseeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (modalLesseeOpen) {
      setTimeout(() => inputLesseeRef.current?.focus(), 0);
    }
  }, [modalLesseeOpen]);

  const [leaseTypePercent, setLeaseTypePercent] = useState<number | "">("");
  const [leaseTypeDollar, setLeaseTypeDollar] = useState<number | "">("");

  const [investment, setInvestment] = useState<number | "">("");
  const [investmentError, setInvestmentError] = useState<string>("");

  const [queryLessee, setQueryLessee] = useState<string>("");
  const [pendingLeaseType, setPendingLeaseType] = useState<{
    key: number;
    value: string;
  } | null>(null);

  const [pendingLessee, setPendingLessee] = useState<{
    key: number;
    value: Lessee;
  } | null>(null);

  const handleLeaseTypeChange = (key: number, value: string) => {
    setPendingLeaseType({ key, value });
    setModalOpen(true);
    setLeaseTypePercent("");
    setLeaseTypeDollar("");
  };

  const handleSaveLeaseTypeValue = () => {
    if (pendingLeaseType) {
      const percent =
        leaseTypePercent === "" ? "" : Number(leaseTypePercent);
      const dollar = leaseTypeDollar === "" ? "" : Number(leaseTypeDollar);

      if (
        (percent !== "" && Number.isNaN(percent)) ||
        (dollar !== "" && Number.isNaN(dollar))
      ) {
        return;
      }

      handleFieldChange(
        pendingLeaseType.key,
        "leaseType",
        pendingLeaseType.value
      );
      handleFieldChange(pendingLeaseType.key, "leaseTypePercent", percent);
      handleFieldChange(pendingLeaseType.key, "leaseTypeValue", dollar);
      setModalOpen(false);
    }
    setPendingLeaseType(null);
  };

  const handleFieldChange = (
    fieldIndex: number,
    fieldKey: "name" | "leaseType" | "leaseTypePercent" | "leaseTypeValue" | "lessees",
    value: string | number | Lessee | Lessee[]
  ) => {
    setFields((prevFields) =>
      prevFields.map((field, idx) =>
        idx === fieldIndex ? { ...field, [fieldKey]: value } : field
      )
    );
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        id: 0,
        name: "",
        leaseType: "",
        leaseTypePercent: "",
        leaseTypeValue: "",
        lessees: [],
        plots: [
          {
            id: 0,
            name: "",
            hectares: 0,
            previousCrop: { id: 0, name: "" },
            currentCrop: { id: 0, name: "" },
            season: "",
          },
        ],
      },
    ]);
  };

  const removeField = (fieldIndex: number) => {
    setFields((prevFields) =>
      prevFields.filter((_, idx) => idx !== fieldIndex)
    );
  };

  const addPlotToField = (fieldIndex: number) => {
    const updatedFields = [...fields];
    updatedFields[fieldIndex].plots.push({
      id: 0,
      name: "",
      hectares: 0,
      previousCrop: { id: 0, name: "" },
      currentCrop: { id: 0, name: "" },
      season: "",
    });
    setFields(updatedFields);
  };

  const duplicateLastPlotToField = (fieldIndex: number) => {
    const updatedFields = [...fields];
    const plots = updatedFields[fieldIndex].plots;

    if (plots.length === 0) return;

    const lastPlot = plots[plots.length - 1];
    const duplicatedPlot = { ...lastPlot, id: 0 };

    plots.push(duplicatedPlot);
    setFields(updatedFields);
  };

  const removePlotFromField = (fieldIndex: number, plotIndex: number) => {
    setFields((prevFields) =>
      prevFields.map((field, idx) =>
        idx === fieldIndex
          ? {
              ...field,
              plots: field.plots.filter((_, pIdx) => pIdx !== plotIndex),
            }
          : field
      )
    );
  };

  const handlePlotChange = (
    fieldIndex: number,
    plotIndex: number,
    key: keyof Plot,
    value: string | number
  ) => {
    if ((key === "previousCrop" || key === "currentCrop") && value === "-1") {
      setShowCropModal(true);
      setPendingCropChange({ fieldIndex, plotIndex, key });
      return;
    }

    setFields((prevFields) =>
      prevFields.map((field, fIdx) => {
        if (fIdx !== fieldIndex) return field;
        return {
          ...field,
          plots: field.plots.map((plot, pIdx) => {
            if (pIdx !== plotIndex) return plot;
            if (key === "previousCrop" || key === "currentCrop") {
              const cropOptions = getCropOptionsForPlot(plot[key]);
              const selectedCrop = cropOptions.find(
                (opt: { id: number; name: string }) =>
                  String(opt.id) === String(value)
              );
              return {
                ...plot,
                [key]: selectedCrop || plot[key],
              };
            }
            return {
              ...plot,
              [key]: value,
            };
          }),
        };
      })
    );
  };

  const getCropOptionsForPlot = (plotCrop: { id: number; name: string }) => {
    let options = [...cropOptions];
    if (
      plotCrop &&
      plotCrop.id === 0 &&
      plotCrop.name &&
      !options.some((opt) => opt.name === plotCrop.name)
    ) {
      options = [...options, { id: 0, name: plotCrop.name }];
    }
    return options;
  };

  const handleSaveInvestment = () => {
    if (!pendingLessee || investment === null || investment === undefined) {
      return;
    }

    if (
      typeof investment === "number" &&
      investment >= 1 &&
      investment <= 100
    ) {
      const currentField = fields[pendingLessee.key] || { lessees: [] };
      const currentLessees = currentField.lessees || [];
      const used = currentLessees.reduce((acc, l) => acc + (l.percentage || 0), 0);
      if (used + investment > 100) {
        setInvestmentError(
          "La suma total de los porcentajes de arrendatarios no puede superar 100."
        );
        return;
      }

      const newLessee: Lessee = {
        ...pendingLessee.value,
        percentage: investment || 0,
      };

      // Dedup por id (clave estable): reemplaza el lessee existente si ya estaba.
      const updatedLessees = [
        ...currentLessees.filter((l) => l.id !== newLessee.id),
        newLessee,
      ];

      handleFieldChange(pendingLessee.key || 0, "lessees", updatedLessees);
    } else {
      setInvestmentError("Porcentaje debe ser entre 1 y 100");
      return;
    }

    setModalLesseeOpen(false);
    setInvestment("");
    setPendingLessee(null);
  }

  const handleLesseeSuggestionClick = (key: number, value: Lessee) => {
    setPendingLessee({ key, value });
    setInvestmentError("");
    setModalLesseeOpen(true);
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-4 md:mt-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Campos</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={addField}
          className="gap-2"
          iconRight={<CirclePlus size={16} />}
        >
          Agregar campo
        </Button>
      </div>
      {fields.map((field, key) => (
        <div key={key} className="rounded-lg space-y-4">
          {key > 0 && (
            <hr className="mt-4 col-span-full border-b-0 border-gray-800" />
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 md:items-start gap-3 md:gap-4 relative">
            <CatalogNameSelect
              base="field"
              label="Campo"
              placeholder="Seleccione campo"
              value={field.name}
              onChange={(v) => handleFieldChange(key, "name", v)}
              fullWidth
            />
            <div className="relative">
            <SupplyDropdown
              label="Tipo de Arriendo"
              placeholder="Tipo de Arriendo"
              searchPlaceholder="Buscar tipo..."
              value={field.leaseType || null}
              onSelect={(option) => handleLeaseTypeChange(key, String(option.id))}
              options={rentTypesOptions}
            />
            {((typeof field.leaseTypePercent === "number" &&
              field.leaseTypePercent > 0) ||
              (typeof field.leaseTypeValue === "number" &&
                field.leaseTypeValue > 0)) && (
              <div className="w-fit flex items-center bg-custom-btn mt-3 text-white text-sm font-sm rounded-full px-4 py-1 md:col-start-2">
                <span className="whitespace-nowrap">
                  {[
                    typeof field.leaseTypeValue === "number" &&
                    field.leaseTypeValue > 0
                      ? `${field.leaseTypeValue} USD`
                      : null,
                    typeof field.leaseTypePercent === "number" &&
                    field.leaseTypePercent > 0
                      ? `${field.leaseTypePercent}%`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" + ")}
                </span>
                <button
                  onClick={() => {
                    handleFieldChange(key, "leaseTypePercent", "");
                    handleFieldChange(key, "leaseTypeValue", "");
                    handleFieldChange(key, "leaseType", "");
                  }}
                  className="ml-2 hover:text-red-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
            </div>
            <AutocompleteSelect<Lessee>
            name="lessee"
            label="Arrendatario"
            placeholder="Ingrese nombre"
            options={lesseeList}
            selectedItems={field.lessees || []}
            query={queryLessee}
            setQuery={setQueryLessee}
            handleSuggestionClick={(e) => handleLesseeSuggestionClick(key, e)}
            setItems={(updater) => {
              const prev = field.lessees || [];
              const next =
                typeof updater === "function"
                  ? (updater as (p: Lessee[]) => Lessee[])(prev)
                  : (updater as Lessee[]);
              handleFieldChange(key, "lessees", next);
            }}
            renderTag={(item) => `${item.name} (${item.percentage}%)`}
          />

          </div>
          <div className="space-y-4">
            {field.plots.map((plot, plotkey) => (
              <div
                key={plotkey}
                className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-50 border border-gray-300  p-4 rounded-md relative"
              >
                {field.plots.length > 1 && (
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    onClick={() => removePlotFromField(key, plotkey)}
                    className="absolute top-2 right-2"
                  >
                    <Trash size={12} />
                  </Button>
                )}
                <CatalogNameSelect
                  base="lot"
                  label="Lote"
                  placeholder="Seleccione lote"
                  value={plot.name}
                  onChange={(v) => handlePlotChange(key, plotkey, "name", v)}
                  size="sm"
                  fullWidth
                />
                <InputField
                  label="Hectáreas"
                  placeholder="N°"
                  name="hectares"
                  type="text"
                  value={plot.hectares === 0 ? "" : plot.hectares.toString()}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, ".");
                    if (/^\d*\.?\d{0,3}$/.test(value)) {
                      handlePlotChange(key, plotkey, "hectares", value);
                    }
                  }}
                  size="sm"
                />
                <SupplyDropdown
                  label="Cultivo Anterior"
                  placeholder="Seleccione cultivo"
                  searchPlaceholder="Buscar cultivo..."
                  options={getCropOptionsForPlot(plot.previousCrop)}
                  value={
                    plot.previousCrop.name === "" ? null : plot.previousCrop.id
                  }
                  onSelect={(option) =>
                    handlePlotChange(
                      key,
                      plotkey,
                      "previousCrop",
                      String(option.id)
                    )
                  }
                />
                <SupplyDropdown
                  label="Cultivo Actual"
                  placeholder="Seleccione cultivo"
                  searchPlaceholder="Buscar cultivo..."
                  options={getCropOptionsForPlot(plot.currentCrop)}
                  value={
                    plot.currentCrop.name === "" ? null : plot.currentCrop.id
                  }
                  onSelect={(option) =>
                    handlePlotChange(
                      key,
                      plotkey,
                      "currentCrop",
                      String(option.id)
                    )
                  }
                />
                <SupplyDropdown
                  label="Periodo"
                  searchPlaceholder="Buscar periodo..."
                  value={plot.season || null}
                  onSelect={(option) =>
                    handlePlotChange(key, plotkey, "season", String(option.id))
                  }
                  options={seasons}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 justify-between pt-2">
            <div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => removeField(key)}
                >
                  <Trash size={16} />
                </Button>
              )}
            </div>
            <div className="flex gap-4">
              <Button
                variant="primary"
                size="xs"
                onClick={() => addPlotToField(key)}
                className="gap-2"
                iconRight={<CirclePlus size={16} />}
              >
                Agregar lote
              </Button>
              <Button
                variant="primary"
                size="xs"
                onClick={() => duplicateLastPlotToField(key)}
                className="gap-2"
                iconRight={<CopyIcon size={16} />}
              >
                Duplicar lote
              </Button>
            </div>
          </div>
        </div>
      ))}
      <BaseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          rentTypesOptions.find(
            (opt) => String(opt.id) === String(pendingLeaseType?.value)
          )?.name || ""
        }
        primaryButtonText="Guardar"
        onPrimaryAction={handleSaveLeaseTypeValue}
      >
        <div className="flex flex-col items-center gap-2">
          {pendingLeaseType?.value === "1" ||
          pendingLeaseType?.value === "2" ? (
            <>
              <p>Ingrese el porcentaje:</p>
              <input
                ref={inputRef}
                type="number"
                min="1"
                max="100"
                value={leaseTypePercent}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveLeaseTypeValue();
                  }
                }}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > 100) return;
                  setLeaseTypePercent(e.target.value === "" ? "" : val);
                  setLeaseTypeDollar("");
                }}
                placeholder="Porcentaje"
                className="border rounded px-2 py-1 w-32 text-center"
              />
            </>
          ) : pendingLeaseType?.value === "3" ? (
            <>
              <p>Ingrese el valor en dólares:</p>
              <input
                ref={inputRef}
                type="number"
                min="1"
                value={leaseTypeDollar}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveLeaseTypeValue();
                  }
                }}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLeaseTypeDollar(e.target.value === "" ? "" : val);
                  setLeaseTypePercent("");
                }}
                placeholder="Valor en USD"
                className="border rounded px-2 py-1 w-32 text-center"
              />
            </>
          ) : pendingLeaseType?.value === "4" ? (
            <>
              <p>Ingrese el porcentaje y el valor en dólares:</p>
              <input
                ref={inputRef}
                type="number"
                min="1"
                max="100"
                value={leaseTypePercent}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveLeaseTypeValue();
                  }
                }}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > 100) return;
                  setLeaseTypePercent(e.target.value === "" ? "" : val);
                }}
                placeholder="Porcentaje"
                className="border rounded px-2 py-1 w-32 text-center"
              />
              <input
                type="number"
                min="1"
                value={leaseTypeDollar}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveLeaseTypeValue();
                  }
                }}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLeaseTypeDollar(e.target.value === "" ? "" : val);
                }}
                placeholder="Valor en USD"
                className="border rounded px-2 py-1 w-32 text-center"
              />
            </>
          ) : null}
        </div>
      </BaseModal>
      <BaseModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setCustomCropValue("");
          setPendingCropChange(null);
        }}
        title="Agregar cultivo"
        onPrimaryAction={() => {
          if (pendingCropChange && customCropValue.trim()) {
            setFields((prevFields) =>
              prevFields.map((field, fIdx) =>
                fIdx === pendingCropChange.fieldIndex
                  ? {
                      ...field,
                      plots: field.plots.map((plot, pIdx) =>
                        pIdx === pendingCropChange.plotIndex
                          ? {
                              ...plot,
                              [pendingCropChange.key]: {
                                id: 0,
                                name: customCropValue.trim(),
                              },
                            }
                          : plot
                      ),
                    }
                  : field
              )
            );
          }
          setShowCropModal(false);
          setCustomCropValue("");
          setPendingCropChange(null);
        }}
        onSecondaryAction={() => {
          setShowCropModal(false);
          setCustomCropValue("");
          setPendingCropChange(null);
        }}
        primaryButtonText="Agregar"
        secondaryButtonText="Cancelar"
      >
        <InputField
          label=""
          ref={inputCropRef}
          placeholder="Ingrese nombre"
          name="cropName"
          value={customCropValue}
          onChange={(e) => setCustomCropValue(e.target.value)}
          inputClassName="w-full"
        />
      </BaseModal>
      <BaseModal
        isOpen={modalLesseeOpen}
        onClose={() => setModalLesseeOpen(false)}
        title={`Aporte para ${pendingLessee?.value.name || ""}`}
        primaryButtonText="Guardar"
        onPrimaryAction={handleSaveInvestment}
      >
        <div className="flex flex-col items-center gap-2">
          <p>Ingresá el porcentaje de aporte al proyecto:</p>
          <input
            ref={inputLesseeRef}
            type="number"
            min="1"
            max="100"
            value={investment}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveInvestment();
              }
            }}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val > 100) return;
              setInvestment(e.target.value === "" ? "" : val);
            }}
            placeholder="Porcentaje"
            className="border rounded px-2 py-1 w-32 text-center"
          />
          <p className="text-sm text-red-700">{investmentError}</p>
        </div>
      </BaseModal>
    </div>
  );
}
