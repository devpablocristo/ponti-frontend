import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import useSupplies from "../../../../hooks/useSupplies";
import { DataTable, usePagination } from "@/lib/dataDisplay";
import { Supply, SuppliesMode } from "../../../../hooks/useSupplies/types";
import Button from "../../../../components/Button/Button";
import { Column } from "../../types";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import InputField from "../../../../components/Input/InputField";
import SelectField from "../../../../components/Input/SelectField";
import { units } from "../../../../constants/units";
import useCategories from "../../../../hooks/useCategories";
import { apiClient } from "@/api/client";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../../components/feedback/SuccessBanner";
import { Checkbox } from "../../../../components/Input/Checkbox";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeActionsColumn } from "../../../../components/crud/makeActionsColumn";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityRowActions } from "../../../../hooks/useEntityRowActions";
import { SUPPLY_ENTITY as ENTITY } from "../../entities";

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
    archiveSupply,
    hardDeleteSupply,
    result,
    processing,
    errorUpdate,
    resultUpdate,
  } = useSupplies();
  const { categories, types, getCategories, getTypes } = useCategories();

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [item, setItem] = useState<Supply | null>(null);
  const pagination = usePagination({ perPage: 10 });
  const [suppliesMode, setSuppliesMode] = useState<SuppliesMode>("all");
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const lastHandledResultRef = useRef<string>("");
  const lastHandledResultUpdateRef = useRef<string>("");
  const closeModalOnNextUpdateRef = useRef(false);

  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
  ]);

  const refresh = useCallback(() => {
    if (projectId) getSupplies(projectId, suppliesMode);
  }, [projectId, suppliesMode, getSupplies]);

  const safeSupplies = useMemo(
    () => (Array.isArray(supplies) ? supplies : []),
    [supplies],
  );

  const bulk = useBulkActions<Supply>({
    items: safeSupplies,
    entity: ENTITY,
    archive: archiveSupply,
    hardDelete: hardDeleteSupply,
    onAfter: refresh,
  });

  const handleEdit = useCallback((supplyItem: Supply) => {
    setItem(supplyItem);
    setModalOpen(true);
  }, []);

  const { handleArchive, handleHardDelete } = useEntityRowActions<Supply>({
    entity: ENTITY,
    getLabel: (s) => s.name,
    archive: archiveSupply,
    hardDelete: hardDeleteSupply,
    onAfter: refresh,
  });

  useEffect(() => {
    if (projectId) {
      getSupplies(projectId, suppliesMode);
      getCategories("");
      getTypes();
    }
  }, [projectId, suppliesMode, getSupplies, getCategories, getTypes]);

  useEffect(() => {
    if (!result || !projectId) return;
    if (lastHandledResultRef.current === result) return;

    lastHandledResultRef.current = result;
    setSuccessMessage(result);
    setErrorMessage("");
    getSupplies(projectId, suppliesMode);
  }, [result, projectId, suppliesMode, getSupplies]);

  useEffect(() => {
    if (!resultUpdate || !projectId) return;
    if (lastHandledResultUpdateRef.current === resultUpdate) return;

    lastHandledResultUpdateRef.current = resultUpdate;
    if (closeModalOnNextUpdateRef.current) {
      setModalOpen(false);
      setItem(null);
      closeModalOnNextUpdateRef.current = false;
    }
    setSuccessMessage(resultUpdate);
    setErrorMessage("");
    getSupplies(projectId, suppliesMode);
  }, [resultUpdate, projectId, suppliesMode, getSupplies]);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setSuccessMessage(null);
    }
  }, [error]);

  useEffect(() => {
    if (errorUpdate) {
      closeModalOnNextUpdateRef.current = false;
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
            return value.includes(status);
          }
          return status.toLowerCase().includes(String(value).toLowerCase());
        }

        const currentValue = String(supply[key as keyof Supply] ?? "");
        if (Array.isArray(value)) {
          if (value.length === 0) return true;
          return value.includes(currentValue);
        }
        return currentValue.toLowerCase().includes(String(value).toLowerCase());
      })
    );
  };

  const filteredSupplies = useMemo(() => {
    return applyColumnFilters(supplies || [], columnsFilters);
  }, [supplies, columnsFilters]);

  const selectColumn = useMemo<Column<Supply>>(
    () => makeSelectColumn<Supply>(bulk, (s) => s.name, ENTITY),
    [bulk],
  );

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
      selectColumn,
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
      makeActionsColumn<Supply>({
        onEdit: handleEdit,
        onArchive: handleArchive,
        onHardDelete: handleHardDelete,
      }),
    ];
  }, [supplies, columnsFilters, selectColumn, handleEdit, handleArchive, handleHardDelete]);

  const handleFilterChange = (filters: Record<string, unknown>) => {
    const nextFilters = { ...filters };
    if (Array.isArray(nextFilters.price) && nextFilters.price.length > 1) {
      nextFilters.price = [nextFilters.price[nextFilters.price.length - 1]];
    }

    setColumnsFilters(nextFilters);
    pagination.resetPage();
  };

  const handleSave = () => {
    if (processing) return;
    if (!item || !projectId) return;

    closeModalOnNextUpdateRef.current = true;

    if (suppliesMode === "pending") {
      completePendingSupply(projectId, item);
    } else {
      updateSupply(projectId, item);
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
      <FilterBar filters={filters} actions={[
        {
          label: "Exportar Insumos",
          icon: <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.66675 2.49984H3.00008C2.64646 2.49984 2.30732 2.64031 2.05727 2.89036C1.80722 3.14041 1.66675 3.47955 1.66675 3.83317V10.4998C1.66675 10.8535 1.80722 11.1926 2.05727 11.4426C2.30732 11.6927 2.64646 11.8332 3.00008 11.8332H9.66675C10.0204 11.8332 10.3595 11.6927 10.6096 11.4426C10.8596 11.1926 11.0001 10.8535 11.0001 10.4998V7.83317M8.33341 1.1665H12.3334M12.3334 1.1665V5.1665M12.3334 1.1665L5.66675 7.83317" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          ,
          variant: "primary",
          isPrimary: true,
          disabled: !projectId,
          onClick: () => handleExport(),
        }
      ]} />
      <div className="p-6 w-full mt-4 mx-auto bg-white rounded-lg shadow-md">
        <ErrorBanner
          message={errorMessage || null}
          variant="alert"
          onDismiss={() => setErrorMessage("")}
        />
        <SuccessBanner
          message={successMessage || null}
          variant="alert"
          onDismiss={() => setSuccessMessage("")}
        />
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
            primaryButtonText={
              suppliesMode === "pending" ? "Completar" : "Guardar"
            }
            onPrimaryAction={handleSave}
          >              {suppliesMode === "pending" && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Este insumo fue creado desde la app con información incompleta.
              Para que pueda usarse al publicar órdenes, completá los datos faltantes.
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
                  <SelectField
                    label="Unidad"
                    name={`unit-${item?.name || ""}`}
                    value={item?.unit_id && item.unit_id > 0 ? item.unit_id.toString() : ""}
                    onChange={(e) => {
                      if (!item) return;
                      setItem({ ...item, unit_id: parseInt(e.target.value) });
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
                <Checkbox
                  tone="warning"
                  checked={Boolean(item?.is_partial_price)}
                  onChange={(e) => {
                    if (!item) return;
                    setItem({ ...item, is_partial_price: e.target.checked });
                  }}
                />
                Precio parcial (tentativo)
              </label>
              <SelectField
                label="Rubro"
                name={`category-${item?.name || ""}`}
                value={
                  item?.category_id && item.category_id > 0
                    ? item.category_id.toString()
                    : ""
                }
                onChange={(e) => {
                  if (!item) return;
                  const category = parseInt(e.target.value);
                  const cat = categories.find((cat) => cat.id === category);

                  setItem({
                    ...item,
                    category_id: category,
                    type_id: cat?.type_id || 0,
                  });
                }}
                options={categories}
              />
              <SelectField
                label=""
                name={`type`}
                value={item?.type_id && item.type_id > 0 ? item.type_id.toString() : ""}
                disabled
                onChange={(e) => {
                  if (!item) return;
                  setItem({ ...item, type_id: parseInt(e.target.value) });
                }}
                options={types}
              />

            </div>
          </BaseModal>
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

          <BulkSelectionPanel
            selectedCount={bulk.selectedCount}
            totalCount={filteredSupplies.length}
            allSelected={bulk.allSelected}
            onToggleAll={bulk.toggleAll}
            onClear={bulk.clear}
            actions={bulk.actions}
            entity={ENTITY}
          />
          <DataTable
            data={filteredSupplies}
            columns={columns}
            filters={columnsFilters}
            onFilterChange={handleFilterChange}
            enableFilters={true}
            message="No hay insumos cargados en el proyecto"
            pagination={pagination.buildPagination(filteredSupplies.length)}
          />
        </div>
      </div>
    </div>
  );
}
