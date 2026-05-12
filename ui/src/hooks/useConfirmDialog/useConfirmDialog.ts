import { useContext } from "react";

import { ConfirmDialogContext, type ConfirmFn } from "./context";

export function useConfirmDialog(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error(
      "useConfirmDialog: <ConfirmDialogProvider> no está montado en el árbol.",
    );
  }
  return ctx;
}
