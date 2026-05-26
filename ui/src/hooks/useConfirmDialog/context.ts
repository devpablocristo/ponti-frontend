import { createContext, type ReactNode } from "react";

import type { ConfirmSeverity } from "../../components/crud/ConfirmModal";

export type ConfirmOptions = {
  title: string;
  message?: string;
  severity?: ConfirmSeverity;
  primaryLabel?: string;
  secondaryLabel?: string;
  requireTypeToConfirm?: string;
  extraContent?: ReactNode;
};

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

export const ConfirmDialogContext = createContext<ConfirmFn | null>(null);
