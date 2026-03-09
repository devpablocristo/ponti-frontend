// contexts/SelectionContext.tsx
import { useState, useEffect } from "react";
import { SelectionContext } from "./SelectionContext.shared";

function prefix() {
  return `ponti:${window.location.host}:`;
}

function key(name: string) {
  return `${prefix()}${name}`;
}

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
    const stored = localStorage.getItem(key("customer"));
    return stored ? JSON.parse(stored) : null;
  });

  const [project, setProject] = useState(() => {
    const stored = localStorage.getItem(key("project"));
    return stored ? JSON.parse(stored) : null;
  });

  const [projectId, setProjectId] = useState(() => {
    const stored = localStorage.getItem(key("project_id"));
    return stored ? JSON.parse(stored) : null;
  });

  const [campaign, setCampaign] = useState(() => {
    const stored = localStorage.getItem(key("campaign"));
    return stored ? JSON.parse(stored) : null;
  });

  const [field, setField] = useState(() => {
    const stored = localStorage.getItem(key("field"));
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (customer === undefined || customer === null) {
      localStorage.removeItem(key("customer"));
    } else {
      localStorage.setItem(key("customer"), JSON.stringify(customer));
    }
  }, [customer]);

  useEffect(() => {
    if (project === undefined || project === null) {
      localStorage.removeItem(key("project"));
    } else {
      localStorage.setItem(key("project"), JSON.stringify(project));
    }
  }, [project]);

  useEffect(() => {
    if (projectId === undefined || projectId === null) {
      localStorage.removeItem(key("project_id"));
    } else {
      localStorage.setItem(key("project_id"), JSON.stringify(projectId));
    }
  }, [projectId]);

  useEffect(() => {
    if (campaign === undefined || campaign === null) {
      localStorage.removeItem(key("campaign"));
    } else {
      localStorage.setItem(key("campaign"), JSON.stringify(campaign));
      // Guardar el project_id del proyecto seleccionado
      if (project?.id) {
        localStorage.setItem(key("project_id"), JSON.stringify(project.id));
      }
    }
  }, [campaign, project]);

  useEffect(() => {
    if (field === undefined || field === null) {
      localStorage.removeItem(key("field"));
    } else {
      localStorage.setItem(key("field"), JSON.stringify(field));
    }
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
