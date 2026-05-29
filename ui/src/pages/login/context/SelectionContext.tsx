// contexts/SelectionContext.tsx
import { useState, useEffect } from "react";
import { createBrowserStorageNamespace } from "@devpablocristo/core-browser/storage";
import type { Entity } from "../../../hooks/useDatabase/options/types";
import type { Data } from "../../../hooks/useFields/types";
import { SelectionContext } from "./SelectionContext.shared";

const storage = createBrowserStorageNamespace({ namespace: "ponti" });

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const seasons = [
    { name: "Otoño", id: 1 },
    { name: "Invierno", id: 2 },
    { name: "Primavera", id: 3 },
    { name: "Verano", id: 4 },
  ];

  const [customer, setCustomer] = useState<Entity | undefined>(() => {
    return storage.getJSON<Entity>("customer") ?? undefined;
  });

  const [project, setProject] = useState<Entity | undefined>(() => {
    return storage.getJSON<Entity>("project") ?? undefined;
  });

  const [projectId, setProjectId] = useState<number | null | undefined>(() => {
    return storage.getJSON<number | null>("project_id") ?? undefined;
  });

  const [campaign, setCampaign] = useState<Entity | undefined>(() => {
    return storage.getJSON<Entity>("campaign") ?? undefined;
  });

  const [field, setField] = useState<Data | undefined>(() => {
    return storage.getJSON<Data>("field") ?? undefined;
  });

  useEffect(() => {
    storage.setJSON("customer", customer);
  }, [customer]);

  useEffect(() => {
    storage.setJSON("project", project);
  }, [project]);

  useEffect(() => {
    storage.setJSON("project_id", projectId);
  }, [projectId]);

  useEffect(() => {
    storage.setJSON("campaign", campaign);
    if (campaign && typeof project?.id === "number") {
      storage.setJSON("project_id", project.id);
    }
  }, [campaign, project]);

  useEffect(() => {
    storage.setJSON("field", field);
  }, [field]);

  return (
    <SelectionContext.Provider
      value={{
        customer,
        setCustomer,
        project,
        setProject,
        projectId,
        setProjectId,
        campaign,
        setCampaign,
        field,
        setField,
        seasons,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};
