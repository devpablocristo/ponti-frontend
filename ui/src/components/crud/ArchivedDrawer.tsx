import type { ReactNode } from "react";

import { DrawerShell } from "../Drawer/DrawerShell";
import { formatTitleCase } from "../../lib/properName";

type ArchivedDrawerProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export function ArchivedDrawer({
  open,
  title = "Archivados",
  onClose,
  children,
}: ArchivedDrawerProps) {
  return (
    <DrawerShell open={open} onClose={onClose} title={formatTitleCase(title)}>
      {children}
    </DrawerShell>
  );
}
