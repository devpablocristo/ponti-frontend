import { useEffect, useState } from "react";
import InputField from "../../../../components/Input/InputField";
import Button from "../../../../components/Button/Button";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import useProjects from "../../../../hooks/useDatabase/projects";
import useCommercializations from "../../../../hooks/useCommercializations";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { notify } from "@/lib/notify";

interface Commerce {
  id: number;
  cropId: number;
  cropName: string;
  boardPrice: string;
  freightCost: string;
  commercialCost: string;
  netWorth: string;
}

export default function CommerceForm() {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) notify.error(errorMessage);
  }, [errorMessage]);
  useEffect(() => {
    if (successMessage) notify.success(successMessage);
  }, [successMessage]);
  const [projectCropList, setProjectCropList] = useState<
    { id: number; name: string }[]
  >([]);

  const {
    getProject,
    selectedProject,
    processing: processingProjects,
  } = useProjects();

  const {
    saveCommercializations,
    getCommercializations,
    processing,
    error,
    result,
    commercializations,
  } = useCommercializations();
  const [rows, setRows] = useState<Commerce[]>([]);

  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
  ]);

useEffect(() => {
  if (!projectId) {
    setErrorMessage("Por favor, seleccione un proyecto y campaña.");
    return;
  }

  setRows([]);
  setProjectCropList([]);
  getProject(projectId);
}, [projectId, getProject]);

  useEffect(() => {
    if (!projectId) {
      setErrorMessage("Por favor, seleccione un proyecto y campaña.");
      return;
    }

    getCommercializations(projectId);
    setErrorMessage("");
  }, [projectId, getCommercializations]);

  useEffect(() => {
    if (!selectedProject) return;
    const crops = selectedProject.fields.flatMap((field) =>
      field.lots.map((lot) => ({
        id: lot.current_crop_id,
        name: lot.current_crop_name || "",
      }))
    );

    const uniqueCrops = crops.filter(
      (crop, index, self) => index === self.findIndex((c) => c.id === crop.id)
    );

    setProjectCropList(uniqueCrops);
  }, [selectedProject]);

useEffect(() => {
  if (!projectCropList.length || processing) {
    return;
  }

  setRows(
    projectCropList.map((crop) => {
      const found = commercializations.find((ci) => ci.crop_id === crop.id);

      return {
        id: found?.id || 0,
        cropId: crop.id,
        cropName: crop.name,
        boardPrice: found?.board_price || "",
        freightCost: found?.freight_cost || "",
        commercialCost: found?.commercial_cost || "",
        netWorth: found?.net_price || "",
      };
    })
  );
}, [projectCropList, commercializations, processing]);

useEffect(() => {
  if (!result) {
    return;
  }

  setErrorMessage("");
  setSuccessMessage(result);

  if (projectId) {
    getCommercializations(projectId);
  }
}, [result, projectId, getCommercializations]);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setSuccessMessage(null);
    }
  }, [error]);

  const handleChange = (index: number, field: string, value: string) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
  };

  function hasIncompleteRows(rows: Commerce[]) {
    const hasPartial = rows.some(
      (item) =>
        !item.cropId ||
        !item.boardPrice ||
        !item.freightCost ||
        !item.commercialCost
    );

    if (hasPartial) {
      return true;
    }

    return false;
  }

  const handleSaveCommerceValues = () => {
    if (!projectId) {
      setErrorMessage("Por favor, seleccione un proyecto y campaña.");
      return;
    }

    setErrorMessage("");
    const itemsWithAnyValue = rows.filter(
      (item) => item.boardPrice || item.freightCost || item.commercialCost
    );

    if (hasIncompleteRows(itemsWithAnyValue)) {
      setErrorMessage(
        "Por favor, complete todos los campos del registro antes de guardar."
      );
      return;
    }

    if (itemsWithAnyValue.length === 0) {
      setErrorMessage(
        "Por favor, ingrese al menos un cultivo antes de guardar."
      );
      return;
    }

    const commerceData = itemsWithAnyValue.map((row) => ({
      id: row.id,
      crop_id: row.cropId,
      board_price: row.boardPrice,
      freight_cost: row.freightCost,
      commercial_cost: row.commercialCost,
    }));

    saveCommercializations(commerceData, projectId);
  };

  return (
    <div className="w-full mx-auto">
      <AppFilterBar filters={filters} />
      <div className="mt-4 p-6 w-full mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h1 className="text-custom-text font-semibold text-xl leading-none">
          Datos de comercialización por cultivo
        </h1>
        {processingProjects || processing ? (
          <LoadingOverlay show />
        ) : (
          <div className="mt-1">
            <div className="w-full px-4 py-6">
              <div>
                <div className="hidden sm:grid grid-cols-[0.5fr_0.5fr_0.5fr_0.5fr_0.5fr] gap-4 mb-2">
                  <span className="font-medium">Cultivo</span>
                  <span className="font-medium">Precio pizarra</span>
                  <span className="font-medium">Costo flete</span>
                  <span className="font-medium">Gastos comerciales</span>
                  <span className="font-medium">Precio neto</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[0.5fr_0.5fr_0.5fr_0.5fr_0.5fr] gap-4">
                  {rows.map((crop, index) => (
                    <div
                      key={crop.cropId}
                      className="sm:contents border sm:border-0 p-4 sm:p-0 rounded-md sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none"
                    >
                      <div className="sm:col-span-1">
                        <label className="sm:hidden text-sm text-gray-600 dark:text-gray-300">
                          Cultivo
                        </label>
                        <InputField
                          label=""
                          name={`crop-${index}`}
                          value={crop.cropName}
                          onChange={() => {}}
                          disabled
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="sm:hidden text-sm text-gray-600 dark:text-gray-300">
                          Precio pizarra
                        </label>
                        <InputField
                          label=""
                          name={`price-${index}`}
                          value={crop.boardPrice}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, ".");
                            if (/^\d*\.?\d{0,2}$/.test(value)) {
                              handleChange(index, "boardPrice", value);
                            }
                          }}
                          placeholder="u$s"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="sm:hidden text-sm text-gray-600 dark:text-gray-300">
                          Costo flete
                        </label>
                        <InputField
                          label=""
                          name={`cost-${index}`}
                          value={crop.freightCost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, ".");
                            if (/^\d*\.?\d{0,2}$/.test(value)) {
                              handleChange(index, "freightCost", value);
                            }
                          }}
                          placeholder="u$s"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="sm:hidden text-sm text-gray-600 dark:text-gray-300">
                          Gastos comerciales %
                        </label>
                        <InputField
                          label=""
                          name={`expenses-${index}`}
                          value={crop.commercialCost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, ".");
                            if (/^\d*\.?\d{0,2}$/.test(value)) {
                              handleChange(index, "commercialCost", value);
                            }
                          }}
                          placeholder="%"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="sm:hidden text-sm text-gray-600 dark:text-gray-300">
                          Precio neto
                        </label>
                        <InputField
                          label=""
                          name={`netWorth-${index}`}
                          value={crop.netWorth}
                          onChange={() => {}}
                          disabled
                          placeholder="u$s"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-4 my-4 justify-end">
        <Button variant="primary" className="text-base font-medium">
          Cancelar
        </Button>
        <Button
          onClick={handleSaveCommerceValues}
          disabled={processing || processingProjects || !selectedProject}
          variant="primary"
          className="text-base font-medium"
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
