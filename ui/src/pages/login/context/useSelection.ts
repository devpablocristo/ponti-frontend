import { useContext } from "react";
import { SelectionContext } from "./SelectionContext.shared";

export const useSelection = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx)
    throw new Error("useSelection debe usarse dentro de SelectionProvider");
  return ctx;
};
