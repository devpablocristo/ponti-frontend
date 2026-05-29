import { createContext } from "react";
import { Entity } from "../../../hooks/useDatabase/options/types";
import { Data } from "../../../hooks/useFields/types";

export type SelectionContextType = {
  customer: Entity | undefined;
  setCustomer: (c: Entity | undefined) => void;
  project: Entity | undefined;
  setProject: (p: Entity | undefined) => void;
  projectId: number | null | undefined;
  setProjectId: (p: number | undefined) => void;
  campaign: Entity | undefined;
  setCampaign: (c: Entity | undefined) => void;
  field: Data | undefined;
  setField: (f: Data | undefined) => void;
  seasons: { name: string; id: number }[];
};

export const SelectionContext = createContext<SelectionContextType | null>(null);
