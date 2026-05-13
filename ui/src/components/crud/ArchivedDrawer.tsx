import type { ReactNode } from "react";

import Drawer from "../Drawer/Drawer";

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
    <Drawer open={open} onClose={onClose} maxWidth="max-w-6xl">
      <div className="flex h-full flex-col gap-4">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </Drawer>
  );
}
