import { createContext } from "react";
import { Entity } from "../../../hooks/useDatabase/options/types";
import { ProjectData } from "../../../hooks/useDatabase/projects/types";
import { Data } from "../../../hooks/useFields/types";

export type SelectionContextType = {
  customer: Entity;
  setCustomer: (c: Entity | undefined) => void;
  project: ProjectData;
  setProject: (p: Entity | undefined) => void;
  projectId: number | null;
  setProjectId: (p: number | undefined) => void;
  campaign: Entity;
  setCampaign: (c: Entity | undefined) => void;
  field: Data;
  setField: (f: Data | undefined) => void;
  seasons: { name: string; id: number }[];
};

export const SelectionContext = createContext<SelectionContextType | null>(null);
