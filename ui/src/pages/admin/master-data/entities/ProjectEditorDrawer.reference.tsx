/*
 * Frozen reference wrapper for the project editor drawer opened from
 * /admin/master-data/entities on 2026-05-29.
 *
 * This mirrors the DrawerShell + embedded CustomerEditor composition used by
 * GeneralEntities, but points at a frozen copy of CustomerEditor.
 */
import { DrawerShell } from "../../../../components/Drawer/DrawerShell";
import ProjectEditorReferenceBody from "../customers/CustomerEditor.project-drawer.reference";

type ProjectEditorDrawerReferenceProps = {
  open: boolean;
  title?: string;
  mode?: "customerOnly" | "project";
  customerId?: number | null;
  initialProjectId?: number | null;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
};

export default function ProjectEditorDrawerReference({
  open,
  title = "Editar Proyecto",
  mode = "project",
  customerId,
  initialProjectId,
  onClose,
  onSaved,
}: ProjectEditorDrawerReferenceProps) {
  return (
    <DrawerShell open={open} onClose={onClose} title={title}>
      {open ? (
        <ProjectEditorReferenceBody
          embedded
          mode={mode}
          customerId={customerId}
          initialProjectId={initialProjectId}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </DrawerShell>
  );
}
