import { ColumnConfigHeader } from "../../../../components/crud/ColumnConfigHeader";
import { LaborGroupData } from "../../../../hooks/useLabors/types";
import { Column } from "../../types";

type LaborsHeaderProps = {
  selectedColumns: Array<keyof LaborGroupData>;
  setSelectedColumns: (columns: Array<keyof LaborGroupData>) => void;
  setVisibleColumns: (columns: Array<keyof LaborGroupData>) => void;
  allColumns: Column<LaborGroupData>[];
};

/**
 * Header del DataTable de Labors. Thin wrapper sobre `ColumnConfigHeader`
 * que mantiene el typing específico de `LaborGroupData`. La UI vive en
 * el componente compartido.
 */
export function LaborsHeader(props: LaborsHeaderProps) {
  return <ColumnConfigHeader<LaborGroupData> {...props} />;
}
