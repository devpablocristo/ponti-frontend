// contexts/SelectionContext.tsx
import { useState, useEffect } from "react";
import { createBrowserStorageNamespace } from "@devpablocristo/core-browser/storage";
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

  const [customer, setCustomer] = useState(() => {
    return storage.getJSON("customer");
  });

  const [project, setProject] = useState(() => {
    return storage.getJSON("project");
  });

  const [projectId, setProjectId] = useState(() => {
    return storage.getJSON("project_id");
  });

  const [campaign, setCampaign] = useState(() => {
    return storage.getJSON("campaign");
  });

  const [field, setField] = useState(() => {
    return storage.getJSON("field");
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
    if (campaign && project?.id) {
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
