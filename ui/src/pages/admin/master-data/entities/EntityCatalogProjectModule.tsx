import { useLayoutEffect, useRef } from "react";

import type { Project } from "../../../../hooks/useDatabase/projects/types";
import ProjectEditorReferenceBody from "../customers/CustomerEditor.project-drawer.reference";
import {
  filterGeneralEntityRows,
  rowMatchesTableView,
  tableScopeFilters,
  type GeneralEntityFilters,
  type GeneralEntityRow,
  type GeneralEntityTableView,
} from "./generalEntityRows";

type FilterMode = "search" | "all" | "value";
type FilterModes = Record<GeneralEntityTableView, FilterMode>;

type EntityCatalogProjectModuleProps = {
  rows: GeneralEntityRow[];
  filters: GeneralEntityFilters;
  filterModes: FilterModes;
  projectDetails: Record<number, Project>;
  loading: boolean;
  onCreate: (view: GeneralEntityTableView) => void;
  onEdit: (row: GeneralEntityRow) => void;
  onArchive: (row: GeneralEntityRow) => void;
  onOpenArchived: (view: GeneralEntityTableView) => void;
  onSaved?: () => Promise<void> | void;
};

function rowsForView(
  rows: GeneralEntityRow[],
  filters: GeneralEntityFilters,
  view: GeneralEntityTableView
) {
  const baseRows = rows.filter((row) => rowMatchesTableView(row, view));
  const scopedRows = filterGeneralEntityRows(baseRows, tableScopeFilters(filters, view));
  return scopedRows.filter((row) => rowMatchesTableView(row, view, filters));
}

function firstScopedId(
  rows: GeneralEntityRow[],
  filters: GeneralEntityFilters,
  view: GeneralEntityTableView
) {
  const scopedRows = rowsForView(rows, filters, view);
  return scopedRows.length === 1 ? scopedRows[0].sourceId : null;
}

export default function EntityCatalogProjectModule({
  rows,
  filters,
  onSaved,
}: EntityCatalogProjectModuleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const customerId = firstScopedId(rows, filters, "customer");
  const projectId = firstScopedId(rows, filters, "project");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const hideOperationalValueControls = () => {
      const valueControlSelectors = [
        'label[for="planned_cost"]',
        'label[for="admin_cost"]',
        'label[for^="investor_percentage_"]',
        'label[for^="admin_investor_percentage_"]',
        'label[for^="field_lease_"]',
        'label[for^="field_lease_percent_"]',
        'label[for^="field_lease_value_"]',
        'label[for^="field_investor_percentage_"]',
        'label[for^="lot_hectares_"]',
        'label[for^="lot_previous_crop_"]',
        'label[for^="lot_current_crop_"]',
        'label[for^="lot_season_"]',
        '[name^="lot_season_"]',
      ].join(",");

      root.querySelectorAll<HTMLElement>(valueControlSelectors).forEach((target) => {
        const directControl = target.closest<HTMLElement>("div");
        const control =
          target instanceof HTMLSelectElement ? directControl?.parentElement : directControl;
        if (control) {
          control.style.display = "none";
          control.setAttribute("aria-hidden", "true");
          control.setAttribute("data-operational-value", "hidden");
        }
      });

      const adminCostSection = root.querySelector<HTMLElement>(
        "section.grid > .drawer-section:nth-child(3)"
      );
      if (adminCostSection) {
        adminCostSection.style.display = "none";
        adminCostSection.setAttribute("aria-hidden", "true");
        adminCostSection.setAttribute("data-operational-value", "hidden");
      }
    };

    hideOperationalValueControls();

    const observer = new MutationObserver(hideOperationalValueControls);
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="entity-catalog-project-module mt-4"
      data-testid="entity-catalog-project-module"
    >
      <style>
        {`
          .entity-catalog-project-module [data-operational-value="hidden"] {
            display: none !important;
          }

          .entity-catalog-project-module .lg\\:grid-cols-\\[1fr_90px_auto\\] {
            grid-template-columns: 1fr auto !important;
          }

          .entity-catalog-project-module .lg\\:grid-cols-\\[1fr_180px_1\\.2fr\\] {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }

          .entity-catalog-project-module .lg\\:grid-cols-\\[1fr_90px_1fr_1fr_120px_auto\\] {
            grid-template-columns: minmax(0, 1fr) auto !important;
          }
        `}
      </style>
      <ProjectEditorReferenceBody
        embedded
        mode="project"
        customerId={customerId}
        initialProjectId={projectId}
        onClose={() => undefined}
        onSaved={onSaved}
      />
    </div>
  );
}
