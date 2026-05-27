import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Archive, Download, Plus, Sprout, Upload } from "lucide-react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../../components/crud/ResponsiveTable";
import Button from "../../../../components/Button/Button";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { notify } from "@/lib/notify";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../../components/feedback/Skeleton";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useCrops, { type Crop, type CropPayloadInput } from "../../../../hooks/useCrops";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
import { formatProperName } from "../../../../lib/properName";
import { Column } from "../../types";
import { CROP_ENTITY as ENTITY } from "../../entities";
import { buildTimestampedFilename, CSV_ACCEPT, csvEscape, downloadBlob } from "../../fileTransfer";
import ArchivedCrops from "./ArchivedCrops";
import CropFormDrawer from "./CropFormDrawer";
import { normalizeCropImportName, parseCropImportCsv, readCropImportFile } from "./importUtils";
import type { ActorContextFilters } from "../actors/actorContextFilters";

const baseColumns: Column<Crop>[] = [
  { key: "name", header: "Nombre", render: (value) => formatProperName(value) },
];

type CropScope = {
  ids: Set<number>;
  names: Set<string>;
};

type CropsListProps = {
  embedded?: boolean;
  contextFilters?: ActorContextFilters;
  onAfterChange?: () => void | Promise<void>;
};

const hasPositiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const normalizeCropName = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function collectProjectCrops(project: Project, fieldId?: number): CropScope {
  const ids = new Set<number>();
  const names = new Set<string>();
  const fields = fieldId
    ? project.fields.filter((field) => field.id === fieldId)
    : project.fields;

  fields.forEach((field) => {
    field.lots.forEach((lot) => {
      if (lot.current_crop_id > 0) ids.add(lot.current_crop_id);
      if (lot.previous_crop_id > 0) ids.add(lot.previous_crop_id);
      const currentName = normalizeCropName(lot.current_crop_name);
      const previousName = normalizeCropName(lot.previous_crop_name);
      if (currentName) names.add(currentName);
      if (previousName) names.add(previousName);
    });
  });

  return { ids, names };
}

export default function CropsList({
  embedded = false,
  contextFilters,
  onAfterChange,
}: CropsListProps = {}) {
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [cropScope, setCropScope] = useState<CropScope | null>(null);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [contextMode, setContextMode] = useState<"current" | "all">(
    embedded && hasPositiveId(contextFilters?.projectId) ? "current" : "all",
  );
  const pagination = usePagination({ perPage: 25 });
  const { resetPage } = pagination;
  const {
    crops,
    processing,
    error,
    getCrops,
    createCrop,
    updateCrop,
    archiveCrop,
  } = useCrops();
  const {
    filters,
    selectedCustomer,
    selectedProject,
    selectedCampaignId,
    selectedField,
    campaigns,
    projectsDropdown,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);

  useEffect(() => {
    setContextMode(embedded && hasPositiveId(contextFilters?.projectId) ? "current" : "all");
  }, [contextFilters?.projectId, embedded]);

  const refresh = useCallback(() => getCrops("page=1&per_page=1000"), [getCrops]);
  const afterChange = useCallback(async () => {
    await refresh();
    await onAfterChange?.();
  }, [onAfterChange, refresh]);

  const scopedProjectIds = useMemo(() => {
    if (embedded) {
      return hasPositiveId(contextFilters?.projectId) ? [contextFilters.projectId] : [];
    }

    if (selectedProject?.id) return [selectedProject.id];
    if (selectedField?.project_id) return [selectedField.project_id];

    if (selectedCampaignId) {
      const projectId = campaigns.find((campaign) => campaign.id === selectedCampaignId)?.project_id;
      return projectId ? [projectId] : [];
    }

    if (selectedCustomer?.id) {
      return projectsDropdown.map((project) => project.id);
    }

    return [];
  }, [
    campaigns,
    contextFilters?.projectId,
    embedded,
    projectsDropdown,
    selectedCampaignId,
    selectedCustomer,
    selectedField,
    selectedProject,
  ]);

  const hasContextFilter = Boolean(
    embedded
      ? contextMode === "current" && hasPositiveId(contextFilters?.projectId)
      : selectedCustomer?.id ||
          selectedProject?.id ||
          selectedCampaignId ||
          selectedField?.id,
  );

  useEffect(() => {
    let cancelled = false;

    const loadScope = async () => {
      if (!hasContextFilter) {
        setCropScope(null);
        setScopeError(null);
        setScopeLoading(false);
        return;
      }

      if (scopedProjectIds.length === 0) {
        setCropScope({ ids: new Set(), names: new Set() });
        setScopeError(null);
        setScopeLoading(false);
        return;
      }

      setScopeLoading(true);
      setScopeError(null);

      try {
        const projects = await Promise.all(
          scopedProjectIds.map(async (projectId) => {
            const response = await apiClient.get<SuccessResponse<Project>>(`/projects/${projectId}`);
            return response.data;
          }),
        );
        if (cancelled) return;

        const nextScope: CropScope = { ids: new Set(), names: new Set() };
        projects.forEach((project) => {
          const projectScope = collectProjectCrops(
            project,
            embedded ? contextFilters?.fieldId ?? undefined : selectedField?.id,
          );
          projectScope.ids.forEach((id) => nextScope.ids.add(id));
          projectScope.names.forEach((name) => nextScope.names.add(name));
        });
        setCropScope(nextScope);
      } catch {
        if (!cancelled) {
          setCropScope({ ids: new Set(), names: new Set() });
          setScopeError("No se pudieron cargar los cultivos del contexto.");
        }
      } finally {
        if (!cancelled) setScopeLoading(false);
      }
    };

    void loadScope();

    return () => {
      cancelled = true;
    };
  }, [contextFilters?.fieldId, embedded, hasContextFilter, scopedProjectIds, selectedField]);

  const visibleCrops = useMemo(() => {
    if (!cropScope) return crops;
    return crops.filter(
      (crop) => cropScope.ids.has(crop.id) || cropScope.names.has(normalizeCropName(crop.name)),
    );
  }, [cropScope, crops]);

  const drawer = useEntityFormDrawer<Crop, CropPayloadInput>({
    buildSuccessLabel: (input) => `el cultivo "${formatProperName(input.name)}"`,
    create: createCrop,
    update: updateCrop,
    fallbackErrorMessage: "No se pudo guardar el cultivo",
    onAfter: afterChange,
  });

  const bulk = useBulkActions<Crop>({
    items: visibleCrops,
    entity: ENTITY,
    archive: archiveCrop,
    onEdit: drawer.openEdit,
    onAfter: refresh,
  });

  const handleExport = useCallback(() => {
    const csv = [
      "Nombre",
      ...visibleCrops.map((crop) => csvEscape(formatProperName(crop.name))),
    ].join("\n");
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      buildTimestampedFilename("cultivos", "csv"),
    );
  }, [visibleCrops]);

  const handleImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const rows = parseCropImportCsv(await readCropImportFile(file));
        if (rows.length === 0) {
          notify.error("El archivo no tiene cultivos válidos.");
          return;
        }

        const existingNames = new Set(crops.map((crop) => normalizeCropImportName(crop.name)));
        const rowsToCreate = rows.filter(
          (row) => !existingNames.has(normalizeCropImportName(row.name)),
        );
        const skippedCount = rows.length - rowsToCreate.length;

        if (rowsToCreate.length === 0) {
          notify.success("Todos los cultivos del archivo ya existen.");
          return;
        }

        const results = await Promise.allSettled(
          rowsToCreate.map((row) => createCrop({ name: row.name })),
        );
        const createdCount = results.filter((result) => result.status === "fulfilled").length;
        const failedCount = results.length - createdCount;

        await refresh();
        await onAfterChange?.();

        if (createdCount > 0 && failedCount === 0) {
          const importedLabel = createdCount === 1 ? "cultivo" : "cultivos";
          const skippedLabel = skippedCount === 1 ? "ya existía" : "ya existían";
          notify.success(
            `Se importaron ${createdCount} ${importedLabel}.${
              skippedCount > 0 ? ` ${skippedCount} ${skippedLabel}.` : ""
            }`,
          );
          return;
        }

        if (createdCount > 0) {
          notify.error(`Se importaron ${createdCount} cultivos y ${failedCount} fallaron.`);
          return;
        }

        notify.error("No se pudo importar cultivos.");
      } catch {
        notify.error("No se pudo importar cultivos. Usá CSV con una columna Nombre.");
      }
    },
    [createCrop, crops, onAfterChange, refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    resetPage();
  }, [cropScope, resetPage]);

  const selectColumn = useMemo<Column<Crop>>(
    () => makeSelectColumn<Crop>(bulk, (crop) => formatProperName(crop.name), ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<Crop>[]>(
    () => [selectColumn, ...baseColumns],
    [selectColumn],
  );

  return (
    <div>
      <AppFilterBar
        filters={embedded ? [] : filters}
        actions={[
          ...(embedded && hasPositiveId(contextFilters?.projectId)
            ? [
                {
                  label: "Proyecto Actual",
                  variant: contextMode === "current" ? ("light" as const) : ("primary" as const),
                  isPrimary: true,
                  onClick: () => setContextMode("current"),
                },
                {
                  label: "Todos",
                  variant: contextMode === "all" ? ("light" as const) : ("primary" as const),
                  isPrimary: true,
                  onClick: () => setContextMode("all"),
                },
              ]
            : []),
          ...(!embedded
            ? [
                {
                  label: "Importar",
                  icon: <Download className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  accept: CSV_ACCEPT,
                  onFileChange: handleImport,
                },
                {
                  label: "Exportar",
                  icon: <Upload className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  onClick: handleExport,
                },
              ]
            : []),
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => setArchivedDrawerOpen(true),
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: drawer.openCreate,
          },
        ]}
      />

      <div className="relative mt-4">
        <LoadingOverlay show={(processing || scopeLoading) && visibleCrops.length > 0} />
        {processing && crops.length === 0 ? (
          <TableSkeleton rows={10} columns={tableColumns.length} />
        ) : crops.length === 0 ? (
          <EmptyState
            icon={Sprout}
            title="Aún No Hay Cultivos"
            description="Creá el primero para usarlo en lotes y reportes."
            cta={
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={drawer.openCreate}
              >
                Nuevo Cultivo
              </Button>
            }
          />
        ) : visibleCrops.length === 0 ? (
          <EmptyState
            icon={Sprout}
            title="No Hay Cultivos Para Los Filtros"
            description={scopeError ?? "Probá con otro cliente, proyecto, campaña o campo."}
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={visibleCrops.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <ResponsiveTable<Crop>
              data={visibleCrops}
              columns={tableColumns}
              pagination={pagination.buildPagination(visibleCrops.length)}
              primaryKey="name"
              rowKey={(crop) => crop.id}
              emptyMessage="No hay cultivos para mostrar"
            />
          </>
        )}
      </div>

      <CropFormDrawer
        open={drawer.open}
        crop={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Cultivos archivados"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedCrops onAfterRestore={afterChange} />
      </ArchivedDrawer>
    </div>
  );
}
