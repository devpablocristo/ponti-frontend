// contexts/SelectionContext.tsx
import { useState } from "react";
import type { Entity } from "../../../hooks/useDatabase/options/types";
import type { Data } from "../../../hooks/useFields/types";
import { SelectionContext } from "./SelectionContext.shared";

const storageKey = (key: string) => `ponti:${key}`;

function readStoredJson<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;

  const raw =
    window.localStorage.getItem(storageKey(key)) ??
    window.localStorage.getItem(key);
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function readStoredNumber(key: string): number | undefined {
  if (typeof window === "undefined") return undefined;

  const raw =
    window.localStorage.getItem(storageKey(key)) ??
    window.localStorage.getItem(key);
  if (!raw) return undefined;

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function writeStoredJson<T>(key: string, value: T | undefined) {
  if (typeof window === "undefined") return;

  if (value === undefined) {
    window.localStorage.removeItem(storageKey(key));
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(storageKey(key), JSON.stringify(value));
}

function writeStoredNumber(key: string, value: number | null | undefined) {
  if (typeof window === "undefined") return;

  if (!value || value <= 0) {
    window.localStorage.removeItem(storageKey(key));
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(storageKey(key), String(value));
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

  const [customer, setCustomerState] = useState<Entity | undefined>(() =>
    readStoredJson<Entity>("customer"),
  );
  const [project, setProjectState] = useState<Entity | undefined>(() =>
    readStoredJson<Entity>("project"),
  );
  const [projectId, setProjectIdState] = useState<number | null | undefined>(() =>
    readStoredNumber("project_id"),
  );
  const [campaign, setCampaignState] = useState<Entity | undefined>(() =>
    readStoredJson<Entity>("campaign"),
  );
  const [field, setFieldState] = useState<Data | undefined>(() =>
    readStoredJson<Data>("field"),
  );

  const setCustomer = (value: Entity | undefined) => {
    setCustomerState(value);
    writeStoredJson("customer", value);
  };

  const setProject = (value: Entity | undefined) => {
    setProjectState(value);
    writeStoredJson("project", value);
  };

  const setProjectId = (value: number | null | undefined) => {
    setProjectIdState(value);
    writeStoredNumber("project_id", value);
  };

  const setCampaign = (value: Entity | undefined) => {
    setCampaignState(value);
    writeStoredJson("campaign", value);
  };

  const setField = (value: Data | undefined) => {
    setFieldState(value);
    writeStoredJson("field", value);
  };

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
