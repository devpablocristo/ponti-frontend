import { useEffect, useMemo, useState } from "react";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import useSupplies from "../../../../hooks/useSupplies";
import { DataTable, usePagination } from "@/lib/dataDisplay";
import { Supply, SuppliesMode } from "../../../../hooks/useSupplies/types";
import Button from "../../../../components/Button/Button";
import { Column } from "../../types";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import InputField from "../../../../components/Input/InputField";
import SupplyDropdown from "../../../../components/Dropdown/SupplyDropdown";
import { units } from "../../../../constants/units";
import useCategories from "../../../../hooks/useCategories";
import { apiClient } from "@/api/client";
import { useSearchParams } from "react-router-dom";
import { matchesSelectFilter, matchesTextFilter } from "@/lib/tableFilters";

const renderPriceCell = (value: unknown, row: Supply) => (
  <div className="flex items-center gap-2">
    <strong>{String(value)}</strong>
    {row.is_partial_price ? (
      <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-300">
        Parcial
      </span>
    ) : null}
  </div>
);

export default function ListItems() {
  const {
    getSupplies,
    error,
    supplies,
    updateSupply,
    completePendingSupply,
    deleteSupply,
    archiveSupply,
    getWorkOrdersCount,
    processing,
    errorUpdate,
  } = useSupplies();
  const { categories, types, getCategories, getTypes } = useCategories();

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
    count: number;
  } | null>(null);
  const [item, setItem] = useState<Supply | null>(null);
  const pagination = usePagination({ perPage: 10 });
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const [searchParams] = useSearchParams();
const [suppliesMode, setSuppliesMode] = useState<SuppliesMode>(
  searchParams.get("mode") === "pending" ? "pending" : "all"
);

  const { filters, projectId } = useWorkspaceFilters(["customer", "project", "campaign"]);

  useEffect(() => {
    if (projectId) {
      getSupplies(projectId, suppliesMode);
      getCategories("");
      getTypes();
    }
  }, [projectId, suppliesMode, getSupplies, getCategories, getTypes]);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setSuccessMessage(null);
    }
  }, [error]);

  useEffect(() => {
    if (errorUpdate) {
      setErrorMessage(errorUpdate);
      setSuccessMessage(null);
    }
  }, [errorUpdate]);

  const applyColumnFilters = (
    data: Supply[],
    activeFilters: Record<string, unknown>,
    excludeKey?: string
  ) => {
    return data.filter((supply) =>
      Object.entries(activeFilters).every(([key, value]) => {
        if (key === excludeKey) return true;
        if (value === undefined || value === null || value === "") return true;
        if (key === "price") {
          const status = supply.is_partial_price ? "Parcial" : "Final";
          if (Array.isArray(value)) {
            if (value.length === 0) return true;
            return matchesSelectFilter(status, value);
          }
          return matchesTextFilter(status, value);
        }

        const currentValue = supply[key as keyof Supply];
        if (Array.isArray(value)) {
          if (value.length === 0) return true;
          return matchesSelectFilter(currentValue, value);
        }
        return matchesTextFilter(currentValue, value);
      })
    );
  };

  const filteredSupplies = useMemo(() => {
    return applyColumnFilters(supplies || [], columnsFilters);
  }, [supplies, columnsFilters]);

  const columns = useMemo<Column<Supply>[]>(() => {
    const nameOptions = [
      ...new Set(
        applyColumnFilters(supplies || [], columnsFilters, "name")
          .map((s) => s.name)
          .filter(Boolean)
      ),
    ].sort() as string[];

    const unitOptions = [
      ...new Set(
        applyColumnFilters(supplies || [], columnsFilters, "unit_name")
          .map((s) => s.unit_name)
          .filter(Boolean)
      ),
    ].sort() as string[];

    const categoryOptions = [
      ...new Set(
        applyColumnFilters(supplies || [], columnsFilters, "category_name")
          .map((s) => s.category_name)
          .filter(Boolean)
      ),
    ].sort() as string[];

    const typeOptions = [
      ...new Set(
        applyColumnFilters(supplies || [], columnsFilters, "type_name")
          .map((s) => s.type_name)
          .filter(Boolean)
      ),
    ].sort() as string[];

    const priceStatusOptions = [
      ...new Set(
        applyColumnFilters(supplies || [], columnsFilters, "price").map((s) =>
          s.is_partial_price ? "Parcial" : "Final"
        )
      ),
    ] as string[];

    return [
      {
        key: "name",
        header: "Nombre",
        render: (value) => <strong className="text-blue-700">{String(value ?? "")}</strong>,
        filterType: "select",
        filterOptions: nameOptions,
      },
      {
        key: "unit_name",
        header: "Unidad",
        render: (value) => String(value ?? "") || "-",
        filterType: "select",
        filterOptions: unitOptions,
      },
      {
        key: "price",
        header: "Precio",
        render: (value, row) => renderPriceCell(value, row),
        filterType: "select",
        filterOptions: priceStatusOptions,
      },
      {
        key: "category_name",
        header: "Rubro",
        render: (value) => String(value ?? ""),
        filterType: "select",
        filterOptions: categoryOptions,
      },
      {
        key: "type_name",
        header: "Tipo/Clase",
        render: (value) => String(value ?? ""),
        filterType: "select",
        filterOptions: typeOptions,
      },
    ];
  }, [supplies, columnsFilters]);

  const handleFilterChange = (filters: Record<string, unknown>) => {
    const nextFilters = { ...filters };
    if (Array.isArray(nextFilters.price) && nextFilters.price.length > 1) {
      nextFilters.price = [nextFilters.price[nextFilters.price.length - 1]];
    }

    setColumnsFilters(nextFilters);
    pagination.resetPage();
  };

  const handleDelete = async (supplyItem: Supply) => {
    const count = await getWorkOrdersCount(supplyItem.id);
    setDeleteTarget({ id: supplyItem.id, name: supplyItem.name, count });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !projectId) return;
    setErrorMessage("");
    setSuccessMessage(null);
    setDeleteModalOpen(false);
    setDeleteTarget(null);

    const targetId = deleteTarget.id;
    const result = await deleteSupply(targetId);

    if (result === "deleted") {
      setSuccessMessage("Se ha eliminado el insumo con éxito!");
      getSupplies(projectId, suppliesMode);

      setTimeout(() => {
        const totalAfterDelete = supplies.length - 1;
        pagination.clampPageForTotal(totalAfterDelete);
      }, 200);
      return;
    }

    if (result === "in_use") {
      // El insumo tiene registros activos (órdenes, ingresos o remitos en uso).
      // No se archiva: el usuario debe quitar primero esos registros activos.
      setErrorMessage(
        "El insumo está en uso. Eliminá los registros activos (órdenes, ingresos o remitos) antes de eliminarlo."
      );
      return;
    }

    if (result === "conflict") {
      // El insumo solo tiene historial (registros ya eliminados) y no puede
      // eliminarse físicamente. Se archiva en su lugar para conservar el historial.
      const archived = await archiveSupply(targetId);
      if (archived) {
        setSuccessMessage(
          "El insumo tiene historial, por lo que se archivó en lugar de eliminarse."
        );
        getSupplies(projectId, suppliesMode);

        setTimeout(() => {
          const totalAfterArchive = supplies.length - 1;
          pagination.clampPageForTotal(totalAfterArchive);
        }, 200);
      } else {
        setErrorMessage(
          "No se pudo archivar el insumo. Intentá nuevamente."
        );
      }
    }
  };

  const handleEdit = (item: Supply) => {
    setItem(item);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (processing) return;
    if (!item || !projectId) return;

    const ok =
      suppliesMode === "pending"
        ? await completePendingSupply(projectId, item)
        : await updateSupply(projectId, item);

    if (ok) {
      setModalOpen(false);
      setItem(null);
      setSuccessMessage(
        suppliesMode === "pending"
          ? "Se completó el insumo pendiente con éxito!"
          : "Se editado el insumo con éxito!"
      );
      setErrorMessage("");
      getSupplies(projectId, suppliesMode);
    }
  };

  const handleExport = async () => {
    if (!projectId) return;

    try {
      const response = await apiClient.get<Blob>(
        `/supply_movements/database-export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(response);

      const link = document.createElement("a");
      link.href = url;
      link.download = `insumosbd_${projectId}_${new Date().toISOString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // error exporting products
    }
  };

  return (
    <div className="w-full mx-auto">
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar Insumos",
            icon: (
              <svg
                width="14"
                height="13"
                viewBox="0 0 14 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.66675 2.49984H3.00008C2.64646 2.49984 2.30732 2.64031 2.05727 2.89036C1.80722 3.14041 1.66675 3.47955 1.66675 3.83317V10.4998C1.66675 10.8535 1.80722 11.1926 2.05727 11.4426C2.30732 11.6927 2.64646 11.8332 3.00008 11.8332H9.66675C10.0204 11.8332 10.3595 11.6927 10.6096 11.4426C10.8596 11.1926 11.0001 10.8535 11.0001 10.4998V7.83317M8.33341 1.1665H12.3334M12.3334 1.1665V5.1665M12.3334 1.1665L5.66675 7.83317"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => handleExport(),
          },
        ]}
      />
      <div className="p-6 w-full mt-4 mx-auto bg-white rounded-lg shadow-md">
        {errorMessage && (
          <div
            id="alert-2"
            className="flex items-center p-4 mb-4 text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
            role="alert"
          >
            <svg
              className="shrink-0 w-4 h-4"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
            </svg>
            <span className="sr-only">Error</span>
            <div className="ms-3 text-sm font-medium">{errorMessage}</div>
            <button
              type="button"
              className="ms-auto -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-200 inline-flex items-center justify-center h-8 w-8"
              onClick={() => setErrorMessage("")}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>
        )}
        {successMessage && (
          <div
            className="flex items-center p-4 mb-4 text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400"
            role="alert"
          >
            <svg
              className="shrink-0 w-4 h-4"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
            </svg>
            <span className="sr-only">Success</span>
            <div className="ms-3 text-sm font-medium">{successMessage}</div>
            <button
              type="button"
              className="ms-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex items-center justify-center h-8 w-8"
              onClick={() => setSuccessMessage("")}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <h1 className="text-custom-text font-semibold text-xl leading-none">
            Lista de insumos del proyecto
          </h1>
          <Button
            variant="primary"
            size="sm"
            className="text-sm font-medium flex items-center gap-1"
            href="/admin/database/items"
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
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver
          </Button>
        </div>
        <div className="mt-4">
          <BaseModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setItem(null);
            }}
            title={
              suppliesMode === "pending"
                ? `Completar insumo pendiente ${item?.name || ""}`
                : `Edicion de insumo ${item?.name || ""}`
            }
            primaryButtonText={suppliesMode === "pending" ? "Completar" : "Guardar"}
            onPrimaryAction={handleSave}
            isSaving={processing}
          >
            {" "}
            {suppliesMode === "pending" && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Este insumo fue creado desde la app con información incompleta. Para que pueda
                usarse al publicar órdenes, completá los datos faltantes.
              </div>
            )}
            <div className="flex flex-col gap-1">
              <InputField
                label="Nombre del insumo"
                placeholder="Nombre del insumo"
                name="name"
                type="text"
                value={item?.name || ""}
                onChange={(e) => {
                  if (!item) return;
                  setItem({ ...item, name: e.target.value });
                }}
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <SupplyDropdown
                    label="Unidad"
                    searchPlaceholder="Buscar unidad..."
                    value={item?.unit_id && item.unit_id > 0 ? item.unit_id : null}
                    onSelect={(option) => {
                      if (!item) return;
                      setItem({ ...item, unit_id: Number(option.id) });
                    }}
                    options={units}
                  />
                </div>
                <div className="flex-2">
                  <InputField
                    label="Precio"
                    placeholder="Precio"
                    name="price"
                    type="text"
                    value={item?.price || ""}
                    onChange={(e) => {
                      if (!item) return;
                      const value = e.target.value.replace(/,/g, ".");
                      if (/^\d*\.?\d{0,3}$/.test(value)) {
                        setItem({ ...item, price: value });
                      }
                    }}
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 mt-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  checked={Boolean(item?.is_partial_price)}
                  onChange={(e) => {
                    if (!item) return;
                    setItem({ ...item, is_partial_price: e.target.checked });
                  }}
                />
                Precio parcial (tentativo)
              </label>
              <SupplyDropdown
                label="Rubro"
                searchPlaceholder="Buscar rubro..."
                value={item?.category_id && item.category_id > 0 ? item.category_id : null}
                onSelect={(option) => {
                  if (!item) return;
                  const category = Number(option.id);
                  const cat = categories.find((cat) => cat.id === category);

                  setItem({
                    ...item,
                    category_id: category,
                    type_id: cat?.type_id || 0,
                  });
                }}
                options={categories}
              />
              <InputField
                label=""
                name="type"
                type="text"
                value={
                  types.find((t) => t.id === Number(item?.type_id))?.name || ""
                }
                onChange={() => {}}
                disabled
                placeholder="Tipo / Clase"
              />
            </div>
          </BaseModal>
          <BaseModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setDeleteTarget(null);
            }}
            title="Eliminar insumo"
            message={
              deleteTarget && deleteTarget.count > 0
                ? `El insumo "${deleteTarget.name}" está en uso en ${deleteTarget.count} orden${deleteTarget.count > 1 ? "es" : ""} de trabajo activa${deleteTarget.count > 1 ? "s" : ""}. No se puede eliminar hasta quitar esos registros activos.`
                : `¿Está seguro que desea eliminar el insumo "${deleteTarget?.name}"? Si tiene movimientos o historial, se archivará en lugar de eliminarse para conservar los registros.`
            }
            primaryButtonText={deleteTarget && deleteTarget.count > 0 ? null : "Eliminar"}
            primaryButtonColor="bg-red-600 hover:bg-red-800 focus:ring-red-300"
            onPrimaryAction={confirmDelete}
          />
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={suppliesMode === "all" ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setSuppliesMode("all");
                pagination.resetPage();
              }}
            >
              Activos
            </Button>
            <Button
              variant={suppliesMode === "pending" ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setSuppliesMode("pending");
                pagination.resetPage();
              }}
            >
              Pendientes
            </Button>
          </div>

          <DataTable
            data={filteredSupplies}
            columns={columns}
            filters={columnsFilters}
            onFilterChange={handleFilterChange}
            enableFilters={true}
            onDelete={(item) => handleDelete(item)}
            onEdit={(item) => handleEdit(item)}
            message="No hay insumos cargados en el proyecto"
            pagination={pagination.buildPagination(filteredSupplies.length)}
          />
        </div>
      </div>
    </div>
  );
}
